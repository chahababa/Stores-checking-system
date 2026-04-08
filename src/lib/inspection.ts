import "server-only";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import { buildMonthlyInspectionReportStats, getMonthRange } from "@/lib/reporting";
import { createAdminClient } from "@/lib/supabase/admin";

type ShiftRole = "kitchen" | "floor" | "counter";

type PriorInspectionRow = {
  id: string;
  date: string;
  inspection_scores?: Array<{ item_id: string; score: number | null }> | null;
};

export type InspectionPhotoInput = {
  itemId: string;
  base64: string;
  contentType: string;
  fileName: string;
  isStandard: boolean;
};

export type InspectionFormSeed = {
  stores: Array<{ id: string; name: string; code: string }>;
  selectedStoreId: string;
  selectedDate: string;
  selectedMonth: string;
  activeStaff: Array<{
    id: string;
    name: string;
    position: ShiftRole;
    store_id: string;
  }>;
  groupedItems: Array<{
    categoryId: string;
    categoryName: string;
    items: Array<{
      id: string;
      name: string;
      isFocusItem: boolean;
      defaultScore: 1 | 2 | 3 | null;
      hasPrevIssue: boolean;
      consecutiveWeeks: number;
    }>;
  }>;
  duplicateInspectionWarning: boolean;
};

export type InspectionMutationInput = {
  storeId: string;
  date: string;
  timeSlot: string;
  busynessLevel: "low" | "medium" | "high";
  selectedStaff: Array<{ staffId: string; roleInShift: ShiftRole }>;
  scores: Array<{
    itemId: string;
    score: 1 | 2 | 3;
    note?: string;
    isFocusItem: boolean;
    hasPrevIssue: boolean;
    consecutiveWeeks: number;
  }>;
  menuItems: Array<{
    type: "dine_in" | "takeout";
    dishName?: string;
    portionWeight?: string;
  }>;
  legacyNote?: string;
  photos?: InspectionPhotoInput[];
};

export type InspectionDetail = {
  id: string;
  date: string;
  timeSlot: string;
  busynessLevel: "low" | "medium" | "high";
  totalScore: string;
  isEditable: boolean;
  store: { id: string; name: string } | null;
  inspector: { id: string; email: string } | null;
  staff: Array<{
    id: string;
    name: string;
    position: ShiftRole;
    roleInShift: ShiftRole;
  }>;
  scores: Array<{
    id: string;
    itemId: string;
    itemName: string;
    categoryName: string;
    score: 1 | 2 | 3;
    note: string | null;
    isFocusItem: boolean;
    hasPrevIssue: boolean;
    consecutiveWeeks: number;
    photos: Array<{
      id: string;
      photoUrl: string;
      isStandard: boolean;
    }>;
    task: {
      id: string;
      status: "pending" | "resolved" | "verified" | "superseded";
      createdAt: string;
      resolvedAt: string | null;
      verifiedAt: string | null;
    } | null;
  }>;
  menuItems: Array<{
    id: string;
    type: "dine_in" | "takeout";
    dishName: string | null;
    portionWeight: string | null;
  }>;
  legacyNotes: Array<{
    id: string;
    content: string;
    createdAt: string;
  }>;
};

export type ImprovementTaskListItem = {
  id: string;
  status: "pending" | "resolved" | "verified" | "superseded";
  createdAt: string;
  resolvedAt: string | null;
  verifiedAt: string | null;
  store: { id: string; name: string } | null;
  item: { id: string; name: string } | null;
  score: {
    id: string;
    value: 1 | 2 | 3;
    note: string | null;
    inspectionId: string;
    inspectionDate: string | null;
  } | null;
};

export type InspectionEditSeed = {
  formSeed: InspectionFormSeed;
  initialState: {
    storeId: string;
    date: string;
    timeSlot: string;
    busynessLevel: "low" | "medium" | "high";
    selectedStaff: Record<string, ShiftRole>;
    scores: Record<
      string,
      {
        score: 1 | 2 | 3 | null;
        note: string;
        isFocusItem: boolean;
        hasPrevIssue: boolean;
        consecutiveWeeks: number;
      }
    >;
    menuItems: {
      dineInDishName: string;
      dineInPortionWeight: string;
      takeoutDishName: string;
      takeoutPortionWeight: string;
    };
    legacyNote: string;
  };
};

export type MonthlyInspectionReport = {
  month: string;
  selectedStoreId: string;
  stores: Array<{ id: string; name: string }>;
  summary: {
    totalInspections: number;
    averageScore: string;
    lowScoreCount: number;
    storesCovered: number;
    pendingTasks: number;
    verifiedTasks: number;
  };
  topProblemItems: Array<{
    itemId: string;
    itemName: string;
    occurrences: number;
    averageScore: string;
  }>;
  storeBreakdown: Array<{
    storeId: string;
    storeName: string;
    inspections: number;
    averageScore: string;
    lowScoreCount: number;
  }>;
};

export type AuditLogListItem = {
  id: string;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown>;
  createdAt: string;
};

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

