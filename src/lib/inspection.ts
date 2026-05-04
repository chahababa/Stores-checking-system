import "server-only";

import { revalidatePath } from "next/cache";

import { createAuditLog } from "@/lib/audit";
import { requireRole } from "@/lib/auth";
import {
  buildNotionImprovementTaskSyncInput,
  canTransitionImprovementTaskStatus,
  type ImprovementStatus,
} from "@/lib/improvement-workflow";
import { upsertNotionImprovementTask } from "@/lib/notion-improvement-sync";
import { buildMonthlyInspectionReportStats, getMonthRange } from "@/lib/reporting";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhotoDisplayUrl } from "@/lib/photo-display-url";

type ShiftRole = "kitchen" | "floor" | "counter";
type InspectionTagType = "critical" | "monthly_attention" | "complaint_watch";
type WorkstationSummary = {
  id: string;
  code: string;
  name: string;
  area: ShiftRole;
  storeId: string | null;
};

type ActiveStaffSummary = {
  id: string;
  name: string;
  store_id: string;
  defaultWorkstationId: string | null;
};

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
  workstations: WorkstationSummary[];
  activeStaff: Array<{
    id: string;
    name: string;
    store_id: string;
    defaultWorkstationId: string | null;
  }>;
  groupedItems: Array<{
    categoryId: string;
    categoryName: string;
    items: Array<{
      id: string;
      name: string;
      isFocusItem: boolean;
      tagTypes: InspectionTagType[];
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
  selectedStaff: Array<{ staffId: string; workstationId: string }>;
  scores: Array<{
    itemId: string;
    score: 1 | 2 | 3;
    note?: string;
    isFocusItem: boolean;
    tagTypes: InspectionTagType[];
    hasPrevIssue: boolean;
    consecutiveWeeks: number;
  }>;
  menuItems: Array<{
    type: "dine_in" | "takeout";
    dishName?: string;
    portionWeight?: string;
    observationNote?: string;
    photoUrl?: string;
    photo?: {
      base64: string;
      contentType: string;
      fileName: string;
    };
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
  inspector: { id: string; email: string; name: string | null } | null;
  staff: Array<{
    id: string;
    name: string;
    workstationId: string;
    workstationName: string;
    workstationArea: ShiftRole;
  }>;
  scores: Array<{
    id: string;
    itemId: string;
    itemName: string;
    categoryName: string;
    score: 1 | 2 | 3;
    note: string | null;
    isFocusItem: boolean;
    tagTypes: InspectionTagType[];
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
    observationNote: string | null;
    photoUrl: string | null;
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
    isFocusItem: boolean;
    tagTypes: InspectionTagType[];
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
    selectedStaff: Record<string, string>;
    scores: Record<
      string,
      {
        score: 1 | 2 | 3 | null;
        note: string;
        isFocusItem: boolean;
        tagTypes: InspectionTagType[];
        hasPrevIssue: boolean;
        consecutiveWeeks: number;
      }
    >;
    menuItems: {
      dineInDishName: string;
      dineInPortionWeight: string;
      dineInObservationNote: string;
      dineInPhotoUrl: string;
      takeoutDishName: string;
      takeoutPortionWeight: string;
      takeoutObservationNote: string;
      takeoutPhotoUrl: string;
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
    overallGrade: "A" | "B" | "C" | null;
    gradeCounts: {
      a: number;
      b: number;
      c: number;
    };
    lowScoreCount: number;
    storesCovered: number;
    pendingTasks: number;
    verifiedTasks: number;
    tagIssueCounts: {
      critical: number;
      monthlyAttention: number;
      complaintWatch: number;
    };
  };
  topProblemItems: Array<{
    itemId: string;
    itemName: string;
    occurrences: number;
    averageScore: string;
    averageGrade: "A" | "B" | "C";
  }>;
  categoryBreakdown: Array<{
    categoryName: string;
    averageScore: string;
    grade: "A" | "B" | "C";
    itemCount: number;
    attentionCount: number;
    counts: {
      a: number;
      b: number;
      c: number;
    };
  }>;
  storeBreakdown: Array<{
    storeId: string;
    storeName: string;
    inspections: number;
    averageScore: string;
    overallGrade: "A" | "B" | "C";
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
const MENU_ITEM_PHOTO_NEGATIVE_CACHE_TTL_MS = 60 * 1000;
let menuItemPhotoSupportCache: boolean | null = null;
let menuItemPhotoSupportNegativeCachedAt = 0;
const LEGACY_WORKSTATIONS: WorkstationSummary[] = [
  { id: "legacy-kitchen", code: "kitchen", name: "內場", area: "kitchen", storeId: null },
  { id: "legacy-floor", code: "floor", name: "外場", area: "floor", storeId: null },
  { id: "legacy-counter", code: "counter", name: "櫃台", area: "counter", storeId: null },
];

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

function isWorkstationSchemaError(message?: string | null) {
  if (!message) {
    return false;
  }

  return (
    message.includes("workstations") ||
    message.includes("default_workstation_id") ||
    message.includes("workstation_id")
  );
}

function isMenuItemPhotoSchemaError(message?: string | null) {
  if (!message) {
    return false;
  }

  return message.includes("photo_url");
}

async function supportsMenuItemPhotos(admin: ReturnType<typeof createAdminClient>) {
  if (menuItemPhotoSupportCache === true) {
    return true;
  }
  if (
    menuItemPhotoSupportCache === false &&
    Date.now() - menuItemPhotoSupportNegativeCachedAt < MENU_ITEM_PHOTO_NEGATIVE_CACHE_TTL_MS
  ) {
    return false;
  }

  const { error } = await admin.from("inspection_menu_items").select("photo_url").limit(1);
  if (error) {
    if (isMenuItemPhotoSchemaError(error.message)) {
      menuItemPhotoSupportCache = false;
      menuItemPhotoSupportNegativeCachedAt = Date.now();
      return false;
    }

    throw new Error(error.message);
  }

  menuItemPhotoSupportCache = true;
  return true;
}

function getLegacyWorkstationById(id: string) {
  return LEGACY_WORKSTATIONS.find((workstation) => workstation.id === id) ?? null;
}

function getLegacyWorkstationIdFromRole(role?: string | null) {
  if (role === "kitchen") return "legacy-kitchen";
  if (role === "counter") return "legacy-counter";
  return "legacy-floor";
}

async function getStoreCode(admin: ReturnType<typeof createAdminClient>, storeId: string) {
  const { data: storeRow, error: storeError } = await admin.from("stores").select("code").eq("id", storeId).single();

  if (storeError || !storeRow) {
    throw new Error(storeError?.message || "找不到指定店別。");
  }

  return storeRow.code;
}

async function getActiveStaffAndWorkstations(
  admin: ReturnType<typeof createAdminClient>,
  storeId: string,
): Promise<{ activeStaff: ActiveStaffSummary[]; workstations: WorkstationSummary[] }> {
  const [staffResult, workstationResult] = await Promise.all([
    admin
      .from("staff_members")
      .select("id, name, store_id, default_workstation_id")
      .eq("status", "active")
      .eq("store_id", storeId)
      .order("name"),
    admin
      .from("workstations")
      .select("id, code, name, area, store_id")
      .eq("is_active", true)
      .or(`store_id.is.null,store_id.eq.${storeId}`)
      .order("sort_order")
      .order("name"),
  ]);

  if (!staffResult.error && !workstationResult.error) {
    return {
      activeStaff: (staffResult.data ?? []).map((member) => ({
        id: member.id,
        name: member.name,
        store_id: member.store_id,
        defaultWorkstationId: member.default_workstation_id ?? null,
      })),
      workstations: (workstationResult.data ?? []).map((workstation) => ({
        id: workstation.id,
        code: workstation.code,
        name: workstation.name,
        area: workstation.area as ShiftRole,
        storeId: workstation.store_id,
      })),
    };
  }

  const schemaMessage = staffResult.error?.message || workstationResult.error?.message;
  if (!isWorkstationSchemaError(schemaMessage)) {
    throw new Error(schemaMessage || "讀取工作站資料失敗。");
  }

  const { data: legacyStaff, error: legacyStaffError } = await admin
    .from("staff_members")
    .select("id, name, store_id, position")
    .eq("status", "active")
    .eq("store_id", storeId)
    .order("name");

  if (legacyStaffError) {
    throw new Error(legacyStaffError.message);
  }

  return {
    activeStaff: (legacyStaff ?? []).map((member) => ({
      id: member.id,
      name: member.name,
      store_id: member.store_id,
      defaultWorkstationId: getLegacyWorkstationIdFromRole(member.position),
    })),
    workstations: LEGACY_WORKSTATIONS,
  };
}

async function getInspectionShiftAssignments(
  admin: ReturnType<typeof createAdminClient>,
  inspectionId: string,
) {
  const modernResult = await admin
    .from("inspection_staff")
    .select("id, role_in_shift, workstation_id, staff_members(id, name), workstations(id, name, area)")
    .eq("inspection_id", inspectionId);

  if (!modernResult.error) {
    return (modernResult.data ?? []).flatMap((row) => {
      const member = mapSingleRelation(row.staff_members);
      const workstation = mapSingleRelation(row.workstations) as
        | { id?: string; name?: string; area?: ShiftRole }
        | null;

      if (!member) {
        return [];
      }

      return [
        {
          id: member.id as string,
          name: member.name as string,
          workstationId: (row.workstation_id as string) ?? (workstation?.id as string),
          workstationName: (workstation?.name as string | undefined) ?? "未指定工作站",
          workstationArea: (workstation?.area as ShiftRole | undefined) ?? (row.role_in_shift as ShiftRole),
        },
      ];
    });
  }

  if (!isWorkstationSchemaError(modernResult.error?.message)) {
    throw new Error(modernResult.error?.message || "讀取當班人員失敗。");
  }

  const legacyResult = await admin
    .from("inspection_staff")
    .select("id, role_in_shift, staff_members(id, name)")
    .eq("inspection_id", inspectionId);

  if (legacyResult.error) {
    throw new Error(legacyResult.error.message);
  }

  return (legacyResult.data ?? []).flatMap((row) => {
    const member = mapSingleRelation(row.staff_members);
    if (!member) {
      return [];
    }

    const workstation = getLegacyWorkstationById(getLegacyWorkstationIdFromRole(row.role_in_shift));
    return [
      {
        id: member.id as string,
        name: member.name as string,
        workstationId: workstation?.id ?? getLegacyWorkstationIdFromRole(row.role_in_shift),
        workstationName: workstation?.name ?? "未指定工作站",
        workstationArea: (workstation?.area as ShiftRole | undefined) ?? (row.role_in_shift as ShiftRole),
      },
    ];
  });
}

async function insertInspectionShiftAssignments(params: {
  admin: ReturnType<typeof createAdminClient>;
  inspectionId: string;
  selectedStaff: InspectionMutationInput["selectedStaff"];
  workstationsById: Map<string, WorkstationSummary>;
}) {
  const { admin, inspectionId, selectedStaff, workstationsById } = params;
  if (selectedStaff.length === 0) {
    return;
  }

  const rows = selectedStaff.map((entry) => ({
    inspection_id: inspectionId,
    staff_id: entry.staffId,
    role_in_shift: workstationsById.get(entry.workstationId)?.area ?? "floor",
    workstation_id: entry.workstationId,
  }));

  const modernInsert = await admin.from("inspection_staff").insert(rows);
  if (!modernInsert.error) {
    return;
  }

  if (!isWorkstationSchemaError(modernInsert.error.message)) {
    throw new Error(modernInsert.error.message);
  }

  const legacyInsert = await admin.from("inspection_staff").insert(
    rows.map((row) => ({
      inspection_id: row.inspection_id,
      staff_id: row.staff_id,
      role_in_shift: row.role_in_shift,
    })),
  );

  if (legacyInsert.error) {
    throw new Error(legacyInsert.error.message);
  }
}

async function resolveAssignableWorkstations(
  admin: ReturnType<typeof createAdminClient>,
  storeId: string,
  workstationIds: string[],
) {
  if (workstationIds.length === 0) {
    return new Map<string, WorkstationSummary>();
  }

  const allLegacy = workstationIds.every((workstationId) => workstationId.startsWith("legacy-"));
  if (allLegacy) {
    return new Map(
      workstationIds.map((workstationId) => {
        const workstation = getLegacyWorkstationById(workstationId);
        if (!workstation) {
          throw new Error("找不到對應的工作站。");
        }
        return [workstationId, workstation] as const;
      }),
    );
  }

  const { data, error } = await admin
    .from("workstations")
    .select("id, code, name, area, store_id, is_active")
    .in("id", workstationIds);

  if (error) {
    throw new Error(error.message);
  }

  const byId = new Map<string, WorkstationSummary>();
  for (const workstation of data ?? []) {
    if (!workstation.is_active) {
      continue;
    }

    if (workstation.store_id && workstation.store_id !== storeId) {
      continue;
    }

    byId.set(workstation.id, {
      id: workstation.id,
      code: workstation.code,
      name: workstation.name,
      area: workstation.area as ShiftRole,
      storeId: workstation.store_id,
    });
  }

  if (byId.size !== workstationIds.length) {
    throw new Error("巡店表單包含不適用於此店別的工作站。");
  }

  return byId;
}

function validateInspectionInput(input: InspectionMutationInput) {
  const missingFocus = input.scores.filter((item) => item.isFocusItem && !item.score);
  if (missingFocus.length > 0) {
    throw new Error("所有標籤項目都必須完成評分後才能儲存。");
  }

  const invalidScores = input.scores.filter((item) => item.score <= 2 && !item.note?.trim());
  if (invalidScores.length > 0) {
    throw new Error("評分為 1 或 2 時必須填寫說明。");
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
      await syncNotionImprovementTaskById(admin, existingTask.id);
    } else {
      const { data: insertedTask, error } = await admin
        .from("improvement_tasks")
        .insert({
          score_id: scoreId,
          store_id: storeId,
          item_id: itemId,
          status: "pending",
        })
        .select("id")
        .single();
      if (error || !insertedTask) {
        throw new Error(error?.message || "建立改善任務失敗。");
      }
      await syncNotionImprovementTaskById(admin, insertedTask.id);
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

    await syncNotionImprovementTaskById(admin, existingTask.id);
  }
}

async function syncNotionImprovementTaskById(admin: ReturnType<typeof createAdminClient>, taskId: string) {
  const { data: row, error } = await admin
    .from("improvement_tasks")
    .select(
      "id, status, notion_page_id, stores(name), inspection_items(name), inspection_scores(score, note, inspections(date))",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!row) {
    return;
  }

  const store = mapSingleRelation(row.stores) as { name?: string } | null;
  const item = mapSingleRelation(row.inspection_items) as { name?: string } | null;
  const score = mapSingleRelation(row.inspection_scores) as
    | { score?: 1 | 2 | 3; note?: string | null; inspections?: unknown }
    | null;
  const inspection = (score ? mapSingleRelation(score.inspections as never) : null) as { date?: string } | null;

  if (!store?.name || !item?.name || !score?.score || !inspection?.date) {
    return;
  }

  const result = await upsertNotionImprovementTask({
    notionPageId: (row.notion_page_id as string | null | undefined) ?? null,
    task: buildNotionImprovementTaskSyncInput({
      status: row.status as ImprovementStatus,
      storeName: store.name,
      itemName: item.name,
      scoreValue: score.score,
      scoreNote: score.note ?? null,
      inspectionDate: inspection.date,
    }),
  });

  if (result.status === "synced") {
    const { error: updateError } = await admin
      .from("improvement_tasks")
      .update({ notion_page_id: result.pageId, notion_synced_at: new Date().toISOString() })
      .eq("id", taskId);
    if (updateError) {
      throw new Error(updateError.message);
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
      photo_url: normalizePhotoDisplayUrl(publicUrlData.publicUrl),
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

async function uploadInspectionMenuItemPhotos(params: {
  admin: ReturnType<typeof createAdminClient>;
  storeCode: string;
  date: string;
  menuItems: InspectionMutationInput["menuItems"];
  menuRowByType: Map<"dine_in" | "takeout", { id: string }>;
}) {
  const { admin, storeCode, date, menuItems, menuRowByType } = params;
  const validUploads = menuItems.filter((item) => item.photo && menuRowByType.has(item.type));

  if (validUploads.length === 0) {
    return;
  }

  for (const item of validUploads) {
    const row = menuRowByType.get(item.type);
    const photo = item.photo;
    if (!row || !photo) {
      continue;
    }

    const safeFileName = `${crypto.randomUUID()}-${photo.fileName}`;
    const objectPath = `${storeCode}/${date}/menu-items/${item.type}/${safeFileName}`;
    const buffer = Buffer.from(photo.base64, "base64");

    const { error: uploadError } = await admin.storage.from("inspection-photos").upload(objectPath, buffer, {
      contentType: photo.contentType,
      upsert: false,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    const { data: publicUrlData } = admin.storage.from("inspection-photos").getPublicUrl(objectPath);
    const { error: updateError } = await admin
      .from("inspection_menu_items")
      .update({ photo_url: normalizePhotoDisplayUrl(publicUrlData.publicUrl) })
      .eq("id", row.id);

    if (updateError) {
      throw new Error(updateError.message);
    }
  }
}

async function removeInspectionPhotoObjects(params: {
  admin: ReturnType<typeof createAdminClient>;
  photoUrls: Array<string | null | undefined>;
}) {
  const objectPaths = params.photoUrls
    .map((photoUrl) => (photoUrl ? getPublicObjectPath(photoUrl) : null))
    .filter(Boolean) as string[];

  if (objectPaths.length === 0) {
    return;
  }

  const { error } = await params.admin.storage.from("inspection-photos").remove(objectPaths);
  if (error) {
    throw new Error(error.message);
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
    throw new Error(storesError?.message || "目前尚未設定任何店別。");
  }

  const selectedStoreId = params?.storeId ?? "";
  const selectedDate = params?.date || today;
  const selectedMonth = selectedDate.slice(0, 7) || month;

  if (!selectedStoreId) {
    return {
      stores,
      selectedStoreId: "",
      selectedDate,
      selectedMonth,
      workstations: [],
      activeStaff: [],
      groupedItems: [],
      duplicateInspectionWarning: false,
    } satisfies InspectionFormSeed;
  }

  const [
    staffAndWorkstations,
    { data: categories, error: categoriesError },
    { data: items, error: itemsError },
    { data: criticalTagRows, error: criticalTagError },
    { data: scopedTagRows, error: scopedTagError },
    { data: recentInspections, error: inspectionsError },
    { data: duplicateRows, error: duplicateError },
    extraAssignments,
  ] = await Promise.all([
    getActiveStaffAndWorkstations(admin, selectedStoreId),
    admin.from("categories").select("id, name, sort_order").order("sort_order"),
    admin
      .from("inspection_items")
      .select("id, name, category_id, sort_order, is_base, is_active")
      .eq("is_active", true)
      .order("sort_order"),
    admin.from("focus_items").select("item_id, type").eq("type", "critical"),
    admin
      .from("focus_items")
      .select("item_id, type, store_id")
      .in("type", ["monthly_attention", "complaint_watch"])
      .eq("month", selectedMonth)
      .or(`store_id.is.null,store_id.eq.${selectedStoreId}`),
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

  if (
    categoriesError ||
    itemsError ||
    criticalTagError ||
    scopedTagError ||
    inspectionsError ||
    duplicateError
  ) {
    throw new Error(
      categoriesError?.message ||
        itemsError?.message ||
        criticalTagError?.message ||
        scopedTagError?.message ||
        inspectionsError?.message ||
        duplicateError?.message ||
        "載入巡店表單資料失敗。",
    );
  }

  if (extraAssignments.error) {
    throw new Error(extraAssignments.error.message);
  }

  const focusRows = [...(criticalTagRows ?? []), ...(scopedTagRows ?? [])];
  const extraItemIds = new Set((extraAssignments.data ?? []).map((row) => row.item_id));
  const allowedItems = (items ?? []).filter((item) => item.is_base || extraItemIds.has(item.id));
  const tagTypesByItemId = new Map<string, InspectionTagType[]>();
  for (const row of focusRows ?? []) {
    const existing = tagTypesByItemId.get(row.item_id) ?? [];
    if (!existing.includes(row.type as InspectionTagType)) {
      existing.push(row.type as InspectionTagType);
    }
    tagTypesByItemId.set(row.item_id, existing);
  }
  const prevIssueMap = buildPreviousIssueMap((recentInspections ?? []) as PriorInspectionRow[], selectedDate);

  const groupedItems = (categories ?? [])
    .map((category) => {
      const categoryItems = allowedItems
        .filter((item) => item.category_id === category.id)
        .map((item) => {
          const previousIssue = prevIssueMap.get(item.id);
          const tagTypes = tagTypesByItemId.get(item.id) ?? [];
          const isFocusItem = tagTypes.length > 0;

          return {
            id: item.id,
            name: item.name,
            isFocusItem,
            tagTypes,
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
    workstations: staffAndWorkstations.workstations,
    activeStaff: staffAndWorkstations.activeStaff,
    groupedItems,
    duplicateInspectionWarning: Boolean(duplicateRows?.length),
  } satisfies InspectionFormSeed;
}

export async function getInspectionDetail(inspectionId: string): Promise<InspectionDetail> {
  const profile = await requireRole("owner", "manager", "leader");
  const admin = createAdminClient();
  const hasMenuItemPhotos = await supportsMenuItemPhotos(admin);

  const { data: inspectionRow, error: inspectionError } = await admin
    .from("inspections")
    .select(
      "id, date, time_slot, busyness_level, total_score, is_editable, store_id, stores(id, name), users(id, email, name)",
    )
    .eq("id", inspectionId)
    .maybeSingle();

  if (inspectionError || !inspectionRow) {
    throw new Error(inspectionError?.message || "找不到這筆巡店紀錄。");
  }

  if (profile.role === "leader" && inspectionRow.store_id !== profile.store_id) {
    throw new Error("You do not have access to this inspection.");
  }

  const [staffRows, { data: scoreRows, error: scoreError }, { data: legacyRows, error: legacyError }] = await Promise.all([
    getInspectionShiftAssignments(admin, inspectionId),
    admin
      .from("inspection_scores")
      .select(
        "id, item_id, score, note, is_focus_item, applied_tag_types, has_prev_issue, consecutive_weeks, inspection_items(name, categories(name)), improvement_tasks(id, status, created_at, resolved_at, verified_at)",
      )
      .eq("inspection_id", inspectionId),
    admin
      .from("legacy_notes")
      .select("id, content, created_at")
      .eq("inspection_id", inspectionId)
      .order("created_at", { ascending: true }),
  ]);

  const menuResult = hasMenuItemPhotos
    ? await admin
        .from("inspection_menu_items")
        .select("id, type, dish_name, portion_weight, observation_note, photo_url")
        .eq("inspection_id", inspectionId)
        .order("type")
    : await admin
        .from("inspection_menu_items")
        .select("id, type, dish_name, portion_weight, observation_note")
        .eq("inspection_id", inspectionId)
        .order("type");

  const menuRows = menuResult.data ?? [];
  const menuError = menuResult.error;

  if (scoreError || menuError || legacyError) {
    throw new Error(
      scoreError?.message || menuError?.message || legacyError?.message || "載入巡店明細失敗。",
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
      photoUrl: normalizePhotoDisplayUrl(photo.photo_url),
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
    staff: staffRows,
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
        tagTypes: ((row.applied_tag_types as InspectionTagType[] | null | undefined) ?? []).filter(Boolean),
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
      observationNote:
        "observation_note" in row && typeof row.observation_note === "string" ? row.observation_note : null,
      photoUrl: "photo_url" in row && typeof row.photo_url === "string" ? normalizePhotoDisplayUrl(row.photo_url) : null,
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
    throw new Error("這筆巡店紀錄已鎖定，無法再編輯。");
  }
  const formSeed = await getInspectionFormSeed({
    storeId: detail.store?.id ?? undefined,
    date: detail.date,
  });

  const selectedStaff = Object.fromEntries(detail.staff.map((member) => [member.id, member.workstationId]));
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
            tagTypes: saved?.tagTypes ?? item.tagTypes,
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
        dineInObservationNote: dineIn?.observationNote ?? "",
        dineInPhotoUrl: dineIn?.photoUrl ?? "",
        takeoutDishName: takeout?.dishName ?? "",
        takeoutPortionWeight: takeout?.portionWeight ?? "",
        takeoutObservationNote: takeout?.observationNote ?? "",
        takeoutPhotoUrl: takeout?.photoUrl ?? "",
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
      "id, status, created_at, resolved_at, verified_at, store_id, item_id, stores(id, name), inspection_items(id, name), inspection_scores(id, score, note, is_focus_item, applied_tag_types, inspection_id, inspections(date))",
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
      | {
          id?: string;
          score?: 1 | 2 | 3;
          note?: string | null;
          is_focus_item?: boolean;
          applied_tag_types?: InspectionTagType[] | null;
          inspection_id?: string;
          inspections?: unknown;
        }
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
            isFocusItem: Boolean(score.is_focus_item),
            tagTypes: ((score.applied_tag_types as InspectionTagType[] | null | undefined) ?? []).filter(Boolean),
            inspectionId: score.inspection_id as string,
            inspectionDate: (inspection?.date as string | undefined) ?? null,
          }
        : null,
    };
  });
}

export async function updateImprovementTaskStatus(input: {
  id: string;
  status: ImprovementStatus;
}) {
  const profile = await requireRole("owner", "manager", "leader");
  const admin = createAdminClient();

  const { data: existingTask, error: taskError } = await admin
    .from("improvement_tasks")
    .select("id, status, store_id")
    .eq("id", input.id)
    .maybeSingle();

  if (taskError) {
    throw new Error(taskError.message);
  }
  if (!existingTask) {
    throw new Error("找不到改善任務。");
  }

  if (
    !canTransitionImprovementTaskStatus({
      role: profile.role,
      profileStoreId: profile.store_id,
      taskStoreId: existingTask.store_id,
      currentStatus: existingTask.status as ImprovementStatus,
      nextStatus: input.status,
    })
  ) {
    throw new Error("你沒有權限更新此改善任務狀態。");
  }

  const payload: {
    status: ImprovementStatus;
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

  await syncNotionImprovementTaskById(admin, input.id);

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
  const hasMenuItemPhotos = await supportsMenuItemPhotos(admin);

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

  if (hasMenuItemPhotos) {
    const { data: menuItems, error: menuItemsError } = await admin
      .from("inspection_menu_items")
      .select("photo_url")
      .eq("inspection_id", inspectionId);

    if (menuItemsError) {
      throw new Error(menuItemsError.message);
    }

    await removeInspectionPhotoObjects({
      admin,
      photoUrls: (menuItems ?? []).map((item) => item.photo_url),
    });
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
    throw new Error(photoError?.message || "找不到這張照片。");
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
    throw new Error(photoError?.message || "找不到這張照片。");
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
    .select("id, store_id, total_score, stores(id, name), inspection_scores(score, applied_tag_types, inspection_items(categories(name)))")
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
    throw new Error(storesError?.message || inspectionsError?.message || "載入月報資料失敗。");
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
        scores: (inspection.inspection_scores ?? []).map((row) => {
          const item = mapSingleRelation(row.inspection_items) as { categories?: unknown } | null;
          const category = item ? (mapSingleRelation(item.categories as never) as { name?: string } | null) : null;

          return {
            categoryName: category?.name ?? "未分類",
            score: row.score,
            tagTypes: row.applied_tag_types ?? [],
          };
        }),
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
    categoryBreakdown: stats.categoryBreakdown,
    storeBreakdown: stats.storeBreakdown,
  };
}

export async function createInspection(input: InspectionMutationInput) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const hasMenuItemPhotos = await supportsMenuItemPhotos(admin);
  if (!hasMenuItemPhotos && input.menuItems.some((item) => item.photo)) {
    throw new Error("餐點抽查照片功能需要先套用最新的資料庫 migration。");
  }

  validateInspectionInput(input);
  const storeCode = await getStoreCode(admin, input.storeId);
  const workstationsById = await resolveAssignableWorkstations(
    admin,
    input.storeId,
    input.selectedStaff.map((entry) => entry.workstationId),
  );
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
    throw new Error(inspectionError?.message || "建立巡店紀錄失敗。");
  }

  if (input.selectedStaff.length > 0) {
    await insertInspectionShiftAssignments({
      admin,
      inspectionId: inspection.id,
      selectedStaff: input.selectedStaff,
      workstationsById,
    });
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
        applied_tag_types: entry.tagTypes,
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
    const { data: insertedTasks, error } = await admin
      .from("improvement_tasks")
      .insert(
        lowScoreRows.map((entry) => ({
          score_id: entry.id,
          store_id: input.storeId,
          item_id: entry.item_id,
          status: "pending" as const,
        })),
      )
      .select("id");

    if (error) {
      throw new Error(error.message);
    }

    for (const task of insertedTasks ?? []) {
      await syncNotionImprovementTaskById(admin, task.id);
    }
  }

  const validMenuItems = input.menuItems.filter(
    (item) =>
      item.dishName?.trim() ||
      item.portionWeight?.trim() ||
      item.observationNote?.trim() ||
      item.photo ||
      item.photoUrl,
  );
  if (validMenuItems.length > 0) {
    const insertPayload = validMenuItems.map((item) => ({
      inspection_id: inspection.id,
      type: item.type,
      dish_name: item.dishName?.trim() || null,
      portion_weight: item.portionWeight?.trim() || null,
      observation_note: item.observationNote?.trim() || null,
      ...(hasMenuItemPhotos ? { photo_url: item.photoUrl?.trim() || null } : {}),
    }));
    const insertResult = hasMenuItemPhotos
      ? await admin.from("inspection_menu_items").insert(insertPayload).select("id, type, photo_url")
      : await admin.from("inspection_menu_items").insert(insertPayload).select("id, type");

    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }

    if (hasMenuItemPhotos) {
      const menuRowByType = new Map(
        (insertResult.data ?? []).map((row) => [row.type as "dine_in" | "takeout", { id: row.id as string }]),
      );
      await uploadInspectionMenuItemPhotos({
        admin,
        storeCode,
        date: input.date,
        menuItems: validMenuItems,
        menuRowByType,
      });
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
  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/inspection/reports");

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

  // Notify the store leader, all managers, and all owners. Failure here must
  // never roll back the inspection — log the outcome and move on.
  try {
    const { sendInspectionCompletedEmail } = await import("@/lib/email");
    const result = await sendInspectionCompletedEmail(inspection.id);
    if (!result.ok && result.reason !== "config_missing") {
      await createAuditLog({
        actorId: profile.id,
        actorEmail: profile.email,
        action: "send_inspection_email_failed",
        entityType: "inspection",
        entityId: inspection.id,
        details: { reason: result.reason, error: result.error ?? null },
      });
    }
  } catch (emailError) {
    await createAuditLog({
      actorId: profile.id,
      actorEmail: profile.email,
      action: "send_inspection_email_failed",
      entityType: "inspection",
      entityId: inspection.id,
      details: {
        reason: "exception",
        error: emailError instanceof Error ? emailError.message : String(emailError),
      },
    }).catch(() => {
      // Audit log failure is non-fatal — never throw from this branch.
    });
  }

  return { success: true as const, inspectionId: inspection.id };
}

export async function updateInspection(inspectionId: string, input: InspectionMutationInput) {
  const profile = await requireRole("owner", "manager");
  const admin = createAdminClient();
  const hasMenuItemPhotos = await supportsMenuItemPhotos(admin);
  if (!hasMenuItemPhotos && input.menuItems.some((item) => item.photo)) {
    throw new Error("餐點抽查照片功能需要先套用最新的資料庫 migration。");
  }

  validateInspectionInput(input);

  const { data: existingInspection, error: inspectionQueryError } = await admin
    .from("inspections")
    .select("id, store_id, is_editable")
    .eq("id", inspectionId)
    .maybeSingle();

  if (inspectionQueryError || !existingInspection) {
    throw new Error(inspectionQueryError?.message || "找不到這筆巡店紀錄。");
  }
  if (!existingInspection.is_editable) {
    throw new Error("這筆巡店紀錄已鎖定，無法再編輯。");
  }

  const storeCode = await getStoreCode(admin, input.storeId);
  const workstationsById = await resolveAssignableWorkstations(
    admin,
    input.storeId,
    input.selectedStaff.map((entry) => entry.workstationId),
  );
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
          applied_tag_types: entry.tagTypes,
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
          applied_tag_types: entry.tagTypes,
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
    await insertInspectionShiftAssignments({
      admin,
      inspectionId,
      selectedStaff: input.selectedStaff,
      workstationsById,
    });
  }

  const existingMenuResult = hasMenuItemPhotos
    ? await admin.from("inspection_menu_items").select("id, type, photo_url").eq("inspection_id", inspectionId)
    : await admin.from("inspection_menu_items").select("id, type").eq("inspection_id", inspectionId);

  if (existingMenuResult.error) {
    throw new Error(existingMenuResult.error.message);
  }

  const existingMenuRows = (existingMenuResult.data ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as "dine_in" | "takeout",
    photoUrl: "photo_url" in row && typeof row.photo_url === "string" ? normalizePhotoDisplayUrl(row.photo_url) : null,
  }));

  const { error: menuDeleteError } = await admin.from("inspection_menu_items").delete().eq("inspection_id", inspectionId);
  if (menuDeleteError) {
    throw new Error(menuDeleteError.message);
  }

  const validMenuItems = input.menuItems.filter(
    (item) =>
      item.dishName?.trim() ||
      item.portionWeight?.trim() ||
      item.observationNote?.trim() ||
      item.photo ||
      item.photoUrl,
  );
  if (validMenuItems.length > 0) {
    const insertPayload = validMenuItems.map((item) => ({
      inspection_id: inspectionId,
      type: item.type,
      dish_name: item.dishName?.trim() || null,
      portion_weight: item.portionWeight?.trim() || null,
      observation_note: item.observationNote?.trim() || null,
      ...(hasMenuItemPhotos ? { photo_url: item.photoUrl?.trim() || null } : {}),
    }));
    const insertResult = hasMenuItemPhotos
      ? await admin.from("inspection_menu_items").insert(insertPayload).select("id, type, photo_url")
      : await admin.from("inspection_menu_items").insert(insertPayload).select("id, type");
    if (insertResult.error) {
      throw new Error(insertResult.error.message);
    }

    if (hasMenuItemPhotos) {
      const menuRowByType = new Map(
        (insertResult.data ?? []).map((row) => [row.type as "dine_in" | "takeout", { id: row.id as string }]),
      );
      await uploadInspectionMenuItemPhotos({
        admin,
        storeCode,
        date: input.date,
        menuItems: validMenuItems,
        menuRowByType,
      });
    }
  }

  if (hasMenuItemPhotos) {
    const retainedPhotoUrls = new Set(
      validMenuItems.filter((item) => !item.photo && item.photoUrl).map((item) => item.photoUrl as string),
    );
    const stalePhotoUrls = existingMenuRows
      .map((row) => row.photoUrl)
      .filter((photoUrl): photoUrl is string => typeof photoUrl === "string" && !retainedPhotoUrls.has(photoUrl));

    await removeInspectionPhotoObjects({
      admin,
      photoUrls: stalePhotoUrls,
    });
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
  revalidatePath("/");
  revalidatePath("/notifications");
  revalidatePath("/inspection/reports");

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
