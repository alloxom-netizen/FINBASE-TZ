import { NextRequest, NextResponse } from "next/server";
import { adminDb, getAdminBucket } from "@/lib/firebase/admin";
import { v4 as uuidv4 } from "uuid";

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

    const documentId = uuidv4();
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
      status: "processing",
      uploadedAt: new Date(),
      processedAt: null,
      extractedData: null,
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
