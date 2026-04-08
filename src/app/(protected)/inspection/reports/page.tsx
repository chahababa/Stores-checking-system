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
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Monthly Report</p>
        <div className="mt-2 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="font-serifTc text-3xl font-semibold">Inspection Report</h1>
            <p className="mt-3 text-sm text-ink/70">
              Review inspection volume, score trends, recurring problems, and store-level performance for a single
              month.
            </p>
          </div>
          <Link href={exportHref} className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            Export CSV
          </Link>
        </div>
      </div>

      <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <form className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm text-ink/70">Month</label>
            <input
              type="month"
              name="month"
              defaultValue={report.month}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-ink/70">Store</label>
            <select
              name="store"
              defaultValue={report.selectedStoreId}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            >
              <option value="">All stores</option>
              {report.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <button type="submit" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
              Update Report
            </button>
            <Link href="/inspection/reports" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/70">
              Reset
            </Link>
          </div>
        </form>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">Total Inspections</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.totalInspections}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">Average Score</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.averageScore}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">Low Score Items</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.lowScoreCount}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">Stores Covered</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.storesCovered}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">Pending Tasks</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.pendingTasks}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">Verified Tasks</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{report.summary.verifiedTasks}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Recurring Issues</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">Top Problem Items</h2>
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
                  {item.occurrences} low-score occurrences · average score {item.averageScore}
                </p>
              </div>
            ))}
            {report.topProblemItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                No recurring low-score items in this month.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Store Breakdown</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">Store Performance</h2>
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
                  {store.inspections} inspections · average score {store.averageScore} · low-score items{" "}
                  {store.lowScoreCount}
                </p>
              </div>
            ))}
            {report.storeBreakdown.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                No store data found for this month.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
