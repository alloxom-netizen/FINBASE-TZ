import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getClaudeClient } from "@/lib/claude/client";
import { buildDraftPrompt } from "@/lib/claude/prompts/drafts";
import { Locale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { documentId, context, language } = await req.json();

    if (!documentId || !context) {
      return NextResponse.json(
        { error: "documentId and context are required" },
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
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildDraftPrompt(
            docSnap.data()!.extractedData,
            context,
            (language as Locale) ?? "en"
          ),
        },
      ],
    });

    const draft =
      message.content[0].type === "text" ? message.content[0].text : "";
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("Drafts error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
