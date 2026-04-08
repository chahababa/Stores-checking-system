import Link from "next/link";
import { PropsWithChildren } from "react";

import { UserProfile } from "@/lib/auth";
import { cn } from "@/lib/utils";

const links = [
  { href: "/inspection/new", label: "New Inspection", roles: ["owner", "manager"] },
  { href: "/inspection/history", label: "Inspection History", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/improvements", label: "Improvements", roles: ["owner", "manager", "leader"] },
  { href: "/inspection/reports", label: "Reports", roles: ["owner", "manager", "leader"] },
  { href: "/audit", label: "Audit", roles: ["owner", "manager"] },
  { href: "/settings/users", label: "User Access", roles: ["owner"] },
  { href: "/settings/staff", label: "Staff", roles: ["owner", "manager", "leader"] },
  { href: "/settings/items", label: "Items", roles: ["owner"] },
  { href: "/settings/focus-items", label: "Focus Items", roles: ["owner", "manager"] },
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
            <p className="font-lora text-sm uppercase tracking-[0.3em] text-warm">Stores Checking</p>
            <h1 className="font-serifTc text-2xl font-semibold">Store Inspection System</h1>
          </div>
          <div className="rounded-2xl bg-soft px-4 py-3 text-sm shadow-card">
            <p>{profile.name || profile.email}</p>
            <p className="text-ink/70">
              {profile.role}
              {profile.store_id ? ` / ${profile.store_id}` : ""}
            </p>
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
            Home
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
