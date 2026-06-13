"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { LanguageToggle } from "./LanguageToggle";
import { useAuthStore } from "@/lib/store/auth";

function HomeIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function AssistantIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

export function Header() {
  const t = useTranslations();
  const locale = useLocale();
  const { user, signOut } = useAuthStore();
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}`, label: t("nav.home"), Icon: HomeIcon, exact: true },
    { href: `/${locale}/dashboard`, label: t("nav.dashboard"), Icon: DashboardIcon, exact: false },
    { href: `/${locale}/assistant`, label: t("nav.assistant"), Icon: AssistantIcon, exact: false },
    { href: `/${locale}/auditing`, label: t("nav.auditing"), Icon: AuditIcon, exact: false },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-neutral-950 border-r border-white/[0.06] flex flex-col z-50">
      {/* Logo */}
      <div className="px-4 h-14 flex items-center border-b border-white/[0.06]">
        <Link href={`/${locale}`} className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-lg bg-teal-500 flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-xs">F</span>
          </div>
          <span className="font-semibold text-neutral-100 text-sm tracking-tight">FinBase</span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-white/10 text-neutral-100 font-medium"
                  : "text-neutral-500 hover:text-neutral-200 hover:bg-white/5"
              }`}
            >
              <Icon />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-4 pt-3 border-t border-white/[0.06] space-y-3">
        <LanguageToggle />
        {user ? (
          <div className="space-y-1">
            <p className="text-xs text-neutral-600 px-1 truncate">{user.email}</p>
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm text-neutral-500 hover:text-neutral-200 hover:bg-white/5 transition-colors"
            >
              {t("nav.logout")}
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            <Link
              href={`/${locale}/auth/login`}
              className="flex items-center px-3 py-2 rounded-lg text-sm text-neutral-500 hover:text-neutral-200 hover:bg-white/5 transition-colors"
            >
              {t("nav.login")}
            </Link>
            <Link
              href={`/${locale}/auth/register`}
              className="flex items-center justify-center px-3 py-2 rounded-lg text-sm bg-teal-500 text-white hover:bg-teal-400 transition-colors font-medium"
            >
              {t("nav.register")}
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
