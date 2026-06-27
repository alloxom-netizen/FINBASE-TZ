import { NextRequest, NextResponse } from "next/server";
import { getGroqClient, GROQ_TEXT_MODEL, GROQ_VISION_MODEL } from "@/lib/groq/client";
import { EXTRACTION_SYSTEM_PROMPT, buildExtractionPrompt, EXTRACTION_SCHEMA } from "@/lib/claude/prompts/extract";
import { Locale } from "@/types";

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MIME_MAP: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = ((formData.get("language") as string) || "en") as Locale;

    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const fileType = ALLOWED_TYPES[file.type];
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum 10 MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const client = getGroqClient();
    const systemContent = `${EXTRACTION_SYSTEM_PROMPT}\n\nJSON SCHEMA (you MUST follow this exactly):\n${JSON.stringify(EXTRACTION_SCHEMA, null, 2)}\n\n${buildExtractionPrompt(language)}`;

    let rawText = "";

    if (fileType !== "pdf") {
      const completion = await client.chat.completions.create({
        model: GROQ_VISION_MODEL,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${MIME_MAP[fileType]};base64,${buffer.toString("base64")}`,
                },
              },
              { type: "text", text: systemContent },
            ],
          },
        ],
      });
      rawText = completion.choices[0].message.content ?? "";
    } else {
      const pdfParseModule = await import("pdf-parse");
      const pdfParse = (
        pdfParseModule as unknown as { default: (buf: Buffer) => Promise<{ text: string }> }
      ).default ?? pdfParseModule;
      const { text } = await pdfParse(buffer);

      const completion = await client.chat.completions.create({
        model: GROQ_TEXT_MODEL,
        max_tokens: 4096,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: `PDF text:\n\n${text.slice(0, 12000)}` },
        ],
      });
      rawText = completion.choices[0].message.content ?? "";
    }

    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const extractedData = JSON.parse(cleaned);
    return NextResponse.json({ extractedData });
  } catch (err) {
    console.error("Preview error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
