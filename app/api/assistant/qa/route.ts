import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getClaudeClient } from "@/lib/claude/client";
import { buildQAPrompt } from "@/lib/claude/prompts/qa";
import { Locale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { documentId, question, language } = await req.json();

    if (!documentId || !question) {
      return NextResponse.json(
        { error: "documentId and question are required" },
        { status: 400 }
      );
    }

    const docSnap = await adminDb.collection("documents").doc(documentId).get();
    if (!docSnap.exists || !docSnap.data()?.extractedData) {
      return NextResponse.json(
        { error: "Document not found or not yet processed" },
        { status: 404 }
      );
    }

    const client = getClaudeClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: buildQAPrompt(
            docSnap.data()!.extractedData,
            question,
            (language as Locale) ?? "en"
          ),
        },
      ],
    });

    const answer =
      message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("QA error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
