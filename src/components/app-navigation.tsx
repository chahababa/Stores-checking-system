"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { UserProfile } from "@/lib/auth";
import { isNavigationLinkActive } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export type NavigationLink = {
  href: string;
  label: string;
  roles: Array<UserProfile["role"]>;
};

function NavigationPill({ href, label, pathname }: { href: string; label: string; pathname: string }) {
  const active = isNavigationLinkActive(pathname, href);

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

export function NavigationGroup({
  title,
  eyebrow,
  links,
  initialPathname,
}: {
  title: string;
  eyebrow: string;
  links: NavigationLink[];
  initialPathname: string;
}) {
  const clientPathname = usePathname();
  const pathname = clientPathname ?? initialPathname;

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
