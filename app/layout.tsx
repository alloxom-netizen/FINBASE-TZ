import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });

export const metadata: Metadata = {
  title: "FinBase — Financial Intelligence for East Africa",
  description: "Upload financial documents and get AI-powered insights, summaries, and audit reports in English and Swahili.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-neutral-950 text-neutral-100 font-sans">{children}</body>
    </html>
  );
}
