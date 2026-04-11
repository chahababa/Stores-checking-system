import Link from "next/link";
import { PropsWithChildren } from "react";

import { SignOutButton } from "@/components/sign-out-button";
import { UserProfile } from "@/lib/auth";
import { getRoleLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

type NavigationLink = {
  href: string;
  label: string;
  roles: Array<UserProfile["role"]>;
};

const inspectionLinks: NavigationLink[] = [
  { href: "/", label: "首頁", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/new", label: "新增巡店", roles: ["owner", "manager"] },
  { href: "/inspection/history", label: "巡店紀錄", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/improvements", label: "改善追蹤", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/reports", label: "報表分析", roles: ["owner", "manager", "leader"] },
];

const managementLinks: NavigationLink[] = [
  { href: "/settings/users", label: "帳號管理", roles: ["owner"] },
  { href: "/settings/stores", label: "店別管理", roles: ["owner"] },
  { href: "/settings/staff", label: "組員管理", roles: ["owner", "manager", "leader"] },
  { href: "/settings/items", label: "題目管理", roles: ["owner"] },
  { href: "/settings/focus-items", label: "標籤管理", roles: ["owner", "manager"] },
  { href: "/settings/qa-cleanup", label: "QA 清理", roles: ["owner"] },
  { href: "/audit", label: "操作紀錄", roles: ["owner", "manager"] },
];

function NavigationPill({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-4 py-2 text-sm transition",
        pathname === href ? "bg-warm text-white" : "bg-white/80 text-ink/80 hover:bg-soft",
      )}
    >
      {label}
    </Link>
  );
}

function NavigationGroup({
  title,
  links,
  pathname,
}: {
  title: string;
  links: NavigationLink[];
  pathname: string;
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="px-2 text-xs font-medium uppercase tracking-[0.18em] text-ink/45">{title}</span>
      {links.map((link) => (
        <NavigationPill key={link.href} href={link.href} label={link.label} pathname={pathname} />
      ))}
    </div>
  );
}

export function AppShell({
  profile,
  pathname,
  children,
}: PropsWithChildren<{ profile: UserProfile; pathname: string }>) {
  const visibleInspectionLinks = inspectionLinks.filter((link) => link.roles.includes(profile.role));
  const visibleManagementLinks = managementLinks.filter((link) => link.roles.includes(profile.role));

  return (
    <div className="min-h-screen">
      <header className="border-b border-ink/10 bg-cream/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <Link href="/" className="transition hover:opacity-85">
              <p className="font-lora text-sm uppercase tracking-[0.3em] text-warm">Warm Morning Ops</p>
              <h1 className="font-serifTc text-2xl font-semibold text-ink">門市巡檢營運系統</h1>
            </Link>
          </div>
          <div className="flex items-center gap-3 rounded-2xl bg-soft px-4 py-3 text-sm shadow-card">
            <div className="text-right">
              <p>{profile.name || profile.email}</p>
              <p className="text-ink/70">{getRoleLabel(profile.role)}</p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-4">
          <NavigationGroup title="巡檢業務" links={visibleInspectionLinks} pathname={pathname} />
          {visibleManagementLinks.length > 0 ? <div className="h-px w-full bg-ink/10" aria-hidden="true" /> : null}
          <NavigationGroup title="系統管理" links={visibleManagementLinks} pathname={pathname} />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
