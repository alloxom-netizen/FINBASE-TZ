import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getGroqClient, GROQ_TEXT_MODEL } from "@/lib/groq/client";
import { buildSummaryPrompt } from "@/lib/claude/prompts/summary";
import { Locale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { documentId, language } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const docSnap = await adminDb.collection("documents").doc(documentId).get();
    if (!docSnap.exists || !docSnap.data()?.extractedData) {
      return NextResponse.json({ error: "Document not found or not yet processed" }, { status: 404 });
    }

    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildSummaryPrompt(docSnap.data()!.extractedData, (language as Locale) ?? "en"),
        },
      ],
    });

    const summary = completion.choices[0].message.content ?? "";
    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Summary error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
