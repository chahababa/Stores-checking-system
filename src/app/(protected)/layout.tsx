import { headers } from "next/headers";

import { AppShell } from "@/components/app-shell";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireUser();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") ?? "/";

  const isRealOwner = (profile.impersonating?.realRole ?? profile.role) === "owner";

  const admin = createAdminClient();
  const storesQuery = isRealOwner
    ? await admin.from("stores").select("id, name").order("name")
    : null;
  const stores = storesQuery?.data ?? [];

  const impersonationStoreName =
    profile.impersonating && profile.store_id
      ? stores.find((store) => store.id === profile.store_id)?.name ??
        (await admin.from("stores").select("name").eq("id", profile.store_id).maybeSingle()).data?.name ??
        null
      : null;

  return (
    <AppShell
      profile={profile}
      pathname={pathname}
      stores={stores}
      impersonationStoreName={impersonationStoreName}
    >
      {children}
    </AppShell>
  );
}
