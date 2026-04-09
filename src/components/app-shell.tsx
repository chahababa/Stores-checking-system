import Link from "next/link";
import { PropsWithChildren } from "react";

import { UserProfile } from "@/lib/auth";
import { getRoleLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

const links = [
  { href: "/inspection/new", label: "新增巡店", roles: ["owner", "manager"] },
  { href: "/inspection/history", label: "巡店紀錄", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/improvements", label: "改善追蹤", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/reports", label: "報表分析", roles: ["owner", "manager", "leader"] },
  { href: "/audit", label: "操作紀錄", roles: ["owner", "manager"] },
  { href: "/settings/users", label: "帳號權限", roles: ["owner"] },
  { href: "/settings/stores", label: "店別管理", roles: ["owner"] },
  { href: "/settings/staff", label: "組員管理", roles: ["owner", "manager", "leader"] },
  { href: "/settings/items", label: "題目管理", roles: ["owner"] },
  { href: "/settings/focus-items", label: "重點項目", roles: ["owner", "manager"] },
];

export function AppShell({
  profile,
  pathname,
  children,
}: PropsWithChildren<{ profile: UserProfile; pathname: string }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-lora text-sm uppercase tracking-[0.3em] text-warm">Warm Morning Ops</p>
            <h1 className="font-serifTc text-2xl font-semibold">門市巡檢系統</h1>
          </div>
          <div className="rounded-2xl bg-soft px-4 py-3 text-sm shadow-card">
            <p>{profile.name || profile.email}</p>
            <p className="text-ink/70">{getRoleLabel(profile.role)}</p>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-wrap gap-2 px-4 pb-4">
          {links
            .filter((link) => link.roles.includes(profile.role))
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition",
                  pathname === link.href ? "bg-warm text-white" : "bg-white/70 hover:bg-soft",
                )}
              >
                {link.label}
              </Link>
            ))}
          <Link href="/" className="rounded-full bg-white/70 px-4 py-2 text-sm hover:bg-soft">
            首頁
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
