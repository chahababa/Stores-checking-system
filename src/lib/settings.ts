import "server-only";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export type AuthorizedUserInput = {
  email: string;
  role: "owner" | "manager" | "leader";
  storeId?: string | null;
  name?: string | null;
};

export type StoreInput = {
  code: string;
  name: string;
};

export type InspectionTagType = "critical" | "monthly_attention" | "complaint_watch";
export type InspectionTagSource = "manual" | "complaint_sync";

function revalidateStoreDependentPaths() {
  revalidatePath("/");
  revalidatePath("/settings/stores");
  revalidatePath("/settings/users");
  revalidatePath("/settings/staff");
  revalidatePath("/settings/items");
  revalidatePath("/settings/focus-items");
  revalidatePath("/inspection/new");
  revalidatePath("/inspection/history");
  revalidatePath("/inspection/reports");
}

export async function createStore(input: StoreInput) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();
  const code = input.code.trim().toLowerCase();
  const name = input.name.trim();

  if (!code) {
    throw new Error("請輸入店別代碼。");
  }

  if (!name) {
    throw new Error("請輸入店別名稱。");
  }

  const { data, error } = await admin
    .from("stores")
    .insert({
      code,
      name,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "create_store",
    entityType: "store",
    entityId: data?.id ?? code,
    details: {
      code,
      name,
    },
  });

  revalidateStoreDependentPaths();
}

export async function updateStoreName(input: { id: string; name: string }) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error("請輸入店別名稱。");
  }

  const { error } = await admin.from("stores").update({ name }).eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "update_store_name",
    entityType: "store",
    entityId: input.id,
    details: {
      name,
    },
  });

  revalidateStoreDependentPaths();
}

export async function createAuthorizedUser(input: AuthorizedUserInput) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();
  const payload = {
    email: input.email.trim().toLowerCase(),
    role: input.role,
    store_id: input.role === "leader" ? input.storeId ?? null : null,
    name: input.name?.trim() || null,
    is_active: true,
  };

  const { error } = await admin.from("users").upsert(payload, {
    onConflict: "email",
  });

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "create_or_update_authorized_user",
    entityType: "user",
    entityId: payload.email,
    details: {
      role: payload.role,
      store_id: payload.store_id,
      is_active: payload.is_active,
    },
  });

  revalidatePath("/settings/users");
}

export async function updateAuthorizedUserStatus(id: string, isActive: boolean) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();
  const { error } = await admin.from("users").update({ is_active: isActive }).eq("id", id);
  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "update_authorized_user_status",
    entityType: "user",
    entityId: id,
    details: {
      is_active: isActive,
    },
  });
  revalidatePath("/settings/users");
}

export async function createStaffMember(input: {
  storeId: string;
  name: string;
  position: "kitchen" | "floor" | "counter";
}) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("staff_members")
    .insert({
      store_id: input.storeId,
      name: input.name.trim(),
      position: input.position,
      status: "active",
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "create_staff_member",
    entityType: "staff_member",
    entityId: data?.id ?? input.name.trim(),
    details: {
      store_id: input.storeId,
      name: input.name.trim(),
      position: input.position,
    },
  });

  revalidatePath("/settings/staff");
}

export async function archiveStaffMember(id: string) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const { error } = await admin
    .from("staff_members")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "archive_staff_member",
    entityType: "staff_member",
    entityId: id,
  });

  revalidatePath("/settings/staff");
}

export async function restoreStaffMember(id: string) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const { error } = await admin
    .from("staff_members")
    .update({
      status: "active",
      archived_at: null,
    })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "restore_staff_member",
    entityType: "staff_member",
    entityId: id,
  });

  revalidatePath("/settings/staff");
}

export async function getInspectionItemTags(month: string) {
  await requireRole("owner", "manager");
  const admin = createAdminClient();
  const [{ data: critical, error: criticalError }, { data: scoped, error: scopedError }] = await Promise.all([
    admin
      .from("focus_items")
      .select("id, item_id, type, month, store_id, source, set_by, inspection_items(id, name), stores(id, name)")
      .eq("type", "critical")
      .eq("source", "manual"),
    admin
      .from("focus_items")
      .select("id, item_id, type, month, store_id, source, set_by, inspection_items(id, name), stores(id, name)")
      .in("type", ["monthly_attention", "complaint_watch"])
      .eq("month", month)
      .eq("source", "manual"),
  ]);

  if (criticalError || scopedError) {
    throw new Error(criticalError?.message || scopedError?.message);
  }

  return [...(critical ?? []), ...(scoped ?? [])];
}