function normalizeDate(value: string) {
  return new Date(`${value}T00:00:00`);
}

function calculateWeekSpan(fromDate: string, toDate: string) {
  const diffMs = normalizeDate(toDate).getTime() - normalizeDate(fromDate).getTime();
  return Math.max(1, Math.ceil(diffMs / ONE_WEEK_MS));
}

function buildPreviousIssueMap(inspections: PriorInspectionRow[], selectedDate: string) {
  const previousIssues = new Map<string, { consecutiveWeeks: number }>();
  if (inspections.length === 0) {
    return previousIssues;
  }

  const latestInspection = inspections[0];
  const latestLowScores = (latestInspection.inspection_scores ?? []).filter((row) => (row.score ?? 3) <= 2);

  for (const latestRow of latestLowScores) {
    let firstLowDate = latestInspection.date;

    for (let index = 1; index < inspections.length; index += 1) {
      const inspection = inspections[index];
      const matchingScore = (inspection.inspection_scores ?? []).find((score) => score.item_id === latestRow.item_id);

      if (!matchingScore) {
        break;
      }

      if ((matchingScore.score ?? 3) <= 2) {
        firstLowDate = inspection.date;
        continue;
      }

      break;
    }

    previousIssues.set(latestRow.item_id, {
      consecutiveWeeks: calculateWeekSpan(firstLowDate, selectedDate),
    });
  }

  return previousIssues;
}

function mapSingleRelation<T extends Record<string, unknown>>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

async function getStoreCode(admin: ReturnType<typeof createAdminClient>, storeId: string) {
  const { data: storeRow, error: storeError } = await admin.from("stores").select("code").eq("id", storeId).single();

  if (storeError || !storeRow) {
    throw new Error(storeError?.message || "Store not found.");
  }

  return storeRow.code;
}

function validateInspectionInput(input: InspectionMutationInput) {
  const missingFocus = input.scores.filter((item) => item.isFocusItem && !item.score);
  if (missingFocus.length > 0) {
    throw new Error("All focus items must be scored before saving.");
  }

  const invalidScores = input.scores.filter((item) => item.score <= 2 && !item.note?.trim());
  if (invalidScores.length > 0) {
    throw new Error("Scores of 1 or 2 require a note.");
  }
}

function calculateTotalScore(scores: InspectionMutationInput["scores"]) {
  return scores.length > 0 ? (scores.reduce((sum, item) => sum + item.score, 0) / scores.length).toFixed(2) : "0.00";
}

async function syncImprovementTaskForScore(params: {
  admin: ReturnType<typeof createAdminClient>;
  profileId: string;
  scoreId: string;
  storeId: string;
  itemId: string;
  score: 1 | 2 | 3;
}) {
  const { admin, profileId, scoreId, storeId, itemId, score } = params;
  const { data: existingTask, error: taskQueryError } = await admin
    .from("improvement_tasks")
    .select("id, status")
    .eq("score_id", scoreId)
    .maybeSingle();

  if (taskQueryError) {
    throw new Error(taskQueryError.message);
  }

  if (score <= 2) {
    if (existingTask) {
      const { error } = await admin
        .from("improvement_tasks")
        .update({
          status: "pending",
          resolved_at: null,
          resolved_by: null,
          verified_at: null,
        })
        .eq("id", existingTask.id);
      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await admin.from("improvement_tasks").insert({
        score_id: scoreId,
        store_id: storeId,
        item_id: itemId,
        status: "pending",
      });
      if (error) {
        throw new Error(error.message);
      }
    }

    return;
  }

  if (existingTask && existingTask.status !== "verified") {
    const now = new Date().toISOString();
    const { error } = await admin
      .from("improvement_tasks")
      .update({
        status: "verified",
        resolved_at: now,
        resolved_by: profileId,
        verified_at: now,
      })
      .eq("id", existingTask.id);

    if (error) {
      throw new Error(error.message);
    }
  }
}

