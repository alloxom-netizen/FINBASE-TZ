import { App, getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";
import { getStorage, Storage } from "firebase-admin/storage";

let _app: App | null = null;
let _db: Firestore | null = null;
let _storage: Storage | null = null;

function getAdminApp(): App {
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  _app = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey,
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  });
  return _app;
}

export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp(), "finbase");
  return _db;
}

export function getAdminStorage(): Storage {
  if (!_storage) _storage = getStorage(getAdminApp());
  return _storage;
}

export function getAdminBucket() {
  const bucketName = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!;
  return getAdminStorage().bucket(bucketName);
}

// Convenience named exports for use in route handlers
export const adminDb = {
  collection: (...args: Parameters<Firestore["collection"]>) =>
    getAdminDb().collection(...args),
};

export const adminStorage = {
  bucket: () => getAdminStorage().bucket(),
};