export async function setInspectionItemTags(input: {
  month?: string | null;
  type: InspectionTagType;
  storeId?: string | null;
  source?: InspectionTagSource;
  itemIds: string[];
}) {
  const profile = await requireRole("owner", "manager");
  const source = input.source ?? "manual";

  if (input.type === "critical" && profile.role !== "owner") {
    throw new Error("只有 owner 可以管理必查項目。");
  }

  const admin = createAdminClient();
  const month = input.type === "critical" ? null : input.month ?? null;
  const storeId = input.type === "critical" ? null : input.storeId ?? null;

  const deleteQuery = admin.from("focus_items").delete().eq("type", input.type).eq("source", source);
  const monthScopedQuery = month === null ? deleteQuery.is("month", null) : deleteQuery.eq("month", month);
  const { error: deleteError } =
    storeId === null ? await monthScopedQuery.is("store_id", null) : await monthScopedQuery.eq("store_id", storeId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (input.itemIds.length > 0) {
    const rows = input.itemIds.map((itemId) => ({
      item_id: itemId,
      type: input.type,
      month,
      store_id: storeId,
      source,
      set_by: profile.id,
    }));
    const { error: insertError } = await admin.from("focus_items").insert(rows);
    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "set_focus_items",
    entityType: "focus_items",
    entityId: `${input.type}:${month ?? "always"}:${storeId ?? "all"}`,
    details: {
      type: input.type,
      month,
      store_id: storeId,
      source,
      item_ids: input.itemIds,
    },
  });

  revalidateStoreDependentPaths();
}

export async function syncComplaintWatchTags(input: {
  month: string;
  storeId?: string | null;
  itemIds: string[];
}) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const storeId = input.storeId ?? null;

  const deleteQuery = admin
    .from("focus_items")
    .delete()
    .eq("type", "complaint_watch")
    .eq("source", "complaint_sync")
    .eq("month", input.month);

  const { error: deleteError } =
    storeId === null ? await deleteQuery.is("store_id", null) : await deleteQuery.eq("store_id", storeId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (input.itemIds.length > 0) {
    const { error: insertError } = await admin.from("focus_items").insert(
      input.itemIds.map((itemId) => ({
        item_id: itemId,
        type: "complaint_watch" as const,
        month: input.month,
        store_id: storeId,
        source: "complaint_sync" as const,
        set_by: profile.id,
      })),
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "set_focus_items",
    entityType: "focus_items",
    entityId: `complaint_watch:${input.month}:${storeId ?? "all"}:sync`,
    details: {
      type: "complaint_watch",
      month: input.month,
      store_id: storeId,
      source: "complaint_sync",
      item_ids: input.itemIds,
    },
  });

  revalidateStoreDependentPaths();
}

export async function updateInspectionItemStatus(id: string, isActive: boolean) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();
  const { error } = await admin.from("inspection_items").update({ is_active: isActive }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "update_inspection_item_status",
    entityType: "inspection_item",
    entityId: id,
    details: {
      is_active: isActive,
    },
  });

  revalidatePath("/settings/items");
}

export async function setStoreExtraItems(input: { storeId: string; itemIds: string[] }) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();

  const { error: deleteError } = await admin
    .from("store_extra_items")
    .delete()
    .eq("store_id", input.storeId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  if (input.itemIds.length > 0) {
    const { error: insertError } = await admin.from("store_extra_items").insert(
      input.itemIds.map((itemId) => ({
        store_id: input.storeId,
        item_id: itemId,
      })),
    );

    if (insertError) {
      throw new Error(insertError.message);
    }
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "set_store_extra_items",
    entityType: "store_extra_items",
    entityId: input.storeId,
    details: {
      item_ids: input.itemIds,
    },
  });

  revalidatePath("/settings/items");
}
