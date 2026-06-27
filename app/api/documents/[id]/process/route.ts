import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminBucket } from "@/lib/firebase/admin";
import { getGroqClient, GROQ_TEXT_MODEL, GROQ_VISION_MODEL } from "@/lib/groq/client";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
} from "@/lib/claude/prompts/extract";
import { Locale } from "@/types";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: documentId } = await params;

  try {
    const docRef = adminDb.collection("documents").doc(documentId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const docData = docSnap.data()!;
    const language = (docData.language as Locale) ?? "en";
    const isImage = docData.fileType !== "pdf";

    const bucket = getAdminBucket();
    const fileRef = bucket.file(docData.storagePath);
    const [fileBuffer] = await fileRef.download();

    const client = getGroqClient();
    const extractionPrompt = buildExtractionPrompt(language);
    const systemContent = `${EXTRACTION_SYSTEM_PROMPT}\n\n${extractionPrompt}`;

    let rawText = "";

    if (isImage) {
      // Use vision model for images
      const mediaTypeMap: Record<string, string> = {
        jpg: "image/jpeg",
        png: "image/png",
        webp: "image/webp",
      };
      const mimeType = mediaTypeMap[docData.fileType] ?? "image/jpeg";
      const base64Data = fileBuffer.toString("base64");

      const completion = await client.chat.completions.create({
        model: GROQ_VISION_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: `data:${mimeType};base64,${base64Data}` },
              },
              { type: "text", text: systemContent },
            ],
          },
        ],
      });
      rawText = completion.choices[0].message.content ?? "";
    } else {
      // Extract text from PDF using pdf-parse, then analyse with text model
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }).default ?? pdfParseModule;
      const pdfData = await pdfParse(fileBuffer);
      const pdfText = pdfData.text.slice(0, 12000); // cap tokens

      const completion = await client.chat.completions.create({
        model: GROQ_TEXT_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemContent },
          {
            role: "user",
            content: `Here is the extracted text from the PDF document:\n\n${pdfText}`,
          },
        ],
      });
      rawText = completion.choices[0].message.content ?? "";
    }

    let extractedData;
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
      extractedData = JSON.parse(cleaned);
    } catch {
      await docRef.update({ status: "failed" });
      return NextResponse.json(
        { error: "Failed to parse extraction response" },
        { status: 500 }
      );
    }

    await docRef.update({
      status: extractedData.discrepancies?.length > 0 ? "needs_review" : "processed",
      processedAt: new Date(),
      extractedData,
    });

    return NextResponse.json({ success: true, extractedData });
  } catch (err) {
    console.error("Processing error:", err);
    await adminDb
      .collection("documents")
      .doc(documentId)
      .update({ status: "failed" })
      .catch(() => {});
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