async function uploadInspectionPhotos(params: {
  admin: ReturnType<typeof createAdminClient>;
  storeCode: string;
  date: string;
  photos: InspectionPhotoInput[];
  scoreIdByItemId: Map<string, string>;
}) {
  const { admin, storeCode, date, photos, scoreIdByItemId } = params;
  const validPhotos = photos.filter((photo) => photo.base64 && scoreIdByItemId.has(photo.itemId));

  if (validPhotos.length === 0) {
    return;
  }

  const photoRows: Array<{ score_id: string; photo_url: string; is_standard: boolean }> = [];

  for (const photo of validPhotos) {
    const scoreId = scoreIdByItemId.get(photo.itemId);
    if (!scoreId) {
      continue;
    }

    const objectPath = `${storeCode}/${date}/${photo.itemId}/${photo.fileName}`;
    const buffer = Buffer.from(photo.base64, "base64");

    const { error: uploadError } = await admin.storage.from("inspection-photos").upload(objectPath, buffer, {
      contentType: photo.contentType,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = admin.storage.from("inspection-photos").getPublicUrl(objectPath);
    photoRows.push({
      score_id: scoreId,
      photo_url: publicUrlData.publicUrl,
      is_standard: photo.isStandard,
    });
  }

  if (photoRows.length > 0) {
    const { error } = await admin.from("inspection_photos").insert(photoRows);
    if (error) {
      throw new Error(error.message);
    }
  }
}

function getPublicObjectPath(photoUrl: string) {
  const marker = "/object/public/inspection-photos/";
  const markerIndex = photoUrl.indexOf(marker);
  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(photoUrl.slice(markerIndex + marker.length));
}

export async function getInspectionFormSeed(params?: { storeId?: string; date?: string }) {
  await requireRole("owner", "manager");
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const month = today.slice(0, 7);

  const { data: stores, error: storesError } = await admin.from("stores").select("id, name, code").order("name");

  if (storesError || !stores?.length) {
    throw new Error(storesError?.message || "No stores configured.");
  }

  const selectedStoreId = params?.storeId || stores[0].id;
  const selectedDate = params?.date || today;
  const selectedMonth = selectedDate.slice(0, 7) || month;

  const [
    { data: staff, error: staffError },
    { data: categories, error: categoriesError },
    { data: items, error: itemsError },
    { data: focusRows, error: focusError },
    { data: recentInspections, error: inspectionsError },
    { data: duplicateRows, error: duplicateError },
    extraAssignments,
  ] = await Promise.all([
    admin
      .from("staff_members")
      .select("id, name, position, store_id")
      .eq("status", "active")
      .eq("store_id", selectedStoreId)
      .order("name"),
    admin.from("categories").select("id, name, sort_order").order("sort_order"),
    admin
      .from("inspection_items")
      .select("id, name, category_id, sort_order, is_base, is_active")
      .eq("is_active", true)
      .order("sort_order"),
    admin
      .from("focus_items")
      .select("item_id, type, month")
      .or(`type.eq.permanent,and(type.eq.monthly,month.eq.${selectedMonth})`),
    admin
      .from("inspections")
      .select("id, date, inspection_scores(item_id, score)")
      .eq("store_id", selectedStoreId)
      .lt("date", selectedDate)
      .order("date", { ascending: false })
      .limit(30),
    admin.from("inspections").select("id").eq("store_id", selectedStoreId).eq("date", selectedDate),
    admin.from("store_extra_items").select("item_id").eq("store_id", selectedStoreId),
  ]);

  if (staffError || categoriesError || itemsError || focusError || inspectionsError || duplicateError) {
    throw new Error(
      staffError?.message ||
        categoriesError?.message ||
        itemsError?.message ||
        focusError?.message ||
        inspectionsError?.message ||
        duplicateError?.message ||
        "Failed to load inspection form data.",
    );
  }

  if (extraAssignments.error) {
    throw new Error(extraAssignments.error.message);
  }

  const extraItemIds = new Set((extraAssignments.data ?? []).map((row) => row.item_id));
  const allowedItems = (items ?? []).filter((item) => item.is_base || extraItemIds.has(item.id));
  const focusIds = new Set((focusRows ?? []).map((row) => row.item_id));
  const prevIssueMap = buildPreviousIssueMap((recentInspections ?? []) as PriorInspectionRow[], selectedDate);

  const groupedItems = (categories ?? [])
    .map((category) => {
      const categoryItems = allowedItems
        .filter((item) => item.category_id === category.id)
        .map((item) => {
          const previousIssue = prevIssueMap.get(item.id);
          const isFocusItem = focusIds.has(item.id);

          return {
            id: item.id,
            name: item.name,
            isFocusItem,
            defaultScore: isFocusItem ? null : (3 as const),
            hasPrevIssue: Boolean(previousIssue),
            consecutiveWeeks: previousIssue?.consecutiveWeeks ?? 0,
          };
        });

      return {
        categoryId: category.id,
        categoryName: category.name,
        items: categoryItems,
      };
    })
    .filter((group) => group.items.length > 0);

  return {
    stores,
    selectedStoreId,
    selectedDate,
    selectedMonth,
    activeStaff: staff ?? [],
    groupedItems,
    duplicateInspectionWarning: Boolean(duplicateRows?.length),
  } satisfies InspectionFormSeed;
}

export async function getInspectionDetail(inspectionId: string): Promise<InspectionDetail> {
  const profile = await requireRole("owner", "manager", "leader");
  const admin = createAdminClient();

  const { data: inspectionRow, error: inspectionError } = await admin
    .from("inspections")
    .select("id, date, time_slot, busyness_level, total_score, is_editable, store_id, stores(id, name), users(id, email)")
    .eq("id", inspectionId)
    .maybeSingle();

  if (inspectionError || !inspectionRow) {
    throw new Error(inspectionError?.message || "Inspection not found.");
  }

  if (profile.role === "leader" && inspectionRow.store_id !== profile.store_id) {
    throw new Error("You do not have access to this inspection.");
  }

  const [
    { data: staffRows, error: staffError },
    { data: scoreRows, error: scoreError },
    { data: menuRows, error: menuError },
    { data: legacyRows, error: legacyError },
  ] = await Promise.all([
    admin
      .from("inspection_staff")
      .select("id, role_in_shift, staff_members(id, name, position)")
      .eq("inspection_id", inspectionId),
    admin
      .from("inspection_scores")
      .select(
        "id, item_id, score, note, is_focus_item, has_prev_issue, consecutive_weeks, inspection_items(name, categories(name)), improvement_tasks(id, status, created_at, resolved_at, verified_at)",
      )
      .eq("inspection_id", inspectionId),
    admin
      .from("inspection_menu_items")
      .select("id, type, dish_name, portion_weight")
      .eq("inspection_id", inspectionId)
      .order("type"),
    admin
      .from("legacy_notes")
      .select("id, content, created_at")
      .eq("inspection_id", inspectionId)
      .order("created_at", { ascending: true }),
  ]);

  if (staffError || scoreError || menuError || legacyError) {
    throw new Error(
      staffError?.message || scoreError?.message || menuError?.message || legacyError?.message || "Failed to load inspection detail.",
    );
  }

  const scoreIds = (scoreRows ?? []).map((row) => row.id);
  const { data: photoRows, error: photoError } = scoreIds.length
    ? await admin
        .from("inspection_photos")
        .select("id, score_id, photo_url, is_standard")
        .in("score_id", scoreIds)
        .order("created_at")
    : { data: [], error: null };

  if (photoError) {
    throw new Error(photoError.message);
  }

  const photosByScoreId = new Map<string, Array<{ id: string; photoUrl: string; isStandard: boolean }>>();
  for (const photo of photoRows ?? []) {
    const entry = photosByScoreId.get(photo.score_id) ?? [];
    entry.push({
      id: photo.id,
      photoUrl: photo.photo_url,
      isStandard: photo.is_standard,
    });
    photosByScoreId.set(photo.score_id, entry);
  }

  return {
    id: inspectionRow.id,
    date: inspectionRow.date,
    timeSlot: inspectionRow.time_slot,
    busynessLevel: inspectionRow.busyness_level,
    totalScore: inspectionRow.total_score,
    isEditable: inspectionRow.is_editable,
    store: mapSingleRelation(inspectionRow.stores),
    inspector: mapSingleRelation(inspectionRow.users),
    staff: (staffRows ?? []).flatMap((row) => {
      const member = mapSingleRelation(row.staff_members);
      if (!member) {
        return [];
      }

      return [
        {
          id: member.id as string,
          name: member.name as string,
          position: member.position as ShiftRole,
          roleInShift: row.role_in_shift,
        },
      ];
    }),
    scores: (scoreRows ?? []).map((row) => {
      const item = mapSingleRelation(row.inspection_items) as { name?: string; categories?: unknown } | null;
      const category = (item ? mapSingleRelation(item.categories as never) : null) as { name?: string } | null;
      const task = mapSingleRelation(row.improvement_tasks);

      return {
        id: row.id,
        itemId: row.item_id,
        itemName: (item?.name as string | undefined) ?? "Unknown Item",
        categoryName: (category?.name as string | undefined) ?? "Uncategorized",
        score: row.score,
        note: row.note,
        isFocusItem: row.is_focus_item,
        hasPrevIssue: row.has_prev_issue,
        consecutiveWeeks: row.consecutive_weeks,
        photos: photosByScoreId.get(row.id) ?? [],
        task: task
          ? {
              id: task.id as string,
              status: task.status as ImprovementTaskListItem["status"],
              createdAt: task.created_at as string,
              resolvedAt: (task.resolved_at as string | null | undefined) ?? null,
              verifiedAt: (task.verified_at as string | null | undefined) ?? null,
            }
          : null,
      };
    }),
    menuItems: (menuRows ?? []).map((row) => ({
      id: row.id,
      type: row.type,
      dishName: row.dish_name,
      portionWeight: row.portion_weight,
    })),
    legacyNotes: (legacyRows ?? []).map((row) => ({
      id: row.id,
      content: row.content,
      createdAt: row.created_at,
    })),
  };
}

export async function getInspectionEditSeed(inspectionId: string): Promise<InspectionEditSeed> {
  await requireRole("owner", "manager");
  const detail = await getInspectionDetail(inspectionId);
  if (!detail.isEditable) {
    throw new Error("This inspection is locked and can no longer be edited.");
  }
  const formSeed = await getInspectionFormSeed({
    storeId: detail.store?.id ?? undefined,
    date: detail.date,
  });

  const selectedStaff = Object.fromEntries(detail.staff.map((member) => [member.id, member.roleInShift]));
  const scoreMap = Object.fromEntries(
    formSeed.groupedItems.flatMap((group) =>
      group.items.map((item) => {
        const saved = detail.scores.find((entry) => entry.itemId === item.id);
        return [
          item.id,
          {
            score: saved?.score ?? item.defaultScore,
            note: saved?.note ?? "",
            isFocusItem: item.isFocusItem,
            hasPrevIssue: saved?.hasPrevIssue ?? item.hasPrevIssue,
            consecutiveWeeks: saved?.consecutiveWeeks ?? item.consecutiveWeeks,
          },
        ];
      }),
    ),
  );

  const dineIn = detail.menuItems.find((item) => item.type === "dine_in");
  const takeout = detail.menuItems.find((item) => item.type === "takeout");

  return {
    formSeed: {
      ...formSeed,
      duplicateInspectionWarning: false,
    },
    initialState: {
      storeId: detail.store?.id ?? formSeed.selectedStoreId,
      date: detail.date,
      timeSlot: detail.timeSlot,
      busynessLevel: detail.busynessLevel,
      selectedStaff,
      scores: scoreMap,
      menuItems: {
        dineInDishName: dineIn?.dishName ?? "",
        dineInPortionWeight: dineIn?.portionWeight ?? "",
        takeoutDishName: takeout?.dishName ?? "",
        takeoutPortionWeight: takeout?.portionWeight ?? "",
      },
      legacyNote: detail.legacyNotes.map((note) => note.content).join("\n\n"),
    },
  };
}

export async function getImprovementTasks(): Promise<ImprovementTaskListItem[]> {
  const profile = await requireRole("owner", "manager", "leader");
  const admin = createAdminClient();
  let query = admin
    .from("improvement_tasks")
    .select(
      "id, status, created_at, resolved_at, verified_at, store_id, item_id, stores(id, name), inspection_items(id, name), inspection_scores(id, score, note, inspection_id, inspections(date))",
    )
    .order("created_at", { ascending: false });

  if (profile.role === "leader" && profile.store_id) {
    query = query.eq("store_id", profile.store_id);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => {
    const store = mapSingleRelation(row.stores);
    const item = mapSingleRelation(row.inspection_items);
    const score = mapSingleRelation(row.inspection_scores) as
      | { id?: string; score?: 1 | 2 | 3; note?: string | null; inspection_id?: string; inspections?: unknown }
      | null;
    const inspection = (score ? mapSingleRelation(score.inspections as never) : null) as { date?: string } | null;

    return {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
      verifiedAt: row.verified_at,
      store: store
        ? {
            id: store.id as string,
            name: store.name as string,
          }
        : null,
      item: item
        ? {
            id: item.id as string,
            name: item.name as string,
          }
        : null,
      score: score
        ? {
            id: score.id as string,
            value: score.score as 1 | 2 | 3,
            note: (score.note as string | null | undefined) ?? null,
            inspectionId: score.inspection_id as string,
            inspectionDate: (inspection?.date as string | undefined) ?? null,
          }
        : null,
    };
  });
}

export async function updateImprovementTaskStatus(input: {
  id: string;
  status: "pending" | "resolved" | "verified" | "superseded";
}) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();

  const payload: {
    status: "pending" | "resolved" | "verified" | "superseded";
    resolved_at?: string | null;
    resolved_by?: string | null;
    verified_at?: string | null;
  } = {
    status: input.status,
  };

  if (input.status === "resolved") {
    payload.resolved_at = new Date().toISOString();
    payload.resolved_by = profile.id;
    payload.verified_at = null;
  } else if (input.status === "verified") {
    payload.verified_at = new Date().toISOString();
  } else if (input.status === "pending" || input.status === "superseded") {
    payload.resolved_at = null;
    payload.resolved_by = null;
    payload.verified_at = null;
  }

  const { error } = await admin.from("improvement_tasks").update(payload).eq("id", input.id);
  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "update_improvement_task_status",
    entityType: "improvement_task",
    entityId: input.id,
    details: {
      status: input.status,
    },
  });

  revalidatePath("/inspection/improvements");
}

