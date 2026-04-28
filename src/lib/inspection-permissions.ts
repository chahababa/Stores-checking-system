import type { UserProfile } from "@/lib/auth";

export function canManageInspectionReport(profile: Pick<UserProfile, "role"> | null | undefined) {
  return profile?.role === "owner" || profile?.role === "manager";
}

export function canDeleteInspectionReport(profile: Pick<UserProfile, "role"> | null | undefined) {
  return profile?.role === "owner";
}
