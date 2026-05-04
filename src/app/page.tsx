import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/app-shell";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  buildCategoryGrades,
  buildOverallInspectionGrade,
  buildTagIssueCounts,
  type InspectionGrade,
  type InspectionTagType,
} from "@/lib/grading";
import { buildNotificationFeed, getNotificationLevelLabel, type ReleaseAnnouncement } from "@/lib/notification-rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInspectionTagLabel } from "@/lib/ui-labels";

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

// Neo Brutalism 評級徽章樣式
function getGradeChipClass(grade: InspectionGrade) {
  if (grade === "A") return "bg-nb-green text-nb-ink";
  if (grade === "B") return "bg-nb-yellow text-nb-ink";
  return "bg-nb-red text-white";
}

// Neo Brutalism 通知等級樣式
function getNbNotificationTone(level: "high" | "medium" | "low") {
  if (level === "high") return "bg-nb-red text-white border-nb-ink";
  if (level === "medium") return "bg-nb-yellow text-nb-ink border-nb-ink";
  return "bg-nb-paper text-nb-ink border-nb-ink";
}

function getTagChipClass(tagType: InspectionTagType) {
  if (tagType === "critical") return "bg-nb-red text-white";
  if (tagType === "monthly_attention") return "bg-nb-yellow text-nb-ink";
  return "bg-nb-ink text-white";
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
    .select("id, date, time_slot, total_score, created_at, store_id, stores(id, name), inspection_scores(score, consecutive_weeks, applied_tag_types, inspection_items(name, categories(name)))")
    .gte("date", start)
    .lt("date", end)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });
  let tasksQuery = admin
    .from("improvement_tasks")
    .select(
      "id, status, created_at, store_id, item_id, stores(id, name), inspection_items(id, name), inspection_scores(id, score, note, is_focus_item, applied_tag_types, inspection_id, inspections(date))",
    )
    .order("created_at", { ascending: false });
  let storesQuery = admin.from("stores").select("id, name").order("name");
  let staffQuery = admin.from("staff_members").select("id, store_id, status").order("created_at", { ascending: false });
  let releaseAnnouncementsQuery = admin
    .from("release_announcements")
    .select("id, title, summary, audience, published_on, is_active")
    .lte("published_on", end)
    .order("published_on", { ascending: false })
    .limit(12);

  if (profile.role === "leader" && profile.store_id) {
    inspectionsQuery = inspectionsQuery.eq("store_id", profile.store_id);
    tasksQuery = tasksQuery.eq("store_id", profile.store_id);
    storesQuery = storesQuery.eq("id", profile.store_id);
    staffQuery = staffQuery.eq("store_id", profile.store_id);
    releaseAnnouncementsQuery = releaseAnnouncementsQuery.in("audience", ["all", "leader"]);
  } else {
    releaseAnnouncementsQuery = releaseAnnouncementsQuery.in("audience", ["all", "owner_manager"]);
  }

  const [
    { data: inspections },
    { data: tasks },
    { data: stores },
    { data: staffMembers },
    { data: releaseAnnouncements },
  ] = await Promise.all([
    inspectionsQuery,
    tasksQuery,
    storesQuery,
    staffQuery,
    releaseAnnouncementsQuery,
  ]);

  const inspectionRows = inspections ?? [];
  const taskRows = tasks ?? [];
  const storeRows = stores ?? [];
  const staffRows = staffMembers ?? [];
  const releaseAnnouncementRows: ReleaseAnnouncement[] = (releaseAnnouncements ?? []).map((announcement) => ({
    id: announcement.id,
    title: announcement.title,
    summary: announcement.summary,
    audience: announcement.audience,
    publishedOn: announcement.published_on,
    isActive: announcement.is_active,
  }));
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
  const tagIssueCounts = buildTagIssueCounts(allScores);
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
        | {
            score?: 1 | 2 | 3;
            note?: string | null;
            is_focus_item?: boolean | null;
            applied_tag_types?: InspectionTagType[] | null;
            inspections?: unknown;
          }
        | null;
      const inspection = score ? (getSingleRelation(score.inspections as never) as { date?: string } | null) : null;

      return {
        id: task.id,
        storeName: store?.name ?? "未指定店別",
        itemName: item?.name ?? "未命名題目",
        score: score?.score ?? null,
        note: score?.note ?? null,
        inspectionDate: inspection?.date ?? null,
        isFocusItem: Boolean(score?.is_focus_item),
        tagTypes: ((score?.applied_tag_types as InspectionTagType[] | null | undefined) ?? []).filter(Boolean),
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

  const notificationFeed = buildNotificationFeed({
    inspections: inspectionRows.map((inspection) => {
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
    }),
    pendingTasks,
    releaseAnnouncements: releaseAnnouncementRows,
  });

  const isRealOwner = (profile.impersonating?.realRole ?? profile.role) === "owner";
  const shellStoresQuery = isRealOwner
    ? await admin.from("stores").select("id, name").order("name")
    : null;
  const shellStores = shellStoresQuery?.data ?? [];
  const impersonationStoreName =
    profile.impersonating && profile.store_id
      ? shellStores.find((store) => store.id === profile.store_id)?.name ??
        (await admin.from("stores").select("name").eq("id", profile.store_id).maybeSingle()).data?.name ??
        null
      : null;

  return (
    <AppShell
      profile={profile}
      pathname="/"
      stores={shellStores}
      impersonationStoreName={impersonationStoreName}
    >
      <div className="grid gap-6">
        {/* ===== Hero 區 ===== */}
        <section className="nb-card p-0 overflow-hidden relative">
          {/* 右上角裝飾章 */}
          <div className="absolute top-5 right-5 z-10 hidden md:block">
            <span className="nb-stamp">
              {profile.role === "leader" ? "STORE · 單店" : "OPS · 營運中"}
            </span>
          </div>

          <div className="grid gap-6 px-6 py-7 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
            <div>
              <p className="nb-eyebrow">
                {profile.role === "leader" ? "Store Dashboard · 店長工作台" : "Operations Dashboard · 營運總覽"}
              </p>
              <h1 className="mt-3 font-nbSerif text-4xl md:text-5xl font-black tracking-tight leading-[1.05]">
                {profile.role === "leader" ? "單店營運工作台" : "營運總覽首頁"}
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-7 text-nb-ink/75">
                {profile.role === "leader"
                  ? "先看本店總評、最弱分類與待改善任務，再決定今天要先處理哪幾件事。"
                  : "先看跨店整體評級，再往下看各分類健康度、弱店別與待改善任務。"}
              </p>
            </div>

            <div className="bg-nb-yellow border-[3px] border-nb-ink p-5">
              <p className="nb-eyebrow">
                {profile.role === "leader" ? "Store Snapshot" : "Network Snapshot"}
              </p>
              <div className="mt-4 grid gap-4">
                <div>
                  <p className="text-sm text-nb-ink/70 font-bold">{profile.role === "leader" ? "目前店別" : "管理店數"}</p>
                  <p className="mt-1 font-nbSerif text-3xl font-black">
                    {profile.role === "leader" ? storeRows[0]?.name ?? "未指定店別" : `${managedStoreCount} 間店`}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-nb-paper border-[2.5px] border-nb-ink px-4 py-3">
                    <p className="font-nbMono text-[10px] font-bold tracking-widest uppercase text-nb-ink/60">本月總評</p>
                    {overallGrade ? (
                      <p className={`mt-2 inline-flex items-center justify-center min-w-[3rem] h-12 px-3 border-[2.5px] border-nb-ink font-nbSerif text-3xl font-black ${getGradeChipClass(overallGrade.finalGrade)}`}>
                        {overallGrade.finalGrade}
                      </p>
                    ) : (
                      <p className="mt-2 text-lg text-nb-ink/45 font-bold">-</p>
                    )}
                  </div>
                  <div className="bg-nb-paper border-[2.5px] border-nb-ink px-4 py-3">
                    <p className="font-nbMono text-[10px] font-bold tracking-widest uppercase text-nb-ink/60">平均分數</p>
                    <p className="mt-2 font-nbSerif text-3xl font-black">{averageScore.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== KPI 四格 ===== */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">{profile.role === "leader" ? "本店總評" : "本月總評"}</p>
            {overallGrade ? (
              <p className={`mt-3 inline-flex items-center justify-center min-w-[3.5rem] h-14 px-4 border-[2.5px] border-nb-ink font-nbSerif text-3xl font-black ${getGradeChipClass(overallGrade.finalGrade)}`}>
                {overallGrade.finalGrade}
              </p>
            ) : (
              <p className="mt-3 text-lg text-nb-ink/45 font-bold">尚無資料</p>
            )}
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">{profile.role === "leader" ? "本店巡店次數" : "本月巡店次數"}</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{totalInspections}</p>
            {overallGrade ? (
              <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">
                A / B / C：{overallGrade.counts.a} / {overallGrade.counts.b} / {overallGrade.counts.c}
              </p>
            ) : null}
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">待改善任務</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{pendingTasks}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">已確認 {verifiedTasks} 項</p>
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">{profile.role === "leader" ? "本店在職組員" : "在職組員數"}</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{activeStaffCount}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">低分巡店 {lowScoreInspections} 次</p>
          </div>
        </section>

        {/* ===== 標籤異常三格 ===== */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="nb-card-sm px-5 py-4 bg-nb-red text-white">
            <p className="font-nbMono text-[11px] font-bold uppercase tracking-[0.25em] text-white/85">必查異常</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{tagIssueCounts.critical}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-white/80">目前落在 B / C 的必查題目數</p>
          </div>
          <div className="nb-card-sm px-5 py-4 bg-nb-yellow">
            <p className="font-nbMono text-[11px] font-bold uppercase tracking-[0.25em] text-nb-ink/75">本月加強異常</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{tagIssueCounts.monthlyAttention}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/70">本月加強、但仍落在 B / C 的題目</p>
          </div>
          <div className="nb-card-sm px-5 py-4">
            <p className="nb-eyebrow">客訴項目異常</p>
            <p className="mt-2 font-nbSerif text-4xl font-black">{tagIssueCounts.complaintWatch}</p>
            <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">被標記為客訴且落在 B / C 的題目</p>
          </div>
        </section>

        {/* ===== 通知摘要 ===== */}
        <section className="nb-card p-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
            <div>
              <p className="nb-eyebrow">Notifications · 通知中心</p>
              <h2 className="mt-1 font-nbSerif text-2xl font-black">通知摘要</h2>
            </div>
            <Link href="/notifications" className="nb-btn text-sm">
              查看全部 →
            </Link>
          </div>
          <div className="mt-5 grid gap-3">
            {notificationFeed.items.slice(0, 4).map((item) => (
              <div key={item.id} className={`border-[2.5px] px-4 py-4 ${getNbNotificationTone(item.level)}`}>
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-2.5 py-1 bg-nb-paper border-[2px] border-nb-ink text-nb-ink text-xs font-bold">
                        {getNotificationLevelLabel(item.level)} 優先
                      </span>
                      {item.storeName ? <span className="font-nbMono text-xs font-bold opacity-85">{item.storeName}</span> : null}
                    </div>
                    <p className="mt-3 font-bold text-[15px]">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 opacity-90">{item.description}</p>
                  </div>
                  {item.href ? (
                    <Link
                      href={item.href}
                      className="inline-flex items-center px-4 py-2 bg-nb-paper border-[2.5px] border-nb-ink text-nb-ink text-sm font-bold hover:-translate-y-0.5 hover:shadow-nb-sm transition-all"
                    >
                      前往查看
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        {profile.role === "leader" ? (
          <div className="grid gap-6">
            {/* 今天先看這三件事 */}
            <section className="nb-card p-6">
              <div className="pb-4 border-b-[3px] border-nb-ink">
                <p className="nb-eyebrow">Today Focus · 今日重點</p>
                <h2 className="mt-1 font-nbSerif text-2xl font-black">今天先看這三件事</h2>
              </div>

              <div className="mt-5 grid gap-3 lg:grid-cols-3">
                {leaderChecklist.map((item, idx) => (
                  <div key={item.title} className="bg-nb-bg2 border-[2.5px] border-nb-ink px-4 py-4 relative">
                    <span className="absolute -top-3 -left-3 w-8 h-8 bg-nb-ink text-white font-nbSerif font-black flex items-center justify-center border-[2.5px] border-nb-ink">
                      {idx + 1}
                    </span>
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-bold text-sm text-nb-ink/70">{item.title}</p>
                      <span className="nb-chip-yellow">{item.value}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-nb-ink/75">{item.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              {/* 本店分類表現 */}
              <div className="nb-card p-6">
                <div className="pb-4 border-b-[3px] border-nb-ink">
                  <p className="nb-eyebrow">Category Health · 分類健康度</p>
                  <h2 className="mt-1 font-nbSerif text-2xl font-black">本店分類表現</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  {weakestCategories.map((category) => (
                    <div key={category.categoryName} className="bg-nb-bg2 border-[2.5px] border-nb-ink px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-nb-ink">{category.categoryName}</p>
                          <p className="mt-1 font-nbMono text-xs font-bold text-nb-ink/60">
                            平均分數 {category.averageScore.toFixed(2)} · A/B/C {category.counts.a}/{category.counts.b}/{category.counts.c}
                          </p>
                        </div>
                        <span className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(category.grade)}`}>
                          {category.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                  {weakestCategories.length === 0 && (
                    <div className="border-[2.5px] border-dashed border-nb-ink/40 px-4 py-8 text-sm text-nb-ink/60 font-bold text-center">
                      這個月還沒有足夠資料建立分類評級。
                    </div>
                  )}
                </div>
              </div>

              {/* 本店待改善清單 */}
              <div className="nb-card p-6">
                <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
                  <div>
                    <p className="nb-eyebrow">Action Queue · 改善清單</p>
                    <h2 className="mt-1 font-nbSerif text-2xl font-black">本店待改善</h2>
                  </div>
                  <Link href="/inspection/improvements" className="nb-btn text-sm">
                    全部 →
                  </Link>
                </div>
                <div className="mt-5 grid gap-3">
                  {pendingTaskHighlights.map((task) => (
                    <div key={task.id} className="border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-nb-ink">{task.itemName}</p>
                          <p className="mt-1 font-nbMono text-xs font-bold text-nb-ink/60">
                            {task.storeName}
                            {task.inspectionDate ? ` · ${task.inspectionDate}` : ""}
                            {task.score ? ` · 分數 ${task.score}` : ""}
                          </p>
                        </div>
                        <span className="nb-chip-red">待處理</span>
                      </div>
                      {task.tagTypes.length > 0 || task.isFocusItem ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {task.tagTypes.map((tagType) => (
                            <span
                              key={`${task.id}-${tagType}`}
                              className={`inline-flex items-center px-2.5 py-1 border-[2px] border-nb-ink text-xs font-bold ${getTagChipClass(tagType)}`}
                            >
                              {getInspectionTagLabel(tagType)}
                            </span>
                          ))}
                          {task.isFocusItem && task.tagTypes.length === 0 ? (
                            <span className="nb-chip-yellow">重點追蹤</span>
                          ) : null}
                        </div>
                      ) : null}
                      {task.note ? <p className="mt-3 text-sm leading-6 text-nb-ink/75">{task.note}</p> : null}
                    </div>
                  ))}
                  {pendingTaskHighlights.length === 0 && (
                    <div className="border-[2.5px] border-dashed border-nb-ink/40 px-4 py-8 text-sm text-nb-ink/60 font-bold text-center">
                      目前沒有待改善任務，今天可以優先巡查必查項目與客訴項目。
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* 本店最近巡店紀錄 */}
            <section className="nb-card p-6">
              <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
                <div>
                  <p className="nb-eyebrow">Recent Activity · 最近活動</p>
                  <h2 className="mt-1 font-nbSerif text-2xl font-black">本店最近巡店</h2>
                </div>
                <Link href="/inspection/history" className="nb-btn text-sm">
                  全部 →
                </Link>
              </div>
              <div className="mt-5 grid gap-3">
                {latestInspectionRows.map((inspection) => (
                  <div
                    key={inspection.id}
                    className="flex flex-col gap-3 border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-nbMono text-xs font-bold text-nb-ink/60">{inspection.date}</p>
                      <p className="mt-1 text-base font-bold text-nb-ink">
                        {inspection.storeName} · {inspection.timeSlot}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(inspection.grade)}`}>
                        {inspection.grade}
                      </span>
                      <Link
                        href={`/inspection/history/${inspection.id}`}
                        className="nb-btn text-sm"
                      >
                        查看明細
                      </Link>
                    </div>
                  </div>
                ))}
                {latestInspectionRows.length === 0 && (
                  <div className="border-[2.5px] border-dashed border-nb-ink/40 px-4 py-8 text-sm text-nb-ink/60 font-bold text-center">
                    目前還沒有巡店紀錄，建議先完成第一筆巡店。
                  </div>
                )}
              </div>
            </section>

            {/* 店長常用入口 */}
            <section className="nb-card p-6">
              <p className="nb-eyebrow">Quick Actions · 快速入口</p>
              <h2 className="mt-1 font-nbSerif text-2xl font-black">店長常用入口</h2>
              <div className="mt-5 flex flex-wrap gap-3">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="nb-btn-yellow text-sm"
                  >
                    {link.label} →
                  </Link>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-6">
              {/* 各分類健康度 */}
              <section className="nb-card p-6">
                <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
                  <div>
                    <p className="nb-eyebrow">Category Health · 分類健康度</p>
                    <h2 className="mt-1 font-nbSerif text-2xl font-black">各分類健康度</h2>
                  </div>
                  <Link href="/inspection/reports" className="nb-btn text-sm">
                    報表 →
                  </Link>
                </div>
                <div className="mt-5 grid gap-3">
                  {weakestCategories.map((category) => (
                    <div key={category.categoryName} className="bg-nb-bg2 border-[2.5px] border-nb-ink px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-nb-ink">{category.categoryName}</p>
                          <p className="mt-1 font-nbMono text-xs font-bold text-nb-ink/60">
                            平均分數 {category.averageScore.toFixed(2)} · A/B/C {category.counts.a}/{category.counts.b}/{category.counts.c}
                          </p>
                        </div>
                        <span className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(category.grade)}`}>
                          {category.grade}
                        </span>
                      </div>
                    </div>
                  ))}
                  {weakestCategories.length === 0 && (
                    <div className="border-[2.5px] border-dashed border-nb-ink/40 px-4 py-8 text-sm text-nb-ink/60 font-bold text-center">
                      這個月還沒有足夠資料建立分類評級。
                    </div>
                  )}
                </div>
              </section>

              {/* 最近巡店紀錄 */}
              <section className="nb-card p-6">
                <div className="flex items-center justify-between gap-3 pb-4 border-b-[3px] border-nb-ink">
                  <div>
                    <p className="nb-eyebrow">Recent Activity · 最近活動</p>
                    <h2 className="mt-1 font-nbSerif text-2xl font-black">最近巡店紀錄</h2>
                  </div>
                  <Link href="/inspection/history" className="nb-btn text-sm">
                    全部 →
                  </Link>
                </div>

                <div className="mt-5 grid gap-3">
                  {latestInspectionRows.map((inspection) => (
                    <div
                      key={inspection.id}
                      className="flex flex-col gap-3 border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="font-nbMono text-xs font-bold text-nb-ink/60">{inspection.date}</p>
                        <p className="mt-1 text-base font-bold text-nb-ink">
                          {inspection.storeName} · {inspection.timeSlot}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(inspection.grade)}`}>
                          {inspection.grade}
                        </span>
                        <Link
                          href={`/inspection/history/${inspection.id}`}
                          className="nb-btn text-sm"
                        >
                          查看明細
                        </Link>
                      </div>
                    </div>
                  ))}
                  {latestInspectionRows.length === 0 && (
                    <div className="border-[2.5px] border-dashed border-nb-ink/40 px-4 py-8 text-sm text-nb-ink/60 font-bold text-center">
                      目前還沒有巡店紀錄，先從新增巡店開始建立本月資料。
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="grid gap-6">
              {/* 店別表現一覽 */}
              <section className="nb-card p-6">
                <div className="pb-4 border-b-[3px] border-nb-ink">
                  <p className="nb-eyebrow">Store Overview · 店別總覽</p>
                  <h2 className="mt-1 font-nbSerif text-2xl font-black">店別表現一覽</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  {groupedByStore.map((store, idx) => (
                    <div key={store.storeName} className="border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="inline-flex items-center justify-center w-9 h-9 bg-nb-yellow border-[2.5px] border-nb-ink font-nbSerif font-black text-lg">
                            {idx + 1}
                          </span>
                          <p className="font-bold text-nb-ink">{store.storeName}</p>
                        </div>
                        <span className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(store.overallGrade)}`}>
                          {store.overallGrade}
                        </span>
                      </div>
                      <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">
                        巡店 {store.inspections} 次 · 平均分數 {store.averageScore.toFixed(2)}
                      </p>
                    </div>
                  ))}
                  {groupedByStore.length === 0 && (
                    <div className="border-[2.5px] border-dashed border-nb-ink/40 px-4 py-8 text-sm text-nb-ink/60 font-bold text-center">
                      目前沒有跨店統計資料。
                    </div>
                  )}
                </div>
              </section>

              {/* 目前表現較穩的分類 */}
              <section className="nb-card p-6">
                <div className="pb-4 border-b-[3px] border-nb-ink">
                  <p className="nb-eyebrow">Strongest Categories · 強項分類</p>
                  <h2 className="mt-1 font-nbSerif text-2xl font-black">目前表現較穩的分類</h2>
                </div>
                <div className="mt-5 grid gap-3">
                  {strongestCategories.map((category) => (
                    <div key={category.categoryName} className="border-[2.5px] border-nb-ink bg-nb-paper px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-bold text-nb-ink">{category.categoryName}</p>
                        <span className={`inline-flex items-center justify-center w-11 h-11 border-[2.5px] border-nb-ink font-nbSerif text-xl font-black ${getGradeChipClass(category.grade)}`}>
                          {category.grade}
                        </span>
                      </div>
                      <p className="mt-2 font-nbMono text-xs font-bold text-nb-ink/60">平均分數 {category.averageScore.toFixed(2)}</p>
                    </div>
                  ))}
                  {strongestCategories.length === 0 && (
                    <div className="border-[2.5px] border-dashed border-nb-ink/40 px-4 py-8 text-sm text-nb-ink/60 font-bold text-center">
                      目前沒有足夠資料建立強項分類。
                    </div>
                  )}
                </div>
              </section>

              {/* 常用入口 */}
              <section className="nb-card p-6">
                <p className="nb-eyebrow">Quick Actions · 快速入口</p>
                <h2 className="mt-1 font-nbSerif text-2xl font-black">常用入口</h2>
                <div className="mt-5 flex flex-wrap gap-3">
                  {quickLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="nb-btn-yellow text-sm"
                    >
                      {link.label} →
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
