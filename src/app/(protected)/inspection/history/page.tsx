import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { buildOverallInspectionGrade, type GradeableScore, type InspectionGrade } from "@/lib/grading";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMonthValue } from "@/lib/utils";

type SearchParams = Promise<{ store?: string; month?: string }>;

function getMonthRange(month: string) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const start = new Date(Date.UTC(yearValue, monthValue - 1, 1));
  const end = new Date(Date.UTC(yearValue, monthValue, 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getGradeTone(grade: InspectionGrade) {
  if (grade === "A") return "bg-green-100 text-green-700";
  if (grade === "B") return "bg-warm/15 text-warm";
  return "bg-danger/10 text-danger";
}

export default async function InspectionHistoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireRole("owner", "manager", "leader");
  const params = await searchParams;
  const admin = createAdminClient();
  const month = formatMonthValue(params.month);
  const selectedStoreId = profile.role === "leader" ? profile.store_id! : params.store || "";
  const storesQuery = admin.from("stores").select("id, name").order("name");
  const inspectionsQuery = admin
    .from("inspections")
    .select(
      "id, date, time_slot, total_score, created_at, store_id, is_editable, stores(id, name), users(name, email), inspection_scores(score, applied_tag_types, inspection_items(categories(name)))",
    )
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  const { start, end } = getMonthRange(month);
  let scopedInspectionsQuery = inspectionsQuery.gte("date", start).lt("date", end);

  if (profile.role === "leader") {
    scopedInspectionsQuery = scopedInspectionsQuery.eq("store_id", profile.store_id!);
  } else if (selectedStoreId) {
    scopedInspectionsQuery = scopedInspectionsQuery.eq("store_id", selectedStoreId);
  }

  const [{ data: stores, error: storesError }, { data: inspections, error: inspectionsError }] = await Promise.all([
    profile.role === "leader" ? storesQuery.eq("id", profile.store_id!) : storesQuery,
    scopedInspectionsQuery,
  ]);

  if (storesError || inspectionsError) {
    throw new Error(storesError?.message || inspectionsError?.message || "無法載入巡店紀錄。");
  }

  const enrichedInspections = (inspections ?? []).map((inspection) => {
    const scoreRows: GradeableScore[] = (inspection.inspection_scores ?? []).map((row) => {
      const item = getSingleRelation(row.inspection_items) as { categories?: unknown } | null;
      const category = item ? (getSingleRelation(item.categories as never) as { name?: string } | null) : null;

      return {
        categoryName: category?.name ?? "未分類",
        score: row.score,
        tagTypes: row.applied_tag_types ?? [],
      };
    });

    return {
      ...inspection,
      grade: buildOverallInspectionGrade(scoreRows),
    };
  });

  const totalInspections = enrichedInspections.length;
  const gradeCounts = enrichedInspections.reduce(
    (acc, inspection) => {
      if (inspection.grade.finalGrade === "A") acc.a += 1;
      if (inspection.grade.finalGrade === "B") acc.b += 1;
      if (inspection.grade.finalGrade === "C") acc.c += 1;
      return acc;
    },
    { a: 0, b: 0, c: 0 },
  );
  const coveredStores = new Set(enrichedInspections.map((inspection) => inspection.store_id)).size;
  const allScores: GradeableScore[] = enrichedInspections.flatMap((inspection) =>
    (inspection.inspection_scores ?? []).map((row) => ({
      categoryName: "整體巡店",
      score: row.score,
      tagTypes: row.applied_tag_types ?? [],
    })),
  );
  const overallGrade = allScores.length > 0 ? buildOverallInspectionGrade(allScores).finalGrade : null;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-ink/10 bg-white p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Inspection History</p>
          <h1 className="mt-2 font-serifTc text-3xl font-semibold">巡店紀錄</h1>
          <p className="mt-2 text-sm text-ink/65">先看總評等級，再往下追蹤每一筆巡店的重點異常。</p>
        </div>
        {profile.role === "owner" || profile.role === "manager" ? (
          <Link href="/inspection/new" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            新增巡店
          </Link>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Filters</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">篩選條件</h2>

          <form className="mt-5 grid gap-4 md:grid-cols-2">
            {profile.role !== "leader" ? (
              <div>
                <label className="mb-2 block text-sm text-ink/70">店別</label>
                <select
                  name="store"
                  defaultValue={selectedStoreId}
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                >
                  <option value="">全部店別</option>
                  {stores?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm text-ink/70">月份</label>
              <input
                type="month"
                name="month"
                defaultValue={month}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </div>

            <div className="flex items-end gap-3">
              <button type="submit" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
                套用篩選
              </button>
              <Link href="/inspection/history" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/70">
                清除
              </Link>
            </div>
          </form>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">巡店次數</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{totalInspections}</p>
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">本月整體評級</p>
            {overallGrade ? (
              <p className={`mt-2 inline-flex rounded-full px-4 py-2 text-2xl font-semibold ${getGradeTone(overallGrade)}`}>
                {overallGrade}
              </p>
            ) : (
              <p className="mt-2 text-lg text-ink/45">尚無資料</p>
            )}
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">A / B / C 巡店數</p>
            <p className="mt-2 text-lg font-semibold text-ink">
              {gradeCounts.a} / {gradeCounts.b} / {gradeCounts.c}
            </p>
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">涵蓋店數</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{coveredStores}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-ink/10 bg-white shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-soft/40 text-ink/70">
            <tr>
              <th className="px-4 py-3">日期</th>
              <th className="px-4 py-3">店別</th>
              <th className="px-4 py-3">時段</th>
              <th className="px-4 py-3">總評</th>
              <th className="px-4 py-3">狀態</th>
              <th className="px-4 py-3">巡店人</th>
            </tr>
          </thead>
          <tbody>
            {enrichedInspections.map((inspection) => {
              const store = getSingleRelation(inspection.stores) as { name?: string } | null;
              const inspector = getSingleRelation(inspection.users) as { name?: string; email?: string } | null;

              return (
                <tr key={inspection.id} data-testid={`inspection-history-row-${inspection.id}`} className="border-t border-ink/10">
                  <td className="px-4 py-3">{inspection.date}</td>
                  <td className="px-4 py-3">{store?.name ?? "-"}</td>
                  <td className="px-4 py-3">{inspection.time_slot}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <span
                        className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(inspection.grade.finalGrade)}`}
                      >
                        總評 {inspection.grade.finalGrade}
                      </span>
                      <span className="text-xs text-ink/55">
                        平均分數 {Number(inspection.total_score ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-3 py-1 text-xs ${
                        inspection.is_editable ? "bg-warm/15 text-warm" : "bg-ink/10 text-ink/70"
                      }`}
                    >
                      {inspection.is_editable ? "可編輯" : "已鎖定"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <span>{inspector?.name || inspector?.email || "-"}</span>
                      <Link
                        href={`/inspection/history/${inspection.id}`}
                        data-testid={`inspection-history-view-${inspection.id}`}
                        className="text-warm underline-offset-4 hover:underline"
                      >
                        查看
                      </Link>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!enrichedInspections.length ? (
              <tr>
                <td className="px-4 py-8 text-center text-ink/60" colSpan={6}>
                  這個月份還沒有巡店紀錄，先從新增巡店開始。
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
