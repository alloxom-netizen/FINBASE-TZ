import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getGroqClient, GROQ_REASONING_MODEL } from "@/lib/groq/client";
import { Locale } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

type Mode = "chat" | "summary" | "qa" | "drafts" | "negotiation";

const BASE = `You are FinBase AI, a financial assistant specializing in East African — particularly Tanzanian — business finance. You know: Tanzanian tax regulations (VAT, income tax, TRA), common financial documents, TZS currency, accounting principles, SME finance, and business correspondence. Respond in the same language the user writes in (English or Swahili).`;

const MODE_PROMPTS: Record<Mode, string> = {
  chat: `${BASE}\n\nAnswer any finance question clearly and practically. If a document is attached, use it as context.`,
  summary: `${BASE}\n\nYour task: produce a concise, well-structured summary of the attached financial document. Include: document type, key figures, date/period, parties involved, notable findings or discrepancies. Use bullet points for clarity. Do not invent data not present in the document.`,
  qa: `${BASE}\n\nYour task: answer the user's questions using ONLY information from the attached document. Quote specific figures and fields when relevant. If the answer is not in the document, say so clearly.`,
  drafts: `${BASE}\n\nYour task: generate professional business and financial correspondence — letters, notices, payment requests, dispute letters, proposals. If a document is attached, base the letter on its data. Output clean, formal text ready to send.`,
  negotiation: `${BASE}\n\nYour task: help the user prepare for a financial negotiation. Identify leverage points, risks, and counter-proposal positions. Provide structured talking points, suggested terms, and things to watch out for.`,
};

export async function POST(req: NextRequest) {
  try {
    const { messages, documentId, language, mode = "chat" } = await req.json() as {
      messages: ChatMessage[];
      documentId?: string;
      language: Locale;
      mode?: Mode;
    };

    if (!messages?.length) {
      return NextResponse.json({ error: "Messages are required" }, { status: 400 });
    }

    let systemPrompt = MODE_PROMPTS[mode] ?? MODE_PROMPTS.chat;

    if (documentId?.trim()) {
      const docSnap = await adminDb.collection("documents").doc(documentId.trim()).get();

      if (!docSnap.exists) {
        return NextResponse.json(
          { error: `Document "${documentId.trim()}" not found. Check the ID and try again.` },
          { status: 404 }
        );
      }

      const docData = docSnap.data()!;

      if (!docData.extractedData) {
        const msg =
          docData.status === "processing"
            ? `Document "${documentId.trim()}" is still being processed. Wait a moment then try again.`
            : `Document "${documentId.trim()}" could not be processed. Try re-uploading the file.`;
        return NextResponse.json({ error: msg }, { status: 422 });
      }

      const fields = (docData.extractedData.fields ?? [])
        .map((f: { label: string; value: unknown; confidence: string }) =>
          `  - ${f.label}: ${f.value ?? "N/A"} (${f.confidence} confidence)`
        )
        .join("\n");
      systemPrompt += `\n\n=== LOADED DOCUMENT ===\nFile: ${docData.fileName}\nType: ${docData.extractedData.documentType}\nSummary: ${docData.extractedData.summary}\n\nExtracted Fields:\n${fields}\n\nDiscrepancies: ${(docData.extractedData.discrepancies ?? []).join("; ") || "None found"}\n=== END DOCUMENT ===`;
    }

    const client = getGroqClient();
    const stream = await client.chat.completions.create({
      model: GROQ_REASONING_MODEL,
      max_tokens: 4096,
      stream: true,
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ],
    });

    const encoder = new TextEncoder();
    let inThink = false;
    let buf = "";

    const readable = new ReadableStream({
      async start(controller) {
        const emit = (obj: object) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content ?? "";
            if (!delta) continue;
            buf += delta;

            // Parse <think>…</think> out of the stream incrementally
            let progress = true;
            while (progress && buf) {
              progress = false;

              if (inThink) {
                const end = buf.indexOf("</think>");
                if (end !== -1) {
                  if (end > 0) emit({ thinking: buf.slice(0, end) });
                  inThink = false;
                  buf = buf.slice(end + 8);
                  progress = true;
                } else {
                  // Safe to emit everything except the last 7 chars (partial </think>)
                  const safe = buf.length > 7 ? buf.length - 7 : 0;
                  if (safe > 0) {
                    emit({ thinking: buf.slice(0, safe) });
                    buf = buf.slice(safe);
                  }
                }
              } else {
                const start = buf.indexOf("<think>");
                if (start !== -1) {
                  if (start > 0) emit({ content: buf.slice(0, start) });
                  inThink = true;
                  buf = buf.slice(start + 7);
                  progress = true;
                } else {
                  // Hold back up to 6 chars in case they're a partial <think>
                  const safe = buf.length > 6 ? buf.length - 6 : 0;
                  if (safe > 0) {
                    emit({ content: buf.slice(0, safe) });
                    buf = buf.slice(safe);
                  }
                }
              }
            }
          }

          // Flush remainder
          if (buf) emit(inThink ? { thinking: buf } : { content: buf });
          emit({ done: true });
        } catch (err) {
          emit({ error: err instanceof Error ? err.message : "Stream error" });
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err) {
    console.error("Chat error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
