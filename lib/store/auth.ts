"use client";

import { create } from "zustand";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import { auth } from "@/lib/firebase/client";

interface AuthStore {
  user: User | null;
  loading: boolean;
  error: string | null;
  init: () => () => void;
  signIn: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  loading: true,
  error: null,

  init: () => {
    const unsub = onAuthStateChanged(auth, (user) => {
      set({ user, loading: false });
    });
    return unsub;
  },

  signIn: async (email, password) => {
    set({ error: null });
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      set({ error: "invalidCredentials" });
      throw new Error("invalidCredentials");
    }
  },

  register: async (email, password) => {
    set({ error: null });
    try {
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-already-in-use") {
        set({ error: "emailInUse" });
        throw new Error("emailInUse");
      }
      if (code === "auth/weak-password") {
        set({ error: "weakPassword" });
        throw new Error("weakPassword");
      }
      set({ error: "invalidCredentials" });
      throw new Error("invalidCredentials");
    }
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    set({ user: null });
  },

  clearError: () => set({ error: null }),
}));
