import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminBucket } from "@/lib/firebase/admin";
import { getClaudeClient } from "@/lib/claude/client";
import {
  EXTRACTION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  EXTRACTION_SCHEMA,
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

    // Download file from Storage
    const bucket = getAdminBucket();
    const fileRef = bucket.file(docData.storagePath);
    const [fileBuffer] = await fileRef.download();
    const base64Data = fileBuffer.toString("base64");

    const mediaTypeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const mediaType = mediaTypeMap[docData.fileType] ?? "application/pdf";

    const client = getClaudeClient();

    const isImage = docData.fileType !== "pdf";

    const contentBlock = isImage
      ? {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
            data: base64Data,
          },
        }
      : {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: base64Data,
          },
        };

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            contentBlock,
            { type: "text", text: buildExtractionPrompt(language) },
          ],
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let extractedData;
    try {
      // Strip any markdown code fences if present
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
