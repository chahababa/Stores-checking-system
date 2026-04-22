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

function gradeChipClass(grade: InspectionGrade) {
  if (grade === "A") return "nb-chip-green";
  if (grade === "B") return "nb-chip-yellow";
  return "nb-chip-red";
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
      {/* Page header */}
      <div className="nb-card p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="nb-eyebrow">Reports</p>
          <h1 className="nb-h1 mt-2">巡店月報</h1>
          <p className="mt-3 text-sm text-nb-ink/70 leading-6 max-w-xl">
            先看整體評級，再往下看各分類平均、問題排行與店別拆解，方便抓出問題出在哪一塊。
          </p>
        </div>
        <Link href={exportHref} className="nb-btn-yellow">
          ⬇ 匯出 CSV
        </Link>
      </div>

      {/* Filter */}
      <section className="nb-card p-6">
        <div className="nb-divider">
          <p className="nb-eyebrow">Filters</p>
          <h2 className="nb-h2 mt-1">篩選條件</h2>
        </div>
        <form className="mt-5 grid gap-4 md:grid-cols-3 md:items-end">
          <div>
            <label className="nb-label">月份</label>
            <input type="month" name="month" defaultValue={report.month} className="nb-input" />
          </div>
          {profile.role !== "leader" ? (
            <div>
              <label className="nb-label">店別</label>
              <select name="store" defaultValue={report.selectedStoreId} className="nb-select">
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
              <label className="nb-label">目前店別</label>
              <div className="nb-card-flat px-4 py-3 text-sm font-bold">{report.stores[0]?.name ?? "未指定店別"}</div>
            </div>
          )}
          <div className="flex items-end gap-3">
            <button type="submit" className="nb-btn-primary">
              更新月報
            </button>
            <Link href="/inspection/reports" className="nb-btn">
              重設
            </Link>
          </div>
        </form>
      </section>

      {/* KPI row */}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="nb-kpi">
          <p className="nb-eyebrow">Overall</p>
          {report.summary.overallGrade ? (
            <p className={`mt-2 inline-flex px-3 py-1 text-2xl font-black ${gradeChipClass(report.summary.overallGrade)}`}>
              {report.summary.overallGrade}
            </p>
          ) : (
            <p className="mt-2 text-lg text-nb-ink/45 font-bold">尚無資料</p>
          )}
          <p className="mt-2 text-xs text-nb-ink/60 font-bold">平均分數 {report.summary.averageScore}</p>
        </div>
        <div className="nb-kpi">
          <p className="nb-eyebrow">Inspections</p>
          <p className="mt-2 font-nbSerif text-3xl font-black">{report.summary.totalInspections}</p>
          <p className="mt-2 text-xs text-nb-ink/60 font-bold">
            A / B / C：{report.summary.gradeCounts.a} / {report.summary.gradeCounts.b} / {report.summary.gradeCounts.c}
          </p>
        </div>
        <div className="nb-kpi">
          <p className="nb-eyebrow">Weakest Category</p>
          {weakestCategory ? (
            <>
              <p className="mt-2 font-nbSerif text-xl font-black">{weakestCategory.categoryName}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className={gradeChipClass(weakestCategory.grade)}>{weakestCategory.grade}</span>
                <span className="text-xs text-nb-ink/60 font-nbMono">平均 {weakestCategory.averageScore}</span>
              </div>
            </>
          ) : (
            <p className="mt-2 text-lg text-nb-ink/45 font-bold">尚無資料</p>
          )}
        </div>
        <div className="nb-kpi">
          <p className="nb-eyebrow">Tasks</p>
          <p className="mt-2 font-nbSerif text-3xl font-black">{report.summary.pendingTasks}</p>
          <p className="mt-2 text-xs text-nb-ink/60 font-bold">已確認 {report.summary.verifiedTasks} 項</p>
        </div>
      </div>

      {/* Tag issues */}
      <div className="grid gap-3 md:grid-cols-3">
        <div className="nb-kpi border-nb-red">
          <p className="nb-eyebrow">Critical</p>
          <p className="mt-2 font-nbSerif text-3xl font-black text-nb-red">{report.summary.tagIssueCounts.critical}</p>
          <p className="mt-2 text-xs text-nb-ink/60 font-bold">必查題目落在 B / C 的總數</p>
        </div>
        <div className="nb-kpi bg-nb-yellow/20">
          <p className="nb-eyebrow">Monthly Attention</p>
          <p className="mt-2 font-nbSerif text-3xl font-black">{report.summary.tagIssueCounts.monthlyAttention}</p>
          <p className="mt-2 text-xs text-nb-ink/60 font-bold">本月加強題目落在 B / C 的總數</p>
        </div>
        <div className="nb-kpi">
          <p className="nb-eyebrow">Complaint Watch</p>
          <p className="mt-2 font-nbSerif text-3xl font-black">{report.summary.tagIssueCounts.complaintWatch}</p>
          <p className="mt-2 text-xs text-nb-ink/60 font-bold">客訴題目落在 B / C 的總數</p>
        </div>
      </div>

      {/* Category + Top Problems */}
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="nb-card p-6">
          <div className="nb-divider">
            <p className="nb-eyebrow">Category Health</p>
            <h2 className="nb-h2 mt-1">各大項表現</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {report.categoryBreakdown.map((category) => (
              <div key={category.categoryName} className="nb-row">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-nbSerif text-lg font-black">{category.categoryName}</p>
                    <p className="mt-1 text-xs text-nb-ink/60 font-bold font-nbMono">
                      平均 {category.averageScore} · 共 {category.itemCount} 題 · 需關注 {category.attentionCount} 題
                    </p>
                  </div>
                  <span className={gradeChipClass(category.grade)}>{category.grade}</span>
                </div>
                <div className="mt-3 h-3 bg-nb-bg2 border-[2px] border-nb-ink">
                  <div
                    className="h-full bg-nb-yellow border-r-[2px] border-nb-ink"
                    style={{ width: widthPercent(category.attentionCount, maxCategoryAttention) }}
                  />
                </div>
                <p className="mt-2 text-xs text-nb-ink/70 font-nbMono font-bold">
                  A / B / C：{category.counts.a} / {category.counts.b} / {category.counts.c}
                </p>
              </div>
            ))}
            {report.categoryBreakdown.length === 0 && <div className="nb-empty">這個月份還沒有足夠資料建立分類評級。</div>}
          </div>
        </section>

        <section className="nb-card p-6">
          <div className="nb-divider">
            <p className="nb-eyebrow">Top Problems</p>
            <h2 className="nb-h2 mt-1">最常出現的低分項</h2>
          </div>
          <div className="mt-5 grid gap-3">
            {report.topProblemItems.map((item) => (
              <div key={item.itemId} className="nb-row">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-nbSerif text-base font-black">{item.itemName}</p>
                  <span className={gradeChipClass(item.averageGrade)}>{item.averageGrade}</span>
                </div>
                <div className="mt-3 h-3 bg-nb-bg2 border-[2px] border-nb-ink">
                  <div
                    className="h-full bg-nb-red border-r-[2px] border-nb-ink"
                    style={{ width: widthPercent(item.occurrences, maxProblemOccurrences) }}
                  />
                </div>
                <p className="mt-2 text-xs text-nb-ink/70 font-nbMono font-bold">
                  出現 {item.occurrences} 次 · 平均分數 {item.averageScore}
                </p>
              </div>
            ))}
            {report.topProblemItems.length === 0 && <div className="nb-empty">這個月還沒有低分題目資料。</div>}
          </div>
        </section>
      </div>

      {/* Store breakdown */}
      <section className="nb-card p-6">
        <div className="nb-divider">
          <p className="nb-eyebrow">Store Breakdown</p>
          <h2 className="nb-h2 mt-1">店別表現拆解</h2>
        </div>
        <div className="mt-5 grid gap-3">
          {report.storeBreakdown.map((store) => (
            <div key={store.storeId} className="nb-row">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-nbSerif text-lg font-black">{store.storeName}</p>
                  <p className="mt-1 text-xs text-nb-ink/60 font-bold font-nbMono">
                    巡店 {store.inspections} 次 · 平均 {store.averageScore} · 低分題數 {store.lowScoreCount}
                  </p>
                </div>
                <span className={gradeChipClass(store.overallGrade)}>{store.overallGrade}</span>
              </div>
              <div className="mt-3 h-3 bg-nb-bg2 border-[2px] border-nb-ink">
                <div
                  className="h-full bg-nb-ink"
                  style={{ width: widthPercent(store.inspections, maxStoreInspections) }}
                />
              </div>
            </div>
          ))}
          {report.storeBreakdown.length === 0 && <div className="nb-empty">目前沒有店別統計資料。</div>}
        </div>
      </section>
    </div>
  );
}