export async function setInspectionEditable(inspectionId: string, isEditable: boolean) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();

  const { error } = await admin.from("inspections").update({ is_editable: isEditable }).eq("id", inspectionId);
  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: isEditable ? "unlock_inspection" : "lock_inspection",
    entityType: "inspection",
    entityId: inspectionId,
  });

  revalidatePath("/inspection/history");
  revalidatePath(`/inspection/history/${inspectionId}`);
  revalidatePath(`/inspection/history/${inspectionId}/edit`);
}

export async function deleteInspection(inspectionId: string) {
  const profile = await requireRole("owner");
  const admin = createAdminClient();

  const { data: scores, error: scoresError } = await admin.from("inspection_scores").select("id").eq("inspection_id", inspectionId);
  if (scoresError) {
    throw new Error(scoresError.message);
  }

  const scoreIds = (scores ?? []).map((row) => row.id);
  if (scoreIds.length > 0) {
    const { data: photos, error: photosError } = await admin
      .from("inspection_photos")
      .select("id, photo_url")
      .in("score_id", scoreIds);

    if (photosError) {
      throw new Error(photosError.message);
    }

    const objectPaths = (photos ?? []).map((photo) => getPublicObjectPath(photo.photo_url)).filter(Boolean) as string[];
    if (objectPaths.length > 0) {
      const { error: storageError } = await admin.storage.from("inspection-photos").remove(objectPaths);
      if (storageError) {
        throw new Error(storageError.message);
      }
    }
  }

  const { error } = await admin.from("inspections").delete().eq("id", inspectionId);
  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "delete_inspection",
    entityType: "inspection",
    entityId: inspectionId,
  });

  revalidatePath("/inspection/history");
  revalidatePath("/inspection/improvements");
  revalidatePath("/inspection/reports");
}

