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

function getGradeChipClass(grade: InspectionGrade) {
  if (grade === "A") return "nb-chip-green";
  if (grade === "B") return "nb-chip-yellow";
  return "nb-chip-red";
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
      {/* Page header */}
      <div className="nb-card p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="nb-eyebrow">Inspection History</p>
          <h1 className="nb-h1 mt-2">巡店紀錄</h1>
          <p className="mt-3 text-sm text-nb-ink/70 leading-6 max-w-xl">
            先看總評等級與重點異常，再往下追蹤每一筆巡店。點「查看」可進入該筆巡店的詳細頁。
          </p>
        </div>
        {profile.role === "owner" || profile.role === "manager" ? (
          <Link href="/inspection/new" className="nb-btn-primary">
            <span>＋</span> 新增巡店
          </Link>
        ) : null}
      </div>

      {/* Filters + KPI */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="nb-card p-6">
          <div className="nb-divider">
            <p className="nb-eyebrow">Filters</p>
            <h2 className="nb-h2 mt-1">篩選條件</h2>
          </div>

          <form className="mt-5 grid gap-4 md:grid-cols-2 md:items-end">
            {profile.role !== "leader" ? (
              <div>
                <label className="nb-label">店別</label>
                <select name="store" defaultValue={selectedStoreId} className="nb-select">
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
              <label className="nb-label">月份</label>
              <input type="month" name="month" defaultValue={month} className="nb-input" />
            </div>

            <div className="flex items-end gap-3 md:col-span-2">
              <button type="submit" className="nb-btn-primary">
                套用篩選
              </button>
              <Link href="/inspection/history" className="nb-btn">
                清除
              </Link>
            </div>
          </form>
        </section>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="nb-kpi">
            <p className="nb-eyebrow">Inspections</p>
            <p className="mt-2 font-nbSerif text-3xl font-black">{totalInspections}</p>
            <p className="mt-1 text-xs text-nb-ink/60">本月巡店總次數</p>
          </div>
          <div className="nb-kpi">
            <p className="nb-eyebrow">Grade</p>
            {overallGrade ? (
              <p className={`mt-2 inline-flex px-3 py-1 text-2xl font-black ${getGradeChipClass(overallGrade)}`}>
                {overallGrade}
              </p>
            ) : (
              <p className="mt-2 text-lg text-nb-ink/45 font-bold">尚無資料</p>
            )}
            <p className="mt-1 text-xs text-nb-ink/60">本月整體評級</p>
          </div>
          <div className="nb-kpi">
            <p className="nb-eyebrow">A / B / C</p>
            <p className="mt-2 font-nbSerif text-2xl font-black text-nb-ink">
              {gradeCounts.a} <span className="text-nb-ink/30">/</span> {gradeCounts.b}{" "}
              <span className="text-nb-ink/30">/</span> {gradeCounts.c}
            </p>
            <p className="mt-1 text-xs text-nb-ink/60">分級的巡店筆數</p>
          </div>
          <div className="nb-kpi">
            <p className="nb-eyebrow">Stores</p>
            <p className="mt-2 font-nbSerif text-3xl font-black">{coveredStores}</p>
            <p className="mt-1 text-xs text-nb-ink/60">涵蓋店別數</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="nb-table-wrap">
        <table className="nb-table">
          <thead>
            <tr>
              <th>日期</th>
              <th>店別</th>
              <th>時段</th>
              <th>總評</th>
              <th>狀態</th>
              <th>巡店人</th>
              <th className="text-right pr-5">操作</th>
            </tr>
          </thead>
          <tbody>
            {enrichedInspections.map((inspection) => {
              const store = getSingleRelation(inspection.stores) as { name?: string } | null;
              const inspector = getSingleRelation(inspection.users) as { name?: string; email?: string } | null;

              return (
                <tr key={inspection.id} data-testid={`inspection-history-row-${inspection.id}`}>
                  <td className="font-nbMono font-bold">{inspection.date}</td>
                  <td>{store?.name ?? "-"}</td>
                  <td>{inspection.time_slot}</td>
                  <td>
                    <div className="flex flex-col gap-1.5">
                      <span className={getGradeChipClass(inspection.grade.finalGrade)}>
                        總評 {inspection.grade.finalGrade}
                      </span>
                      <span className="text-xs text-nb-ink/60 font-nbMono">
                        平均 {Number(inspection.total_score ?? 0).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={
                        inspection.is_editable ? "nb-chip-yellow" : "nb-chip bg-nb-ink/10 text-nb-ink/70"
                      }
                    >
                      {inspection.is_editable ? "可編輯" : "已鎖定"}
                    </span>
                  </td>
                  <td>{inspector?.name || inspector?.email || "-"}</td>
                  <td className="text-right pr-5">
                    <Link
                      href={`/inspection/history/${inspection.id}`}
                      data-testid={`inspection-history-view-${inspection.id}`}
                      className="nb-btn-xs"
                    >
                      查看 →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!enrichedInspections.length ? (
              <tr>
                <td colSpan={7}>
                  <div className="nb-empty">這個月份還沒有巡店紀錄，先從新增巡店開始。</div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
