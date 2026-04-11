import { requireRole } from "@/lib/auth";
import { buildNotificationFeed, type NotificationInspection } from "@/lib/notification-rules";
import { createAdminClient } from "@/lib/supabase/admin";
export { buildNotificationFeed, getNotificationLevelLabel, getNotificationTone } from "@/lib/notification-rules";

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}


export async function getNotificationFeed() {
  const profile = await requireRole("owner", "manager", "leader");
  const admin = createAdminClient();
  const month = new Date().toISOString().slice(0, 7);
  const start = `${month}-01`;
  const endDate = new Date(`${month}-01T00:00:00.000Z`);
  endDate.setUTCMonth(endDate.getUTCMonth() + 1);
  const end = endDate.toISOString().slice(0, 10);

  let inspectionsQuery = admin
    .from("inspections")
    .select(
      "id, date, time_slot, store_id, stores(id, name), inspection_scores(score, applied_tag_types, consecutive_weeks, inspection_items(name, categories(name)))",
    )
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  let tasksQuery = admin.from("improvement_tasks").select("id, status");

  if (profile.role === "leader" && profile.store_id) {
    inspectionsQuery = inspectionsQuery.eq("store_id", profile.store_id);
    tasksQuery = tasksQuery.eq("store_id", profile.store_id);
  }

  const [{ data: inspections, error: inspectionsError }, { data: tasks, error: tasksError }] = await Promise.all([
    inspectionsQuery,
    tasksQuery,
  ]);

  if (inspectionsError || tasksError) {
    throw new Error(inspectionsError?.message || tasksError?.message || "載入通知失敗。");
  }

  const mappedInspections: NotificationInspection[] = (inspections ?? []).map((inspection) => {
    const store = getSingleRelation(inspection.stores) as { name?: string } | null;

    return {
      id: inspection.id,
      date: inspection.date,
      timeSlot: inspection.time_slot,
      storeName: store?.name ?? "未指定店別",
      scores: (inspection.inspection_scores ?? []).map((row) => {
        const item = getSingleRelation(row.inspection_items) as { name?: string; categories?: unknown } | null;
        const category = item ? (getSingleRelation(item.categories as never) as { name?: string } | null) : null;

        return {
          itemName: item?.name ?? "未命名題目",
          categoryName: category?.name ?? "未分類",
          score: row.score,
          tagTypes: row.applied_tag_types ?? [],
          consecutiveWeeks: row.consecutive_weeks ?? 0,
        };
      }),
    };
  });

  return buildNotificationFeed({
    inspections: mappedInspections,
    pendingTasks: (tasks ?? []).filter((task) => task.status === "pending").length,
  });
}