export async function setInspectionPhotoStandard(photoId: string, isStandard: boolean) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();

  const { data: photo, error: photoError } = await admin
    .from("inspection_photos")
    .select("id, score_id")
    .eq("id", photoId)
    .maybeSingle();

  if (photoError || !photo) {
    throw new Error(photoError?.message || "Photo not found.");
  }

  if (isStandard) {
    const { error: resetError } = await admin
      .from("inspection_photos")
      .update({ is_standard: false })
      .eq("score_id", photo.score_id);
    if (resetError) {
      throw new Error(resetError.message);
    }
  }

  const { error } = await admin.from("inspection_photos").update({ is_standard: isStandard }).eq("id", photoId);
  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "set_inspection_photo_standard",
    entityType: "inspection_photo",
    entityId: photoId,
    details: {
      is_standard: isStandard,
    },
  });

  revalidatePath("/inspection/history");
}

export async function deleteInspectionPhoto(photoId: string) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();

  const { data: photo, error: photoError } = await admin
    .from("inspection_photos")
    .select("id, photo_url")
    .eq("id", photoId)
    .maybeSingle();

  if (photoError || !photo) {
    throw new Error(photoError?.message || "Photo not found.");
  }

  const objectPath = getPublicObjectPath(photo.photo_url);
  if (objectPath) {
    const { error: storageError } = await admin.storage.from("inspection-photos").remove([objectPath]);
    if (storageError) {
      throw new Error(storageError.message);
    }
  }

  const { error } = await admin.from("inspection_photos").delete().eq("id", photoId);
  if (error) {
    throw new Error(error.message);
  }

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "delete_inspection_photo",
    entityType: "inspection_photo",
    entityId: photoId,
  });

  revalidatePath("/inspection/history");
}

