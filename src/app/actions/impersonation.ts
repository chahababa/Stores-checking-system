"use server";

import { revalidatePath } from "next/cache";

import { requireUser, type UserRole } from "@/lib/auth";
import { clearImpersonation, writeImpersonation } from "@/lib/impersonation";
import { createAdminClient } from "@/lib/supabase/admin";

function isRole(value: string): value is UserRole {
  return value === "owner" || value === "manager" || value === "leader";
}

export async function startImpersonateAction(formData: FormData) {
  const profile = await requireUser();
  const actualRole = profile.impersonating?.realRole ?? profile.role;
  if (actualRole !== "owner") {
    throw new Error("只有系統擁有者可以切換視角。");
  }

  const rawRole = String(formData.get("role") ?? "");
  if (!isRole(rawRole) || rawRole === "owner") {
    throw new Error("請選擇主管或店長。");
  }

  const rawStoreId = formData.get("storeId");
  const storeId = typeof rawStoreId === "string" && rawStoreId.length > 0 ? rawStoreId : null;

  if (rawRole === "leader" && !storeId) {
    throw new Error("模擬店長必須指定店別。");
  }

  if (storeId) {
    const admin = createAdminClient();
    const { data } = await admin.from("stores").select("id").eq("id", storeId).maybeSingle();
    if (!data) {
      throw new Error("店別不存在。");
    }
  }

  await writeImpersonation({ role: rawRole, storeId: rawRole === "leader" ? storeId : null });
  revalidatePath("/", "layout");
}

export async function stopImpersonateAction() {
  await clearImpersonation();
  revalidatePath("/", "layout");
}
