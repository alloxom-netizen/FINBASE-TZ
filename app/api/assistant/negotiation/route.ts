import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getGroqClient, GROQ_TEXT_MODEL } from "@/lib/groq/client";
import { buildNegotiationPrompt } from "@/lib/claude/prompts/negotiation";
import { Locale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { documentId, context, language } = await req.json();

    if (!documentId || !context) {
      return NextResponse.json({ error: "documentId and context are required" }, { status: 400 });
    }

    const docSnap = await adminDb.collection("documents").doc(documentId).get();
    if (!docSnap.exists || !docSnap.data()?.extractedData) {
      return NextResponse.json({ error: "Document not found or not yet processed" }, { status: 404 });
    }

    const client = getGroqClient();

    const completion = await client.chat.completions.create({
      model: GROQ_TEXT_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: buildNegotiationPrompt(docSnap.data()!.extractedData, context, (language as Locale) ?? "en"),
        },
      ],
    });

    const guidance = completion.choices[0].message.content ?? "";
    return NextResponse.json({ guidance });
  } catch (err) {
    console.error("Negotiation error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
