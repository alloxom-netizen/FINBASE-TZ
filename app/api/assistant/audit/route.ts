import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getClaudeClient } from "@/lib/claude/client";
import { buildAuditPrompt } from "@/lib/claude/prompts/audit";
import { Locale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { documentId, language } = await req.json();

    if (!documentId) {
      return NextResponse.json({ error: "documentId is required" }, { status: 400 });
    }

    const docSnap = await adminDb.collection("documents").doc(documentId).get();
    if (!docSnap.exists || !docSnap.data()?.extractedData) {
      return NextResponse.json(
        { error: "Document not found or not yet processed" },
        { status: 404 }
      );
    }

    const locale = (language as Locale) ?? "en";
    const client = getClaudeClient();
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildAuditPrompt(docSnap.data()!.extractedData, locale),
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const auditResult = JSON.parse(cleaned);

    return NextResponse.json({ auditResult });
  } catch (err) {
    console.error("Audit error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
