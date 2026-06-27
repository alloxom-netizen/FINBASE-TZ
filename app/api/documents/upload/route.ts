import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminBucket } from "@/lib/firebase/admin";

// Short human-readable ID — avoids ambiguous chars (0/O, 1/I)
function generateDocId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    if (i === 4) id += "-";
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id; // e.g. "AB3K-P9MN"
}

const ALLOWED_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const userId = formData.get("userId") as string | null;
    const sessionId = formData.get("sessionId") as string | null;
    const language = (formData.get("language") as string) || "en";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileType = ALLOWED_TYPES[file.type];
    if (!fileType) {
      return NextResponse.json(
        { error: "Unsupported file type. Use PDF, JPG, PNG, or WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10 MB." },
        { status: 400 }
      );
    }

    // Optional pre-extracted data from the preview step
    const extractedDataRaw = formData.get("extractedData") as string | null;
    const extractedData = extractedDataRaw ? JSON.parse(extractedDataRaw) : null;

    const documentId = generateDocId();
    const storagePath = `documents/${userId ?? sessionId ?? "anon"}/${documentId}.${fileType}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const bucket = getAdminBucket();
    const fileRef = bucket.file(storagePath);
    await fileRef.save(buffer, { contentType: file.type });

    await adminDb.collection("documents").doc(documentId).set({
      id: documentId,
      userId: userId ?? null,
      sessionId: sessionId ?? null,
      fileName: file.name,
      fileType,
      fileSize: file.size,
      storagePath,
      // If pre-extracted data is provided, mark as processed immediately
      status: extractedData ? "processed" : "processing",
      uploadedAt: new Date(),
      processedAt: extractedData ? new Date() : null,
      extractedData: extractedData ?? null,
      userCorrections: {},
      language,
    });

    return NextResponse.json({ documentId, storagePath });
  } catch (err) {
    console.error("Upload error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
