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
  { href: "/notifications", label: "通知中心", roles: ["owner", "manager", "leader"] },
];

const peopleAndItemLinks: NavigationLink[] = [
  { href: "/settings/staff", label: "組員管理", roles: ["owner", "manager", "leader"] },
  { href: "/settings/workstations", label: "工作站設定", roles: ["owner", "manager"] },
  { href: "/settings/items", label: "題目管理", roles: ["owner"] },
  { href: "/settings/focus-items", label: "標籤管理", roles: ["owner", "manager"] },
];

const otherSettingsLinks: NavigationLink[] = [
  { href: "/settings/users", label: "帳號管理", roles: ["owner"] },
  { href: "/settings/stores", label: "店別管理", roles: ["owner"] },
  { href: "/settings/qa-cleanup", label: "測試資料清理", roles: ["owner"] },
  { href: "/audit", label: "操作紀錄", roles: ["owner", "manager"] },
];

function NavigationPill({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = pathname === href || (href !== "/" && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center px-3 py-1.5 border-[2.5px] border-nb-ink text-sm font-bold transition-all duration-100",
        active
          ? "bg-nb-ink text-white shadow-none translate-x-[2px] translate-y-[2px]"
          : "bg-nb-paper text-nb-ink shadow-nb-sm hover:-translate-y-0.5 hover:shadow-nb",
      )}
    >
      {label}
    </Link>
  );
}

function NavigationGroup({
  title,
  eyebrow,
  links,
  pathname,
}: {
  title: string;
  eyebrow: string;
  links: NavigationLink[];
  pathname: string;
}) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 pr-2">
        <span className="nb-eyebrow">{eyebrow}</span>
        <span className="font-nbSerif text-[13px] font-black text-nb-ink/80 hidden md:inline">{title}</span>
      </span>
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
  const visiblePeopleAndItemLinks = peopleAndItemLinks.filter((link) => link.roles.includes(profile.role));
  const visibleOtherSettingsLinks = otherSettingsLinks.filter((link) => link.roles.includes(profile.role));

  return (
    <div className="min-h-screen">
      <header className="border-b-[3px] border-nb-ink bg-nb-bg">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="group inline-flex items-center gap-3 transition">
              <span className="inline-flex h-11 w-11 items-center justify-center bg-nb-yellow border-[2.5px] border-nb-ink shadow-nb-sm font-nbSerif text-xl font-black group-hover:-translate-y-0.5 group-hover:shadow-nb transition-all">
                巡
              </span>
              <span>
                <p className="nb-eyebrow">Warm Morning Ops</p>
                <h1 className="font-nbSerif text-2xl font-black text-nb-ink leading-tight">門市巡檢營運系統</h1>
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-3 bg-nb-paper border-[2.5px] border-nb-ink shadow-nb-sm px-4 py-2.5">
            <div className="text-right">
              <p className="font-bold text-sm text-nb-ink leading-tight">{profile.name || profile.email}</p>
              <p className="font-nbMono text-[11px] font-bold uppercase tracking-[0.18em] text-nb-ink/65 mt-0.5">
                {getRoleLabel(profile.role)}
              </p>
            </div>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pb-4">
          <NavigationGroup title="巡檢業務" eyebrow="Inspection" links={visibleInspectionLinks} pathname={pathname} />
          {visiblePeopleAndItemLinks.length > 0 ? (
            <div className="h-[2px] w-full bg-nb-ink/20" aria-hidden="true" />
          ) : null}
          <NavigationGroup title="組員與題目" eyebrow="People & Items" links={visiblePeopleAndItemLinks} pathname={pathname} />
          {visibleOtherSettingsLinks.length > 0 ? (
            <div className="h-[2px] w-full bg-nb-ink/20" aria-hidden="true" />
          ) : null}
          <NavigationGroup title="其他設定" eyebrow="Other Settings" links={visibleOtherSettingsLinks} pathname={pathname} />
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
