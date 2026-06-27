import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getGroqClient, GROQ_TEXT_MODEL } from "@/lib/groq/client";
import { buildQAPrompt } from "@/lib/claude/prompts/qa";
import { Locale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { documentId, question, language } = await req.json();

    if (!documentId || !question) {
      return NextResponse.json({ error: "documentId and question are required" }, { status: 400 });
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
          content: buildQAPrompt(docSnap.data()!.extractedData, question, (language as Locale) ?? "en"),
        },
      ],
    });

    const answer = completion.choices[0].message.content ?? "";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("QA error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
