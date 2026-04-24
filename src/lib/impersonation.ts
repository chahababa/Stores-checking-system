import "server-only";

import { cookies } from "next/headers";

import type { UserRole } from "@/lib/auth";

export const IMPERSONATION_COOKIE = "nb_impersonation";
const MAX_AGE_SECONDS = 3600;

export type ImpersonationState = {
  role: UserRole;
  storeId: string | null;
  expiresAt: number;
};

export async function readImpersonation(): Promise<ImpersonationState | null> {
  const store = await cookies();
  const raw = store.get(IMPERSONATION_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.value) as Partial<ImpersonationState>;
    if (!parsed.expiresAt || parsed.expiresAt < Date.now()) return null;
    if (parsed.role !== "owner" && parsed.role !== "manager" && parsed.role !== "leader") return null;
    return {
      role: parsed.role,
      storeId: typeof parsed.storeId === "string" ? parsed.storeId : null,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

export async function writeImpersonation(state: { role: UserRole; storeId: string | null }) {
  const store = await cookies();
  store.set(
    IMPERSONATION_COOKIE,
    JSON.stringify({
      role: state.role,
      storeId: state.storeId,
      expiresAt: Date.now() + MAX_AGE_SECONDS * 1000,
    }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    },
  );
}

export async function clearImpersonation() {
  const store = await cookies();
  store.delete(IMPERSONATION_COOKIE);
}
