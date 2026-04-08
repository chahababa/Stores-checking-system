import { headers } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/";

  return (
    <AppShell profile={profile} pathname={pathname}>
      {children}
    </AppShell>
  );
}
