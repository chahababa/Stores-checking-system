import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  buildCategoryGrades,
  buildOverallInspectionGrade,
  type InspectionGrade,
  type InspectionTagType,
} from "@/lib/grading";
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

function getGradeTone(grade: InspectionGrade) {
  if (grade === "A") return "bg-green-100 text-green-700";
  if (grade === "B") return "bg-warm/15 text-warm";
  return "bg-danger/10 text-danger";
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
    .select("id, date, time_slot, total_score, created_at, store_id, stores(id, name), inspection_scores(score, applied_tag_types, inspection_items(categories(name)))")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  let tasksQuery = admin
    .from("improvement_tasks")
    .select(
      "id, status, created_at, store_id, item_id, stores(id, name), inspection_items(id, name), inspection_scores(id, score, note, inspection_id, inspections(date))",
    )
    .order("created_at", { ascending: false });
  let storesQuery = admin.from("stores").select("id, name").order("name");
  let staffQuery = admin.from("staff_members").select("id, store_id, status").order("created_at", { ascending: false });

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
  const allScores = inspectionRows.flatMap((inspection) =>
    (inspection.inspection_scores ?? []).map((row) => {
      const item = getSingleRelation(row.inspection_items) as { categories?: unknown } | null;
      const category = item ? (getSingleRelation(item.categories as never) as { name?: string } | null) : null;
      return {
        categoryName: category?.name ?? "未分類",
        score: row.score,
        tagTypes: row.applied_tag_types ?? [],
      };
    }),
  );
  const overallGrade = allScores.length > 0 ? buildOverallInspectionGrade(allScores) : null;
  const categoryGrades = buildCategoryGrades(allScores).sort(
    (left, right) => Number(left.averageScore) - Number(right.averageScore),
  );
  const weakestCategories = categoryGrades.slice(0, 3);
  const strongestCategories = [...categoryGrades].sort((left, right) => Number(right.averageScore) - Number(left.averageScore)).slice(0, 3);

  const totalInspections = inspectionRows.length;
  const averageScore =
    totalInspections > 0
      ? Number(
          (
            inspectionRows.reduce((sum, inspection) => sum + Number(inspection.total_score ?? 0), 0) / totalInspections
          ).toFixed(2),
        )
      : 0;
  const pendingTasks = taskRows.filter((task) => task.status === "pending").length;
  const verifiedTasks = taskRows.filter((task) => task.status === "verified").length;
  const activeStaffCount = staffRows.filter((staff) => staff.status === "active").length;
  const lowScoreInspections = inspectionRows.filter((inspection) => Number(inspection.total_score ?? 0) < 2.5).length;
  const managedStoreCount = storeRows.length;
  const latestInspection = inspectionRows[0] ?? null;

  const quickLinks =
    profile.role === "leader"
      ? [
          { href: "/inspection/history", label: "查看巡店紀錄" },
          { href: "/inspection/improvements", label: "查看改善追蹤" },
          { href: "/inspection/reports", label: "查看報表" },
          { href: "/settings/staff", label: "管理組員" },
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
          inspections: number;
          scores: Array<{ categoryName: string; score: 1 | 2 | 3; tagTypes: InspectionTagType[] }>;
          totalScore: number;
        }
      >
    >((carry, inspection) => {
      const store = getSingleRelation(inspection.stores) as { name?: string } | null;

      if (!carry[inspection.store_id]) {
        carry[inspection.store_id] = {
          storeName: store?.name ?? "未命名店別",
          inspections: 0,
          scores: [],
          totalScore: 0,
        };
      }

      carry[inspection.store_id].inspections += 1;
      carry[inspection.store_id].totalScore += Number(inspection.total_score ?? 0);
      carry[inspection.store_id].scores.push(
        ...(inspection.inspection_scores ?? []).map((row) => {
          const item = getSingleRelation(row.inspection_items) as { categories?: unknown } | null;
          const category = item ? (getSingleRelation(item.categories as never) as { name?: string } | null) : null;
          return {
            categoryName: category?.name ?? "未分類",
            score: row.score,
            tagTypes: row.applied_tag_types ?? [],
          };
        }),
      );
      return carry;
    }, {}),
  )
    .map((entry) => ({
      ...entry,
      averageScore: Number((entry.totalScore / entry.inspections).toFixed(2)),
      overallGrade: buildOverallInspectionGrade(entry.scores).finalGrade,
    }))
    .sort((left, right) => Number(left.averageScore) - Number(right.averageScore))
    .slice(0, 4);

  const pendingTaskHighlights = taskRows
    .filter((task) => task.status === "pending")
    .slice(0, 4)
    .map((task) => {
      const store = getSingleRelation(task.stores) as { name?: string } | null;
      const item = getSingleRelation(task.inspection_items) as { name?: string } | null;
      const score = getSingleRelation(task.inspection_scores) as
        | { score?: 1 | 2 | 3; note?: string | null; inspections?: unknown }
        | null;
      const inspection = score ? (getSingleRelation(score.inspections as never) as { date?: string } | null) : null;

      return {
        id: task.id,
        storeName: store?.name ?? "未指定店別",
        itemName: item?.name ?? "未命名題目",
        score: score?.score ?? null,
        note: score?.note ?? null,
        inspectionDate: inspection?.date ?? null,
      };
    });

  const latestInspectionRows = inspectionRows.slice(0, 5).map((inspection) => {
    const store = getSingleRelation(inspection.stores) as { name?: string } | null;
    const scoreRows = (inspection.inspection_scores ?? []).map((row) => {
      const item = getSingleRelation(row.inspection_items) as { categories?: unknown } | null;
      const category = item ? (getSingleRelation(item.categories as never) as { name?: string } | null) : null;
      return {
        categoryName: category?.name ?? "未分類",
        score: row.score,
        tagTypes: row.applied_tag_types ?? [],
      };
    });

    return {
      id: inspection.id,
      date: inspection.date,
      timeSlot: inspection.time_slot,
      storeName: store?.name ?? "未指定店別",
      averageScore: Number(inspection.total_score ?? 0),
      grade: buildOverallInspectionGrade(scoreRows).finalGrade,
    };
  });

  const leaderChecklist = [
    {
      title: "待改善任務",
      value: `${pendingTasks} 項`,
      description:
        pendingTasks > 0
          ? "今天先優先處理待改善任務，避免低分項持續累積。"
          : "目前沒有待改善任務，維持現況並繼續追蹤重點項目。",
    },
    {
      title: "最弱分類",
      value: weakestCategories[0] ? weakestCategories[0].grade : "-",
      description: weakestCategories[0]
        ? `${weakestCategories[0].categoryName} 平均分數 ${weakestCategories[0].averageScore.toFixed(2)}，建議先從這一類改善。`
        : "這個月還沒有足夠資料建立分類評級。",
    },
    {
      title: "最近巡店",
      value: latestInspection ? latestInspection.date : "尚無資料",
      description: latestInspection
        ? `最近一次巡店在 ${latestInspection.time_slot}，請回頭確認低分與待改善任務。`
        : "目前還沒有巡店紀錄，建議先完成第一筆巡店。",
    },
  ];

  return (
    <AppShell profile={profile} pathname="/">
      <div className="grid gap-6">
        <section className="overflow-hidden rounded-[32px] border border-ink/10 bg-white shadow-card">
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
                  ? "先看本店總評、最弱分類與待改善任務，再決定今天要先處理哪幾件事。"
                  : "先看跨店整體評級，再往下看各分類健康度、弱店別與待改善任務。"}
              </p>
            </div>

            <div className="rounded-[28px] border border-warm/15 bg-gradient-to-br from-cream via-white to-soft p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-warm">
                {profile.role === "leader" ? "Store Snapshot" : "Network Snapshot"}
              </p>
              <div className="mt-4 grid gap-4">
                <div>
                  <p className="text-sm text-ink/60">{profile.role === "leader" ? "目前店別" : "管理店數"}</p>
                  <p className="mt-1 font-serifTc text-2xl font-semibold text-ink">
                    {profile.role === "leader" ? storeRows[0]?.name ?? "未指定店別" : `${managedStoreCount} 間店`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-white/90 px-4 py-3">
                    <p className="text-xs text-ink/55">本月總評</p>
                    {overallGrade ? (
                      <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-2xl font-semibold ${getGradeTone(overallGrade.finalGrade)}`}>
                        {overallGrade.finalGrade}
                      </p>
                    ) : (
                      <p className="mt-2 text-lg text-ink/45">-</p>
                    )}
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
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">{profile.role === "leader" ? "本店總評" : "本月總評"}</p>
            {overallGrade ? (
              <p className={`mt-2 inline-flex rounded-full px-4 py-2 text-2xl font-semibold ${getGradeTone(overallGrade.finalGrade)}`}>
                {overallGrade.finalGrade}
              </p>
            ) : (
              <p className="mt-2 text-lg text-ink/45">尚無資料</p>
            )}
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">{profile.role === "leader" ? "本店巡店次數" : "本月巡店次數"}</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{totalInspections}</p>
            {overallGrade ? (
              <p className="mt-2 text-xs text-ink/55">
                A / B / C：{overallGrade.counts.a} / {overallGrade.counts.b} / {overallGrade.counts.c}
              </p>
            ) : null}
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">待改善任務</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{pendingTasks}</p>
            <p className="mt-2 text-xs text-ink/55">已確認 {verifiedTasks} 項</p>
          </div>
          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-4 shadow-card">
            <p className="text-sm text-ink/60">{profile.role === "leader" ? "本店在職組員" : "在職組員數"}</p>
            <p className="mt-2 font-serifTc text-3xl font-semibold">{activeStaffCount}</p>
            <p className="mt-2 text-xs text-ink/55">低分巡店 {lowScoreInspections} 次</p>
          </div>
        </section>

        {profile.role === "leader" ? (
          <div className="grid gap-6">
            <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
              <div>
                <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Today Focus</p>
                <h2 className="mt-2 font-serifTc text-2xl font-semibold">今天先看這三件事</h2>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
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
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Category Health</p>
                    <h2 className="mt-2 font-serifTc text-2xl font-semibold">本店分類表現</h2>
                  </div>
                </div>
                <div className="mt-5 grid gap-3">
                  {weakestCategories.map((category) => (
                    <div key={category.categoryName} className="rounded-[22px] border border-ink/10 bg-soft/40 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{category.categoryName}</p>
                          <p className="mt-1 text-sm text-ink/60">
                            平均分數 {category.averageScore.toFixed(2)} / A、B、C：{category.counts.a}、{category.counts.b}、{category.counts.c}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(category.grade)}`}>
                          {category.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                  {weakestCategories.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                      這個月還沒有足夠資料建立分類評級。
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Action Queue</p>
                    <h2 className="mt-2 font-serifTc text-2xl font-semibold">本店待改善清單</h2>
                  </div>
                  <Link href="/inspection/improvements" className="text-sm text-warm underline-offset-4 hover:underline">
                    查看全部
                  </Link>
                </div>
                <div className="mt-5 grid gap-3">
                  {pendingTaskHighlights.map((task) => (
                    <div key={task.id} className="rounded-[22px] border border-ink/10 bg-white px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{task.itemName}</p>
                          <p className="mt-1 text-sm text-ink/60">
                            {task.storeName}
                            {task.inspectionDate ? ` / ${task.inspectionDate}` : ""}
                            {task.score ? ` / 分數 ${task.score}` : ""}
                          </p>
                        </div>
                        <span className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">待處理</span>
                      </div>
                      {task.note ? <p className="mt-3 text-sm leading-6 text-ink/70">{task.note}</p> : null}
                    </div>
                  ))}
                  {pendingTaskHighlights.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                      目前沒有待改善任務，今天可以優先巡查必查項目與客訴項目。
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Recent Activity</p>
                  <h2 className="mt-2 font-serifTc text-2xl font-semibold">本店最近巡店紀錄</h2>
                </div>
                <Link href="/inspection/history" className="text-sm text-warm underline-offset-4 hover:underline">
                  查看全部
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {latestInspectionRows.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="text-sm text-ink/55">{inspection.date}</p>
                      <p className="mt-1 text-base font-medium text-ink">
                        {inspection.storeName} / {inspection.timeSlot}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(inspection.grade)}`}>
                        {inspection.grade}
                      </span>
                      <Link
                        href={`/inspection/history/${inspection.id}`}
                        className="rounded-full bg-soft px-4 py-2 text-sm text-ink/75 transition hover:bg-warm hover:text-white"
                      >
                        查看明細
                      </Link>
                    </div>
                  </div>
                ))}
                {latestInspectionRows.length === 0 && (
                  <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                    目前還沒有巡店紀錄，建議先完成第一筆巡店。
                  </div>
                )}
              </div>
            </section>

            <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
              <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Quick Actions</p>
              <h2 className="mt-2 font-serifTc text-2xl font-semibold">店長常用入口</h2>
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
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-6">
              <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Category Health</p>
                    <h2 className="mt-2 font-serifTc text-2xl font-semibold">各分類健康度</h2>
                  </div>
                  <Link href="/inspection/reports" className="text-sm text-warm underline-offset-4 hover:underline">
                    查看報表
                  </Link>
                </div>
                <div className="mt-5 grid gap-3">
                  {weakestCategories.map((category) => (
                    <div key={category.categoryName} className="rounded-[22px] border border-ink/10 bg-soft/40 px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{category.categoryName}</p>
                          <p className="mt-1 text-sm text-ink/60">
                            平均分數 {category.averageScore.toFixed(2)} / A、B、C：{category.counts.a}、{category.counts.b}、{category.counts.c}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(category.grade)}`}>
                          {category.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                  {weakestCategories.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                      這個月還沒有足夠資料建立分類評級。
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Recent Activity</p>
                    <h2 className="mt-2 font-serifTc text-2xl font-semibold">最近巡店紀錄</h2>
                  </div>
                  <Link href="/inspection/history" className="text-sm text-warm underline-offset-4 hover:underline">
                    查看全部
                  </Link>
                </div>

                <div className="mt-5 grid gap-3">
                  {latestInspectionRows.map((inspection) => (
                    <div
                      key={inspection.id}
                      className="flex flex-col gap-3 rounded-[22px] border border-ink/10 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm text-ink/55">{inspection.date}</p>
                        <p className="mt-1 text-base font-medium text-ink">
                          {inspection.storeName} / {inspection.timeSlot}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(inspection.grade)}`}>
                          {inspection.grade}
                        </span>
                        <Link
                          href={`/inspection/history/${inspection.id}`}
                          className="rounded-full bg-soft px-4 py-2 text-sm text-ink/75 transition hover:bg-warm hover:text-white"
                        >
                          查看明細
                        </Link>
                      </div>
                    </div>
                  ))}
                  {latestInspectionRows.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                      目前還沒有巡店紀錄，先從新增巡店開始建立本月資料。
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6">
              <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
                <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Store Overview</p>
                <h2 className="mt-2 font-serifTc text-2xl font-semibold">店別表現一覽</h2>
                <div className="mt-5 grid gap-3">
                  {groupedByStore.map((store) => (
                    <div key={store.storeName} className="rounded-[22px] border border-ink/10 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">{store.storeName}</p>
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(store.overallGrade)}`}>
                          {store.overallGrade}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink/60">
                        巡店 {store.inspections} 次 / 平均分數 {store.averageScore.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {groupedByStore.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                      目前沒有跨店統計資料。
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
                <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Strongest Categories</p>
                <h2 className="mt-2 font-serifTc text-2xl font-semibold">目前表現較穩的分類</h2>
                <div className="mt-5 grid gap-3">
                  {strongestCategories.map((category) => (
                    <div key={category.categoryName} className="rounded-[22px] border border-ink/10 bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-ink">{category.categoryName}</p>
                        <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(category.grade)}`}>
                          {category.grade}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-ink/60">平均分數 {category.averageScore.toFixed(2)}</p>
                    </div>
                  ))}
                  {strongestCategories.length === 0 && (
                    <div className="rounded-[22px] border border-dashed border-ink/15 px-4 py-8 text-sm text-ink/60">
                      目前沒有足夠資料建立強項分類。
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[28px] border border-ink/10 bg-white p-6 shadow-card">
                <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Quick Actions</p>
                <h2 className="mt-2 font-serifTc text-2xl font-semibold">常用入口</h2>
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
        )}
      </div>
    </AppShell>
  );
}
