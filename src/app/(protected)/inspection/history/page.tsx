import Link from "next/link";

import { requireRole } from "@/lib/auth";
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
    .select("id, date, time_slot, total_score, created_at, store_id, is_editable, stores(name), users(email)")
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
    throw new Error(storesError?.message || inspectionsError?.message || "Failed to load inspection history.");
  }

  const totalInspections = inspections?.length ?? 0;
  const averageScore =
    totalInspections > 0
      ? (
          (inspections ?? []).reduce((sum, inspection) => sum + Number(inspection.total_score ?? 0), 0) / totalInspections
        ).toFixed(2)
      : "0.00";
  const lowScoreCount = (inspections ?? []).filter((inspection) => Number(inspection.total_score ?? 0) < 2.5).length;
  const coveredStores = new Set((inspections ?? []).map((inspection) => inspection.store_id)).size;

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Inspection History</p>
          <h1 className="mt-2 font-serifTc text-3xl font-semibold">Inspection Records</h1>
        </div>
        {(profile.role === "owner" || profile.role === "manager") && (
          <Link href="/inspection/new" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            New Inspection
          </Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Filters</p>
          <h2 className="mt-2 font-serifTc text-2xl font-semibold">History Scope</h2>

          <form className="mt-5 grid gap-4 md:grid-cols-2">
            {profile.role !== "leader" && (
              <div>
                <label className="mb-2 block text-sm text-ink/70">Store</label>
                <select
                  name="store"
                  defaultValue={selectedStoreId}
                  className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                >
                  <option value="">All stores</option>
                  {stores?.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm text-ink/70">Month</label>
              <input
                type="month"
                name="month"
                defaultValue={month}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </div>

            <div className="flex items-end gap-3">
              <button type="submit" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
                Apply Filters
              </button>
              <Link href="/inspection/history" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/70">
                Reset
              </Link>
            </div>
          </form>
        </div>

        <div className="grid gap-3">
          <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">Inspections</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{totalInspections}</p>
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">Average Score</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{averageScore}</p>
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">Low Score Visits</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{lowScoreCount}</p>
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">Stores Covered</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{coveredStores}</p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-ink/10 bg-white/85 shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-soft/40 text-ink/70">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Store</th>
              <th className="px-4 py-3">Time Slot</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Inspector</th>
            </tr>
          </thead>
          <tbody>
            {(inspections ?? []).map((inspection) => (
              <tr key={inspection.id} className="border-t border-ink/10">
                <td className="px-4 py-3">{inspection.date}</td>
                <td className="px-4 py-3">{inspection.stores?.[0]?.name ?? "-"}</td>
                <td className="px-4 py-3">{inspection.time_slot}</td>
                <td className="px-4 py-3">{inspection.total_score}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      inspection.is_editable ? "bg-warm/15 text-warm" : "bg-ink/10 text-ink/70"
                    }`}
                  >
                    {inspection.is_editable ? "Editable" : "Locked"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span>{inspection.users?.[0]?.email ?? "-"}</span>
                    <Link
                      href={`/inspection/history/${inspection.id}`}
                      className="text-warm underline-offset-4 hover:underline"
                    >
                      View
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
            {!inspections?.length && (
              <tr>
                <td className="px-4 py-8 text-center text-ink/60" colSpan={6}>
                  No inspection records found for the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
