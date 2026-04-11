import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { getInspectionMonthlyReport } from "@/lib/inspection";
import { type InspectionGrade } from "@/lib/grading";
import { formatMonthValue } from "@/lib/utils";

type SearchParams = Promise<{ month?: string; store?: string }>;

function widthPercent(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

function getGradeTone(grade: InspectionGrade) {
  if (grade === "A") return "bg-green-100 text-green-700";
  if (grade === "B") return "bg-warm/15 text-warm";
  return "bg-danger/10 text-danger";
}

export default async function InspectionReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireRole("owner", "manager", "leader");
  const params = await searchParams;
  const report = await getInspectionMonthlyReport({
    month: formatMonthValue(params.month),
    storeId: params.store,
  });

  const maxProblemOccurrences = Math.max(...report.topProblemItems.map((item) => item.occurrences), 0);
  const maxStoreInspections = Math.max(...report.storeBreakdown.map((store) => store.inspections), 0);
  const maxCategoryAttention = Math.max(...report.categoryBreakdown.map((category) => category.attentionCount), 0);
  const exportHref = `/api/reports/inspection?month=${encodeURIComponent(report.month)}&store=${encodeURIComponent(report.selectedStoreId)}`;
  const weakestCategory = report.categoryBreakdown[0] ?? null;

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Reports</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serifTc text-3xl font-semibold">巡店月報</h1>
            <p className="mt-3 text-sm text-ink/70">
              先看整體評級，再往下看各分類平均、問題排行與店別拆解，這樣才知道問題是出在哪一塊。
            </p>
          </div>
          <Link href={exportHref} className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            匯出 CSV
          </Link>
        </div>
      </div>

      <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
        <form className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-ink/70">月份</label>
            <input
              type="month"
              name="month"
              defaultValue={report.month}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </div>
          {profile.role !== "leader" ? (
            <div>
              <label className="mb-2 block text-sm text-ink/70">店別</label>
              <select
                name="store"
                defaultValue={report.selectedStoreId}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
              >
                <option value="">全部店別</option>
                {report.stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-2 block text-sm text-ink/70">目前店別</label>
              <div className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/75">
                {report.stores[0]?.name ?? "未指定店別"}
              </div>
            </div>
          )}
          <div className="flex items-end gap-3">
            <button type="submit" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
              更新月報
            </button>
            <Link href="/inspection/reports" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/70">
              重設
            </Link>
          </div>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">本月整體評級</p>
          {report.summary.overallGrade ? (
            <p className={`mt-2 inline-flex rounded-full px-4 py-2 text-2xl font-semibold ${getGradeTone(report.summary.overallGrade)}`}>
              {report.summary.overallGrade}
            </p>
          ) : (
            <p className="mt-2 text-lg text-ink/45">尚無資料</p>
          )}
          <p className="mt-2 text-xs text-ink/55">平均分數 {report.summary.averageScore}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">巡店次數</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.totalInspections}</p>
          <p className="mt-2 text-xs text-ink/55">
            A / B / C：{report.summary.gradeCounts.a} / {report.summary.gradeCounts.b} / {report.summary.gradeCounts.c}
          </p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">最弱分類</p>
          {weakestCategory ? (
            <>
              <p className="mt-2 font-serifTc text-2xl font-semibold">{weakestCategory.categoryName}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(weakestCategory.grade)}`}>
                  {weakestCategory.grade}
                </span>
                <span className="text-xs text-ink/55">平均分數 {weakestCategory.averageScore}</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-lg text-ink/45">尚無資料</p>
          )}
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">待改善任務</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.pendingTasks}</p>
          <p className="mt-2 text-xs text-ink/55">已確認 {report.summary.verifiedTasks} 項</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-danger/15 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">必查異常</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold text-danger">
            {report.summary.tagIssueCounts.critical}
          </p>
          <p className="mt-2 text-xs text-ink/55">所有被標記為必查且落在 B / C 的題目數</p>
        </div>
        <div className="rounded-[24px] border border-warm/20 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">本月加強異常</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold text-warm">
            {report.summary.tagIssueCounts.monthlyAttention}
          </p>
          <p className="mt-2 text-xs text-ink/55">這個月特別加強、但目前仍落在 B / C 的題目數</p>
        </div>
        <div className="rounded-[24px] border border-ink/15 bg-white px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">客訴項目異常</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold text-ink">
            {report.summary.tagIssueCounts.complaintWatch}
          </p>
          <p className="mt-2 text-xs text-ink/55">目前被標記為客訴項目且落在 B / C 的題目數</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Category Health</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">各大項表現</h2>
          <div className="mt-5 grid gap-3">
            {report.categoryBreakdown.map((category) => (
              <div key={category.categoryName} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{category.categoryName}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      平均分數 {category.averageScore} / 共 {category.itemCount} 題 / 需關注 {category.attentionCount} 題
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(category.grade)}`}>
                    {category.grade}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-warm"
                    style={{ width: widthPercent(category.attentionCount, maxCategoryAttention) }}
                  />
                </div>
                <p className="mt-2 text-sm text-ink/65">
                  A / B / C：{category.counts.a} / {category.counts.b} / {category.counts.c}
                </p>
              </div>
            ))}
            {report.categoryBreakdown.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                這個月份還沒有足夠資料建立分類評級。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Top Problems</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">最常出現的低分項</h2>
          <div className="mt-5 grid gap-3">
            {report.topProblemItems.map((item) => (
              <div key={item.itemId} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{item.itemName}</p>
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(item.averageGrade)}`}>
                    {item.averageGrade}
                  </span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-danger"
                    style={{ width: widthPercent(item.occurrences, maxProblemOccurrences) }}
                  />
                </div>
                <p className="mt-2 text-sm text-ink/65">
                  出現 {item.occurrences} 次 / 平均分數 {item.averageScore}
                </p>
              </div>
            ))}
            {report.topProblemItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                目前沒有低分排行，代表這個月還沒有低分題目資料。
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Store Breakdown</p>
        <h2 className="mt-2 font-serifTc text-2xl font-semibold">店別表現拆解</h2>
        <div className="mt-5 grid gap-3">
          {report.storeBreakdown.map((store) => (
            <div key={store.storeId} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-ink">{store.storeName}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    巡店 {store.inspections} 次 / 平均分數 {store.averageScore} / 低分題數 {store.lowScoreCount}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(store.overallGrade)}`}>
                  {store.overallGrade}
                </span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white">
                <div
                  className="h-2 rounded-full bg-ink"
                  style={{ width: widthPercent(store.inspections, maxStoreInspections) }}
                />
              </div>
            </div>
          ))}
          {report.storeBreakdown.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
              目前沒有店別統計資料。
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
