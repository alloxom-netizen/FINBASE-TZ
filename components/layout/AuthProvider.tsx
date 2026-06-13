"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/lib/store/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    const unsub = init();
    return unsub;
  }, [init]);

  return <>{children}</>;
}
