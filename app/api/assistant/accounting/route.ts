import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getClaudeClient } from "@/lib/claude/client";
import { buildAccountingPrompt } from "@/lib/claude/prompts/accounting";
import { generateAccountingExcel } from "@/lib/excel/generate";
import { Locale } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const { documentId, language, format } = await req.json();

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
          content: buildAccountingPrompt(docSnap.data()!.extractedData, locale),
        },
      ],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "{}";
    const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
    const accountingData = JSON.parse(cleaned);

    if (format === "excel") {
      const buffer = generateAccountingExcel(
        accountingData,
        docSnap.data()!.fileName,
        locale
      );
      return new NextResponse(buffer as unknown as BodyInit, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="accounting-${documentId}.xlsx"`,
        },
      });
    }

    return NextResponse.json({ accountingData });
  } catch (err) {
    console.error("Accounting error:", err);
    return NextResponse.json({ error: "Request failed" }, { status: 500 });
  }
}
