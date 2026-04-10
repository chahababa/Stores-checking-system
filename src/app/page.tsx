import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

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

function getScoreTone(score: number) {
  if (score >= 2.8) return "text-emerald-700 bg-emerald-50";
  if (score >= 2.4) return "text-amber-700 bg-amber-50";
  return "text-danger bg-danger/10";
}

export default async function HomePage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  if (profile.role === "leader" && !profile.store_id) {
    redirect("/pending");
  }

  const admin = createAdminClient();
  const month = new Date().toISOString().slice(0, 7);
  const { start, end } = getMonthRange(month);

  let inspectionsQuery = admin
    .from("inspections")
    .select("id, date, time_slot, total_score, created_at, store_id, stores(id, name)")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  let tasksQuery = admin
    .from("improvement_tasks")
    .select("id, status, store_id, created_at")
    .order("created_at", { ascending: false });
  let storesQuery = admin.from("stores").select("id, name").order("name");
  let staffQuery = admin
    .from("staff_members")
    .select("id, store_id, status, archived_at")
    .order("created_at", { ascending: false });

  if (profile.role === "leader" && profile.store_id) {
    inspectionsQuery = inspectionsQuery.eq("store_id", profile.store_id);
    tasksQuery = tasksQuery.eq("store_id", profile.store_id);
    storesQuery = storesQuery.eq("id", profile.store_id);
    staffQuery = staffQuery.eq("store_id", profile.store_id);
  }

  const [{ data: inspections }, { data: tasks }, { data: stores }, { data: staffMembers }] = await Promise.all([
    inspectionsQuery,
    tasksQuery,
    storesQuery,
    staffQuery,
  ]);

  const inspectionRows = inspections ?? [];
  const taskRows = tasks ?? [];
  const storeRows = stores ?? [];
  const staffRows = staffMembers ?? [];

  const totalInspections = inspectionRows.length;
  const averageScore =
    totalInspections > 0
      ? Number(
          (
            inspectionRows.reduce((sum, inspection) => sum + Number(inspection.total_score ?? 0), 0) /
            totalInspections
          ).toFixed(2),
        )
      : 0;
  const pendingTasks = taskRows.filter((task) => task.status === "pending").length;
  const verifiedTasks = taskRows.filter((task) => task.status === "verified").length;
  const activeStaffCount = staffRows.filter((staff) => staff.status === "active").length;
  const archivedStaffCount = staffRows.filter((staff) => staff.status === "archived").length;
  const lowScoreInspections = inspectionRows.filter((inspection) => Number(inspection.total_score ?? 0) < 2.5).length;
  const managedStoreCount = storeRows.length;
  const latestInspection = inspectionRows[0] ?? null;

  const quickLinks =
    profile.role === "leader"
      ? [
          { href: "/inspection/history", label: "查看本店巡店紀錄" },
          { href: "/inspection/improvements", label: "追蹤待改善項目" },
          { href: "/inspection/reports", label: "查看單店報表" },
          { href: "/settings/staff", label: "管理本店組員" },
        ]
      : [
          { href: "/inspection/new", label: "新增巡店" },
          { href: "/inspection/history", label: "巡店紀錄" },
          { href: "/inspection/improvements", label: "改善追蹤" },
          { href: "/inspection/reports", label: "報表分析" },
          { href: "/settings/staff", label: "組員管理" },
          ...(profile.role === "owner" ? [{ href: "/settings/users", label: "帳號管理" }] : []),
        ];

  const groupedByStore = Object.values(
    inspectionRows.reduce<
      Record<
        string,
        {
          storeName: string;
          count: number;
          totalScore: number;
        }
      >
    >((carry, inspection) => {
      const store = getSingleRelation(inspection.stores) as { id?: string; name?: string } | null;
      const storeKey = inspection.store_id;

      if (!carry[storeKey]) {
        carry[storeKey] = {
          storeName: store?.name ?? "未命名店別",
          count: 0,
          totalScore: 0,
        };
      }

      carry[storeKey].count += 1;
      carry[storeKey].totalScore += Number(inspection.total_score ?? 0);
      return carry;
    }, {}),
  )
    .map((entry) => ({
      ...entry,
      averageScore: Number((entry.totalScore / entry.count).toFixed(2)),
    }))
    .sort((left, right) => right.count - left.count || right.averageScore - left.averageScore)
    .slice(0, profile.role === "leader" ? 1 : 4);

  const leaderChecklist = [
    {
      title: "待追蹤改善",
      value: `${pendingTasks} 項`,
      description:
        pendingTasks > 0
          ? "建議先查看改善追蹤頁，安排本店今日優先處理項目。"
          : "目前沒有待改善項目，可以安排下一次巡店前的預檢。 ",
    },
    {
      title: "本店在職組員",
      value: `${activeStaffCount} 人`,
      description:
        archivedStaffCount > 0
          ? `另有 ${archivedStaffCount} 位已封存組員，可在組員管理中確認名單。`
          : "目前沒有已封存組員，班表維護相對單純。",
    },
    {
      title: "最近一次巡店",
      value: latestInspection ? latestInspection.date : "尚無資料",
      description: latestInspection
        ? `最近時段為 ${latestInspection.time_slot}，可進一步確認當次低分項目。`
        : "本月尚未建立巡店紀錄，建議優先安排本店首次巡檢。",
    },
  ];

  return (
    <div className="grid gap-6">
      <section className="overflow-hidden rounded-[32px] border border-ink/10 bg-white/90 shadow-card">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
          <div>
            <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">
              {profile.role === "leader" ? "Store Dashboard" : "Operations Dashboard"}
            </p>
            <h1 className="mt-3 font-serifTc text-3xl font-semibold text-ink">
              {profile.role === "leader" ? "單店營運工作台" : "營運總覽首頁"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink/70">
              {profile.role === "leader"
                ? "這裡聚焦你負責店別的巡店、改善任務與組員現況。進站後可以先看本店待辦，再決定今天要優先追蹤哪一項。"
                : "這裡整理本月巡店、改善任務與各店概況，方便你快速掌握跨店營運狀態，再進入後台做更深入的管理與追蹤。"}
            </p>
          </div>

          <div className="rounded-[28px] border border-warm/15 bg-gradient-to-br from-cream via-white to-soft p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-warm">本月摘要</p>
            <div className="mt-4 grid gap-4">
              <div>
                <p className="text-sm text-ink/60">{profile.role === "leader" ? "目前店別" : "管理範圍"}</p>
                <p className="mt-1 font-serifTc text-2xl font-semibold text-ink">
                  {profile.role === "leader" ? storeRows[0]?.name ?? "未指定店別" : `${managedStoreCount} 間店`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/90 px-4 py-3">
                  <p className="text-xs text-ink/55">巡店次數</p>
                  <p className="mt-2 font-serifTc text-2xl font-semibold">{totalInspections}</p>
                </div>
                <div className="rounded-2xl bg-white/90 px-4 py-3">
                  <p className="text-xs text-ink/55">平均分數</p>
                  <p className="mt-2 font-serifTc text-2xl font-semibold">{averageScore.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">{profile.role === "leader" ? "本店本月巡店次數" : "本月巡店次數"}</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{totalInspections}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">{profile.role === "leader" ? "本店平均分數" : "整體平均分數"}</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{averageScore.toFixed(2)}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">待改善任務</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{pendingTasks}</p>
          <p className="mt-2 text-xs text-ink/55">已確認 {verifiedTasks} 項</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">{profile.role === "leader" ? "本店在職組員" : "在職組員總數"}</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{activeStaffCount}</p>
          <p className="mt-2 text-xs text-ink/55">低分巡店 {lowScoreInspections} 次</p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Recent Activity</p>
              <h2 className="mt-2 font-serifTc text-2xl font-semibold">
                {profile.role === "leader" ? "本店最近巡店紀錄" : "近期巡店動態"}
              </h2>
            </div>
            <Link href="/inspection/history" className="text-sm text-warm underline-offset-4 hover:underline">
              查看全部
            </Link>
          </div>

          <div className="mt-5 grid gap-3">
            {inspectionRows.slice(0, 5).map((inspection) => {
              const store = getSingleRelation(inspection.stores) as { name?: string } | null;
              const score = Number(inspection.total_score ?? 0);

              return (
                <div
                  key={inspection.id}
                  className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="text-sm text-ink/55">{inspection.date}</p>
                    <p className="mt-1 text-base font-medium text-ink">
                      {store?.name ?? "未指定店別"} / {inspection.time_slot}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-3 py-1 text-sm ${getScoreTone(score)}`}>總分 {score.toFixed(2)}</span>
                    <Link
                      href={`/inspection/history/${inspection.id}`}
                      className="rounded-full bg-soft px-4 py-2 text-sm text-ink/75 transition hover:bg-warm hover:text-white"
                    >
                      查看明細
                    </Link>
                  </div>
                </div>
              );
            })}

            {inspectionRows.length === 0 && (
              <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                目前這個月份還沒有巡店紀錄，可以先從巡店頁或歷史頁確認接下來的安排。
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6">
          <section className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
            <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">
              {profile.role === "leader" ? "Today Focus" : "Store Overview"}
            </p>
            <h2 className="mt-2 font-serifTc text-2xl font-semibold">
              {profile.role === "leader" ? "本店今天先看這三件事" : "店別概況"}
            </h2>

            {profile.role === "leader" ? (
              <div className="mt-5 grid gap-3">
                {leaderChecklist.map((item) => (
                  <div key={item.title} className="rounded-[22px] border border-ink/10 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm text-ink/60">{item.title}</p>
                      <span className="rounded-full bg-soft px-3 py-1 text-sm text-ink/75">{item.value}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-ink/70">{item.description}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 grid gap-3">
                {groupedByStore.map((store) => (
                  <div key={store.storeName} className="rounded-[22px] border border-ink/10 bg-white px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-ink">{store.storeName}</p>
                      <span className={`rounded-full px-3 py-1 text-sm ${getScoreTone(store.averageScore)}`}>
                        平均 {store.averageScore.toFixed(2)}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-ink/60">本月巡店 {store.count} 次</p>
                  </div>
                ))}
                {groupedByStore.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                    本月尚無足夠巡店資料，等第一批巡店完成後，這裡會顯示各店的分布概況。
                  </div>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
            <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Quick Actions</p>
            <h2 className="mt-2 font-serifTc text-2xl font-semibold">
              {profile.role === "leader" ? "店長常用入口" : "管理快捷入口"}
            </h2>
            <div className="mt-5 flex flex-wrap gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75 transition hover:bg-warm hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}
