import Link from "next/link";

import { getInspectionMonthlyReport } from "@/lib/inspection";
import { formatMonthValue } from "@/lib/utils";

type SearchParams = Promise<{ month?: string; store?: string }>;

function widthPercent(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

export default async function InspectionReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const report = await getInspectionMonthlyReport({
    month: formatMonthValue(params.month),
    storeId: params.store,
  });

  const maxProblemOccurrences = Math.max(...report.topProblemItems.map((item) => item.occurrences), 0);
  const maxStoreInspections = Math.max(...report.storeBreakdown.map((store) => store.inspections), 0);
  const exportHref = `/api/reports/inspection?month=${encodeURIComponent(report.month)}&store=${encodeURIComponent(report.selectedStoreId)}`;

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">月報</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serifTc text-3xl font-semibold">巡店月報</h1>
            <p className="mt-3 text-sm text-ink/70">
              查看單月的巡店量、分數趨勢、常見問題，以及各店的整體表現。
            </p>
          </div>
          <Link href={exportHref} className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            匯出 CSV
          </Link>
        </div>
      </div>

      <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
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
          <div className="flex items-end gap-3">
            <button type="submit" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
              更新報表
            </button>
            <Link href="/inspection/reports" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/70">
              重設
            </Link>
          </div>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">巡店次數</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.totalInspections}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">平均分數</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.averageScore}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">低分項目數</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.lowScoreCount}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">涵蓋店數</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.storesCovered}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">待處理任務</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.pendingTasks}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">已確認任務</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.verifiedTasks}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">常見問題</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">常見低分題目</h2>
          <div className="mt-5 grid gap-3">
            {report.topProblemItems.map((item) => (
              <div key={item.itemId} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{item.itemName}</p>
                  <span className="text-sm text-ink/60">{item.occurrences}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-warm"
                    style={{ width: widthPercent(item.occurrences, maxProblemOccurrences) }}
                  />
                </div>
                <p className="mt-2 text-sm text-ink/65">
                  共出現 {item.occurrences} 次低分，平均分數 {item.averageScore}
                </p>
              </div>
            ))}
            {report.topProblemItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                本月沒有重複出現的低分題目。
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">各店拆解</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">各店表現</h2>
          <div className="mt-5 grid gap-3">
            {report.storeBreakdown.map((store) => (
              <div key={store.storeId} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-ink">{store.storeName}</p>
                  <span className="text-sm text-ink/60">{store.inspections}</span>
                </div>
                <div className="mt-3 h-2 rounded-full bg-white">
                  <div
                    className="h-2 rounded-full bg-ink"
                    style={{ width: widthPercent(store.inspections, maxStoreInspections) }}
                  />
                </div>
                <p className="mt-2 text-sm text-ink/65">
                  巡店 {store.inspections} 次 / 平均分數 {store.averageScore} / 低分項目 {store.lowScoreCount}
                </p>
              </div>
            ))}
            {report.storeBreakdown.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                本月查無店別資料。
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
