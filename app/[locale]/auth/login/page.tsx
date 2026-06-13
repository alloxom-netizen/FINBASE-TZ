"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/auth";
import { Button } from "@/components/ui/Button";

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuthStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(email, password);
      router.push(`/${locale}/dashboard`);
    } catch (err) {
      const msg = (err as Error).message;
      setError(t(`auth.error.${msg}` as Parameters<typeof t>[0]));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true);
    setError("");
    try {
      await signInWithGoogle();
      router.push(`/${locale}/dashboard`);
    } catch {
      setError(t("auth.error.invalidCredentials"));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-neutral-100">{t("auth.loginTitle")}</h1>
          <p className="text-sm text-neutral-500">Sign in to your FinBase account</p>
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-neutral-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {googleLoading ? (
            <span className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
          ) : (
            <GoogleIcon />
          )}
          Continue with Google
        </button>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-white/[0.06]" />
          <span className="text-xs text-neutral-600">or</span>
          <div className="flex-1 h-px bg-white/[0.06]" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-400">{t("auth.email")}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/40 transition-colors"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-neutral-400">{t("auth.password")}</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-500/40 transition-colors"
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            {t("auth.login")}
          </Button>
        </form>

        <p className="text-sm text-neutral-600 text-center">
          {t("auth.noAccount")}{" "}
          <Link href={`/${locale}/auth/register`} className="text-teal-400 hover:text-teal-300 transition-colors">
            {t("auth.signUp")}
          </Link>
        </p>
      </div>
    </div>
  );
}
