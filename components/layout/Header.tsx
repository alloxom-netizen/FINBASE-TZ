"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { useAuthStore } from "@/lib/store/auth";

// ── Icons ─────────────────────────────────────────────────────


function DashboardIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function AssistantIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
    </svg>
  );
}

function AuditIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
    </svg>
  );
}

function LoginIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} suppressHydrationWarning>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

// ── Compact language toggle ───────────────────────────────────
function CompactLangToggle() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function toggle() {
    const next = locale === "en" ? "sw" : "en";
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return (
    <button
      onClick={toggle}
      title={locale === "en" ? "Switch to Swahili" : "Badili kwa Kiingereza"}
      className="h-8 w-9 rounded-lg border border-white/10 bg-white/5 text-xs font-semibold text-neutral-500 hover:text-neutral-200 hover:bg-white/10 transition-colors"
    >
      {locale.toUpperCase()}
    </button>
  );
}

// ── Sidebar ───────────────────────────────────────────────────
export function Header() {
  const locale = useLocale();
  const { user, signOut } = useAuthStore();
  const pathname = usePathname();

  const navItems = [
    { href: `/${locale}/dashboard`,  label: "Dashboard",  Icon: DashboardIcon, exact: false },
    { href: `/${locale}/assistant`,  label: "Assistant",  Icon: AssistantIcon, exact: false },
    { href: `/${locale}/auditing`,   label: "Auditing",   Icon: AuditIcon,     exact: false },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-14 bg-neutral-950 border-r border-white/[0.06] flex flex-col z-50">

      {/* Logo */}
      <div className="h-14 flex items-center justify-center border-b border-white/[0.06] shrink-0">
        <Link href={`/${locale}/dashboard`} title="FinBase">
          <div className="h-8 w-8 rounded-lg bg-teal-500 flex items-center justify-center hover:bg-teal-400 transition-colors">
            <span className="text-white font-bold text-sm">F</span>
          </div>
        </Link>
      </div>

      {/* Nav — icon only with title tooltips */}
      <nav className="flex-1 flex flex-col items-center py-3 gap-1 overflow-y-auto">
        {navItems.map(({ href, label, Icon, exact }) => {
          const isActive = exact ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`h-9 w-9 rounded-lg flex items-center justify-center transition-colors duration-150 ${
                isActive
                  ? "bg-white/10 text-neutral-100"
                  : "text-neutral-600 hover:text-neutral-200 hover:bg-white/5"
              }`}
            >
              <Icon />
            </Link>
          );
        })}
      </nav>

      {/* Bottom — lang toggle + auth */}
      <div className="shrink-0 flex flex-col items-center gap-2 pb-4 pt-3 border-t border-white/[0.06]">
        <CompactLangToggle />

        {user ? (
          <>
            {/* User initial */}
            <div
              title={user.email ?? ""}
              className="h-8 w-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-xs font-semibold text-neutral-400 select-none"
            >
              {user.email?.[0]?.toUpperCase() ?? "U"}
            </div>
            {/* Logout */}
            <button
              onClick={signOut}
              title="Sign out"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-neutral-600 hover:text-red-400 hover:bg-white/5 transition-colors duration-150"
            >
              <LogoutIcon />
            </button>
          </>
        ) : (
          <Link
            href={`/${locale}/auth/login`}
            title="Sign in"
            className="h-9 w-9 rounded-lg flex items-center justify-center text-neutral-600 hover:text-neutral-200 hover:bg-white/5 transition-colors duration-150"
          >
            <LoginIcon />
          </Link>
        )}
      </div>
    </aside>
  );
}