export async function getInspectionMonthlyReport(params?: {
  month?: string;
  storeId?: string;
}): Promise<MonthlyInspectionReport> {
  const profile = await requireRole("owner", "manager", "leader");
  const admin = createAdminClient();
  const month = params?.month || new Date().toISOString().slice(0, 7);
  const { start, end } = getMonthRange(month);
  const selectedStoreId = profile.role === "leader" ? profile.store_id! : params?.storeId || "";

  const storesQuery = admin.from("stores").select("id, name").order("name");
  let inspectionsQuery = admin
    .from("inspections")
    .select("id, store_id, total_score, stores(id, name)")
    .gte("date", start)
    .lt("date", end);

  if (profile.role === "leader") {
    inspectionsQuery = inspectionsQuery.eq("store_id", profile.store_id!);
  } else if (selectedStoreId) {
    inspectionsQuery = inspectionsQuery.eq("store_id", selectedStoreId);
  }

  const [{ data: stores, error: storesError }, { data: inspections, error: inspectionsError }] = await Promise.all([
    profile.role === "leader" ? storesQuery.eq("id", profile.store_id!) : storesQuery,
    inspectionsQuery,
  ]);

  if (storesError || inspectionsError) {
    throw new Error(storesError?.message || inspectionsError?.message || "Failed to load monthly report.");
  }

  const inspectionIds = (inspections ?? []).map((inspection) => inspection.id);
  const { data: lowScores, error: lowScoresError } = inspectionIds.length
    ? await admin
        .from("inspection_scores")
        .select("id, item_id, score, inspection_id, inspection_items(name)")
        .in("inspection_id", inspectionIds)
        .lte("score", 2)
    : { data: [], error: null };

  if (lowScoresError) {
    throw new Error(lowScoresError.message);
  }

  const lowScoreIds = (lowScores ?? []).map((row) => row.id);
  const { data: relatedTasks, error: tasksError } = lowScoreIds.length
    ? await admin.from("improvement_tasks").select("id, status, score_id").in("score_id", lowScoreIds)
    : { data: [], error: null };

  if (tasksError) {
    throw new Error(tasksError.message);
  }
  const stats = buildMonthlyInspectionReportStats({
    inspections: (inspections ?? []).map((inspection) => {
      const relation = mapSingleRelation(inspection.stores) as { name?: string } | null;
      return {
        id: inspection.id,
        storeId: inspection.store_id,
        storeName: relation?.name ?? "Unknown Store",
        totalScore: Number(inspection.total_score ?? 0),
      };
    }),
    lowScores: (lowScores ?? []).map((row) => {
      const relation = mapSingleRelation(row.inspection_items) as { name?: string } | null;
      return {
        itemId: row.item_id,
        itemName: relation?.name ?? "Unknown Item",
        score: row.score,
        inspectionId: row.inspection_id,
      };
    }),
    relatedTasks: (relatedTasks ?? []).map((task) => ({
      status: task.status,
    })),
  });

  return {
    month,
    selectedStoreId,
    stores: stores ?? [],
    summary: stats.summary,
    topProblemItems: stats.topProblemItems,
    storeBreakdown: stats.storeBreakdown,
  };
}

