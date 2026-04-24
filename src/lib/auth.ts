import "server-only";

import { redirect } from "next/navigation";

import { readImpersonation } from "@/lib/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type UserRole = "owner" | "manager" | "leader";

export type UserProfile = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  store_id: string | null;
  is_active: boolean;
  line_user_id: string | null;
  impersonating?: {
    realRole: UserRole;
    realStoreId: string | null;
  };
};

export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return null;
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("users")
    .select("id, email, name, role, store_id, is_active, line_user_id")
    .eq("email", user.email)
    .maybeSingle();

  if (error || !data || !data.is_active) {
    return null;
  }

  const profile = data as UserProfile;

  // Only real owners can impersonate. Apply impersonation cookie if present.
  if (profile.role === "owner") {
    const impersonation = await readImpersonation();
    if (impersonation && impersonation.role !== "owner") {
      return {
        ...profile,
        role: impersonation.role,
        store_id: impersonation.role === "leader" ? impersonation.storeId : null,
        impersonating: {
          realRole: profile.role,
          realStoreId: profile.store_id,
        },
      };
    }
  }

  return profile;
}

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect("/forbidden?reason=unauthorized");
  }

  return profile;
}

export async function requireRole(...roles: UserRole[]) {
  const profile = await requireUser();
  if (!roles.includes(profile.role)) {
    redirect("/forbidden?reason=role");
  }
  return profile;
}
