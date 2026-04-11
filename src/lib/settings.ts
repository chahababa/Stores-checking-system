import "server-only";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import {
  isQaInspectionRecord,
  isQaStaffRecord,
  isQaStoreRecord,
  isQaUserRecord,
} from "@/lib/qa-cleanup";
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

export type WorkstationArea = "kitchen" | "floor" | "counter";

export type WorkstationInput = {
  code: string;
  name: string;
  area: WorkstationArea;
  storeId?: string | null;
  isActive?: boolean;
};

export type InspectionItemInput = {
  name: string;
  categoryId: string;
  isBase: boolean;
  storeIds?: string[];
};

export type InspectionTagType = "critical" | "monthly_attention" | "complaint_watch";
export type InspectionTagSource = "manual" | "complaint_sync";
export type QaCleanupPreview = {
  stores: Array<{ id: string; code: string; name: string }>;
  users: Array<{ id: string; email: string; name: string | null; role: "owner" | "manager" | "leader" }>;
  staffMembers: Array<{ id: string; name: string; status: "active" | "archived"; storeName: string | null }>;
  inspections: Array<{ id: string; date: string; timeSlot: string; storeName: string | null }>;
  scopedTags: Array<{ id: string; type: InspectionTagType; month: string | null; storeName: string | null }>;
};

function revalidateStoreDependentPaths() {
  revalidatePath("/");
  revalidatePath("/settings/stores");
  revalidatePath("/settings/workstations");
  revalidatePath("/settings/users");
  revalidatePath("/settings/staff");
  revalidatePath("/settings/qa-cleanup");
  revalidatePath("/settings/items");
  revalidatePath("/settings/focus-items");
  revalidatePath("/inspection/new");
  revalidatePath("/inspection/history");
  revalidatePath("/inspection/reports");
}

function getPublicObjectPath(photoUrl: string) {
  const marker = "/object/public/inspection-photos/";
  const index = photoUrl.indexOf(marker);
  if (index === -1) return null;
  return decodeURIComponent(photoUrl.slice(index + marker.length));
}

async function collectQaCleanupPreview() {
  const admin = createAdminClient();
  const [
    { data: stores, error: storesError },
    { data: users, error: usersError },
    { data: staffMembers, error: staffError },
    { data: inspections, error: inspectionsError },
    { data: legacyNotes, error: notesError },
    { data: focusItems, error: focusError },
  ] = await Promise.all([
    admin.from("stores").select("id, code, name").order("created_at"),
    admin.from("users").select("id, email, name, role, store_id, is_active").order("created_at"),
    admin.from("staff_members").select("id, store_id, name, status").order("created_at"),
    admin.from("inspections").select("id, store_id, date, time_slot").order("date", { ascending: false }),
    admin.from("legacy_notes").select("inspection_id, content"),
    admin.from("focus_items").select("id, type, month, store_id"),
  ]);

  if (storesError || usersError || staffError || inspectionsError || notesError || focusError) {
    throw new Error(
      storesError?.message ||
        usersError?.message ||
        staffError?.message ||
        inspectionsError?.message ||
        notesError?.message ||
        focusError?.message ||
        "無法載入 QA 清理預覽。",
    );
  }

  const storeRows = stores ?? [];
  const userRows = users ?? [];
  const staffRows = staffMembers ?? [];
  const inspectionRows = inspections ?? [];
  const noteRows = legacyNotes ?? [];
  const focusRows = focusItems ?? [];

  const storeNameById = Object.fromEntries(storeRows.map((store) => [store.id, store.name]));
  const qaStores = storeRows.filter((store) => isQaStoreRecord(store));
  const qaStoreIds = new Set(qaStores.map((store) => store.id));
  const notesByInspectionId = noteRows.reduce<Record<string, string[]>>((carry, note) => {
    const group = carry[note.inspection_id] ?? [];
    group.push(note.content);
    carry[note.inspection_id] = group;
    return carry;
  }, {});

  const qaUsers = userRows.filter((user) => isQaUserRecord(user));
  const qaStaffMembers = staffRows.filter((staff) => isQaStaffRecord(staff) || qaStoreIds.has(staff.store_id));
  const qaInspections = inspectionRows.filter(
    (inspection) =>
      qaStoreIds.has(inspection.store_id) ||
      isQaInspectionRecord({
        timeSlot: inspection.time_slot,
        legacyNotes: notesByInspectionId[inspection.id] ?? [],
      }),
  );
  const scopedTags = focusRows.filter((tag) => Boolean(tag.store_id) && qaStoreIds.has(tag.store_id!));

  return {
    stores: qaStores.map((store) => ({
      id: store.id,
      code: store.code,
      name: store.name,
    })),
    users: qaUsers.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    })),
    staffMembers: qaStaffMembers.map((staff) => ({
      id: staff.id,
      name: staff.name,
      status: staff.status,
      storeName: storeNameById[staff.store_id] ?? null,
    })),
    inspections: qaInspections.map((inspection) => ({
      id: inspection.id,
      date: inspection.date,
      timeSlot: inspection.time_slot,
      storeName: storeNameById[inspection.store_id] ?? null,
    })),
    scopedTags: scopedTags.map((tag) => ({
      id: tag.id,
      type: tag.type as InspectionTagType,
      month: tag.month,
      storeName: tag.store_id ? (storeNameById[tag.store_id] ?? null) : null,
    })),
  } satisfies QaCleanupPreview;
}