export async function createInspection(input: InspectionMutationInput) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();

  validateInspectionInput(input);
  const storeCode = await getStoreCode(admin, input.storeId);
  const totalScore = calculateTotalScore(input.scores);

  const { data: inspection, error: inspectionError } = await admin
    .from("inspections")
    .insert({
      store_id: input.storeId,
      inspector_id: profile.id,
      date: input.date,
      time_slot: input.timeSlot,
      busyness_level: input.busynessLevel,
      total_score: totalScore,
    })
    .select("id")
    .single();

  if (inspectionError || !inspection) {
    throw new Error(inspectionError?.message || "Failed to create inspection.");
  }

  if (input.selectedStaff.length > 0) {
    const { error } = await admin.from("inspection_staff").insert(
      input.selectedStaff.map((entry) => ({
        inspection_id: inspection.id,
        staff_id: entry.staffId,
        role_in_shift: entry.roleInShift,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  const { data: scoreRows, error: scoresError } = await admin
    .from("inspection_scores")
    .insert(
      input.scores.map((entry) => ({
        inspection_id: inspection.id,
        item_id: entry.itemId,
        score: entry.score,
        note: entry.note?.trim() || null,
        is_focus_item: entry.isFocusItem,
        has_prev_issue: entry.hasPrevIssue,
        consecutive_weeks: entry.score <= 2 ? entry.consecutiveWeeks : 0,
      })),
    )
    .select("id, item_id, score");

  if (scoresError) {
    throw new Error(scoresError.message);
  }

  const scoreIdByItemId = new Map((scoreRows ?? []).map((row) => [row.item_id, row.id]));
  const lowScoreRows = (scoreRows ?? []).filter((entry) => entry.score <= 2);

  if (lowScoreRows.length > 0) {
    const { error } = await admin.from("improvement_tasks").insert(
      lowScoreRows.map((entry) => ({
        score_id: entry.id,
        store_id: input.storeId,
        item_id: entry.item_id,
        status: "pending" as const,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  const validMenuItems = input.menuItems.filter((item) => item.dishName?.trim() || item.portionWeight?.trim());
  if (validMenuItems.length > 0) {
    const { error } = await admin.from("inspection_menu_items").insert(
      validMenuItems.map((item) => ({
        inspection_id: inspection.id,
        type: item.type,
        dish_name: item.dishName?.trim() || null,
        portion_weight: item.portionWeight?.trim() || null,
      })),
    );

    if (error) {
      throw new Error(error.message);
    }
  }

  if (input.legacyNote?.trim()) {
    const { error } = await admin.from("legacy_notes").insert({
      inspection_id: inspection.id,
      content: input.legacyNote.trim(),
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  await uploadInspectionPhotos({
    admin,
    storeCode,
    date: input.date,
    photos: input.photos ?? [],
    scoreIdByItemId,
  });

  revalidatePath("/inspection/history");
  revalidatePath(`/inspection/history/${inspection.id}`);
  revalidatePath("/inspection/improvements");

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "create_inspection",
    entityType: "inspection",
    entityId: inspection.id,
    details: {
      store_id: input.storeId,
      date: input.date,
      total_score: totalScore,
    },
  });

  return { success: true as const, inspectionId: inspection.id };
}

export async function updateInspection(inspectionId: string, input: InspectionMutationInput) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();

  validateInspectionInput(input);

  const { data: existingInspection, error: inspectionQueryError } = await admin
    .from("inspections")
    .select("id, store_id, is_editable")
    .eq("id", inspectionId)
    .maybeSingle();

  if (inspectionQueryError || !existingInspection) {
    throw new Error(inspectionQueryError?.message || "Inspection not found.");
  }
  if (!existingInspection.is_editable) {
    throw new Error("This inspection is locked and can no longer be edited.");
  }

  const storeCode = await getStoreCode(admin, input.storeId);
  const totalScore = calculateTotalScore(input.scores);

  const { error: inspectionUpdateError } = await admin
    .from("inspections")
    .update({
      store_id: input.storeId,
      date: input.date,
      time_slot: input.timeSlot,
      busyness_level: input.busynessLevel,
      total_score: totalScore,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inspectionId);

  if (inspectionUpdateError) {
    throw new Error(inspectionUpdateError.message);
  }

  const { data: existingScores, error: existingScoresError } = await admin
    .from("inspection_scores")
    .select("id, item_id")
    .eq("inspection_id", inspectionId);

  if (existingScoresError) {
    throw new Error(existingScoresError.message);
  }

  const existingScoreByItemId = new Map((existingScores ?? []).map((row) => [row.item_id, row.id]));
  const nextItemIds = new Set(input.scores.map((entry) => entry.itemId));
  const scoreIdByItemId = new Map<string, string>();

  for (const entry of input.scores) {
    const existingScoreId = existingScoreByItemId.get(entry.itemId);

    if (existingScoreId) {
      const { error } = await admin
        .from("inspection_scores")
        .update({
          score: entry.score,
          note: entry.note?.trim() || null,
          is_focus_item: entry.isFocusItem,
          has_prev_issue: entry.hasPrevIssue,
          consecutive_weeks: entry.score <= 2 ? entry.consecutiveWeeks : 0,
        })
        .eq("id", existingScoreId);

      if (error) {
        throw new Error(error.message);
      }

      scoreIdByItemId.set(entry.itemId, existingScoreId);
    } else {
      const { data: insertedScore, error } = await admin
        .from("inspection_scores")
        .insert({
          inspection_id: inspectionId,
          item_id: entry.itemId,
          score: entry.score,
          note: entry.note?.trim() || null,
          is_focus_item: entry.isFocusItem,
          has_prev_issue: entry.hasPrevIssue,
          consecutive_weeks: entry.score <= 2 ? entry.consecutiveWeeks : 0,
        })
        .select("id")
        .single();

      if (error || !insertedScore) {
        throw new Error(error?.message || "Failed to insert score.");
      }

      scoreIdByItemId.set(entry.itemId, insertedScore.id);
    }
  }

  const scoreIdsToDelete = (existingScores ?? []).filter((row) => !nextItemIds.has(row.item_id)).map((row) => row.id);
  if (scoreIdsToDelete.length > 0) {
    const { error } = await admin.from("inspection_scores").delete().in("id", scoreIdsToDelete);
    if (error) {
      throw new Error(error.message);
    }
  }

  const { error: staffDeleteError } = await admin.from("inspection_staff").delete().eq("inspection_id", inspectionId);
  if (staffDeleteError) {
    throw new Error(staffDeleteError.message);
  }

  if (input.selectedStaff.length > 0) {
    const { error } = await admin.from("inspection_staff").insert(
      input.selectedStaff.map((entry) => ({
        inspection_id: inspectionId,
        staff_id: entry.staffId,
        role_in_shift: entry.roleInShift,
      })),
    );
    if (error) {
      throw new Error(error.message);
    }
  }

  const { error: menuDeleteError } = await admin.from("inspection_menu_items").delete().eq("inspection_id", inspectionId);
  if (menuDeleteError) {
    throw new Error(menuDeleteError.message);
  }

  const validMenuItems = input.menuItems.filter((item) => item.dishName?.trim() || item.portionWeight?.trim());
  if (validMenuItems.length > 0) {
    const { error } = await admin.from("inspection_menu_items").insert(
      validMenuItems.map((item) => ({
        inspection_id: inspectionId,
        type: item.type,
        dish_name: item.dishName?.trim() || null,
        portion_weight: item.portionWeight?.trim() || null,
      })),
    );
    if (error) {
      throw new Error(error.message);
    }
  }

  const { error: notesDeleteError } = await admin.from("legacy_notes").delete().eq("inspection_id", inspectionId);
  if (notesDeleteError) {
    throw new Error(notesDeleteError.message);
  }

  if (input.legacyNote?.trim()) {
    const noteChunks = input.legacyNote
      .split(/\n{2,}/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);

    if (noteChunks.length > 0) {
      const { error } = await admin.from("legacy_notes").insert(
        noteChunks.map((content) => ({
          inspection_id: inspectionId,
          content,
        })),
      );
      if (error) {
        throw new Error(error.message);
      }
    }
  }

  for (const entry of input.scores) {
    const scoreId = scoreIdByItemId.get(entry.itemId);
    if (!scoreId) {
      continue;
    }

    await syncImprovementTaskForScore({
      admin,
      profileId: profile.id,
      scoreId,
      storeId: input.storeId,
      itemId: entry.itemId,
      score: entry.score,
    });
  }

  await uploadInspectionPhotos({
    admin,
    storeCode,
    date: input.date,
    photos: input.photos ?? [],
    scoreIdByItemId,
  });

  revalidatePath("/inspection/history");
  revalidatePath(`/inspection/history/${inspectionId}`);
  revalidatePath(`/inspection/history/${inspectionId}/edit`);
  revalidatePath("/inspection/improvements");

  await createAuditLog({
    actorId: profile.id,
    actorEmail: profile.email,
    action: "update_inspection",
    entityType: "inspection",
    entityId: inspectionId,
    details: {
      store_id: input.storeId,
      date: input.date,
      total_score: totalScore,
    },
  });

  return { success: true as const, inspectionId };
}

export async function getAuditLogs(limit = 100): Promise<AuditLogListItem[]> {
  await requireRole("owner", "manager");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("audit_logs")
    .select("id, actor_email, action, entity_type, entity_id, details, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    actorEmail: row.actor_email,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    details: (row.details as Record<string, unknown> | null) ?? {},
    createdAt: row.created_at,
  }));
}
