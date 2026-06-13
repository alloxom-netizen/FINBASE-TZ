"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";

export function LanguageToggle() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 p-0.5 text-xs">
      <button
        onClick={() => switchLocale("en")}
        className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
          locale === "en"
            ? "bg-white/15 text-neutral-100"
            : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        EN
      </button>
      <button
        onClick={() => switchLocale("sw")}
        className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
          locale === "sw"
            ? "bg-white/15 text-neutral-100"
            : "text-neutral-500 hover:text-neutral-300"
        }`}
      >
        SW
      </button>
    </div>
  );
}