export async function getQaCleanupPreview() {
  await requireRole("owner");
  return collectQaCleanupPreview();
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

export async function createWorkstation(input: WorkstationInput) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const code = input.code.trim().toLowerCase();
  const name = input.name.trim();

  if (!code) {
    throw new Error("請填寫工作站代碼。");
  }

  if (!name) {
    throw new Error("請填寫工作站名稱。");
  }

  const payload = {
    code,
    name,
    area: input.area,
    store_id: input.storeId ?? null,
    is_active: input.isActive ?? true,
  };

  const { data, error } = await admin.from("workstations").insert(payload).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "create_workstation",
    entityType: "workstation",
    entityId: data?.id ?? code,
    details: {
      code,
      name,
      area: input.area,
      store_id: payload.store_id,
      is_active: payload.is_active,
    },
  });

  revalidateStoreDependentPaths();
}

export async function updateWorkstation(input: {
  id: string;
  code: string;
  name: string;
  area: WorkstationArea;
  storeId?: string | null;
  isActive: boolean;
}) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const code = input.code.trim().toLowerCase();
  const name = input.name.trim();

  if (!code) {
    throw new Error("請填寫工作站代碼。");
  }

  if (!name) {
    throw new Error("請填寫工作站名稱。");
  }

  const payload = {
    code,
    name,
    area: input.area,
    store_id: input.storeId ?? null,
    is_active: input.isActive,
  };

  const { error } = await admin.from("workstations").update(payload).eq("id", input.id);

  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "update_workstation",
    entityType: "workstation",
    entityId: input.id,
    details: {
      code,
      name,
      area: input.area,
      store_id: payload.store_id,
      is_active: payload.is_active,
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

async function validateDefaultWorkstation(
  admin: ReturnType<typeof createAdminClient>,
  storeId: string,
  defaultWorkstationId?: string | null,
) {
  if (!defaultWorkstationId) {
    return null;
  }

  const { data, error } = await admin
    .from("workstations")
    .select("id, name, store_id")
    .eq("id", defaultWorkstationId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data || (data.store_id && data.store_id !== storeId)) {
    throw new Error("選擇的常用工作站不適用於這間店。");
  }

  return data;
}

export async function createStaffMember(input: {
  storeId: string;
  name: string;
  defaultWorkstationId?: string | null;
}) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const defaultWorkstation = await validateDefaultWorkstation(admin, input.storeId, input.defaultWorkstationId);
  const { data, error } = await admin
    .from("staff_members")
    .insert({
      store_id: input.storeId,
      name: input.name.trim(),
      position: null,
      default_workstation_id: defaultWorkstation?.id ?? null,
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
      default_workstation_name: defaultWorkstation?.name ?? null,
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

export async function createInspectionItem(input: InspectionItemInput) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();
  const name = input.name.trim();

  if (!name) {
    throw new Error("請填寫題目名稱。");
  }

  if (!input.categoryId) {
    throw new Error("請選擇題目類別。");
  }

  const scopedStoreIds = Array.from(new Set((input.storeIds ?? []).filter(Boolean)));
  if (!input.isBase && scopedStoreIds.length === 0) {
    throw new Error("店別加題至少要指定一間適用店別。");
  }

  const { data: sortRow, error: sortError } = await admin
    .from("inspection_items")
    .select("sort_order")
    .eq("category_id", input.categoryId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sortError) {
    throw new Error(sortError.message);
  }

  const nextSortOrder = (sortRow?.sort_order ?? 0) + 10;
  const { data: createdItem, error: createError } = await admin
    .from("inspection_items")
    .insert({
      category_id: input.categoryId,
      name,
      sort_order: nextSortOrder,
      is_base: input.isBase,
      is_active: true,
    })
    .select("id")
    .single();

  if (createError || !createdItem) {
    throw new Error(createError?.message || "新增題目失敗。");
  }

  if (!input.isBase && scopedStoreIds.length > 0) {
    const { error: extraError } = await admin.from("store_extra_items").insert(
      scopedStoreIds.map((storeId) => ({
        store_id: storeId,
        item_id: createdItem.id,
      })),
    );

    if (extraError) {
      throw new Error(extraError.message);
    }
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "create_inspection_item",
    entityType: "inspection_item",
    entityId: createdItem.id,
    details: {
      name,
      category_id: input.categoryId,
      is_base: input.isBase,
      store_ids: scopedStoreIds,
    },
  });

  revalidatePath("/settings/items");
  revalidatePath("/inspection/new");
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

export async function cleanupQaTestData() {
  const profile = await requireRole("owner");
  const admin = createAdminClient();
  const preview = await collectQaCleanupPreview();
  const inspectionIds = preview.inspections.map((inspection) => inspection.id);
  const storeIds = preview.stores.map((store) => store.id);
  const staffIds = preview.staffMembers.map((staff) => staff.id);
  const userIds = preview.users.map((user) => user.id);
  const tagIds = preview.scopedTags.map((tag) => tag.id);

  if (inspectionIds.length > 0) {
    const { data: scoreRows, error: scoreError } = await admin
      .from("inspection_scores")
      .select("id")
      .in("inspection_id", inspectionIds);

    if (scoreError) {
      throw new Error(scoreError.message);
    }

    const scoreIds = (scoreRows ?? []).map((row) => row.id);
    if (scoreIds.length > 0) {
      const { data: photos, error: photoError } = await admin
        .from("inspection_photos")
        .select("photo_url")
        .in("score_id", scoreIds);

      if (photoError) {
        throw new Error(photoError.message);
      }

      const objectPaths = (photos ?? [])
        .map((photo) => getPublicObjectPath(photo.photo_url))
        .filter((value): value is string => Boolean(value));

      if (objectPaths.length > 0) {
        const { error: storageError } = await admin.storage.from("inspection-photos").remove(objectPaths);
        if (storageError) {
          throw new Error(storageError.message);
        }
      }
    }

    const { error: deleteInspectionError } = await admin.from("inspections").delete().in("id", inspectionIds);
    if (deleteInspectionError) {
      throw new Error(deleteInspectionError.message);
    }
  }

  if (tagIds.length > 0) {
    const { error } = await admin.from("focus_items").delete().in("id", tagIds);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (staffIds.length > 0) {
    const { error } = await admin.from("staff_members").delete().in("id", staffIds);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (userIds.length > 0) {
    const { error } = await admin.from("users").delete().in("id", userIds);
    if (error) {
      throw new Error(error.message);
    }
  }

  if (storeIds.length > 0) {
    const { error } = await admin.from("stores").delete().in("id", storeIds);
    if (error) {
      throw new Error(error.message);
    }
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "cleanup_qa_test_data",
    entityType: "qa_cleanup",
    entityId: new Date().toISOString(),
    details: {
      stores: preview.stores.length,
      users: preview.users.length,
      staff_members: preview.staffMembers.length,
      inspections: preview.inspections.length,
      scoped_tags: preview.scopedTags.length,
    },
  });

  revalidateStoreDependentPaths();
}
