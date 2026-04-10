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

export default async function HomePage() {
  const profile = await getCurrentUserProfile();

  if (!profile) {
    redirect("/login");
  }

  const admin = createAdminClient();
  const month = new Date().toISOString().slice(0, 7);
  const { start, end } = getMonthRange(month);

  let inspectionsQuery = admin
    .from("inspections")
    .select("id, store_id, total_score")
    .gte("date", start)
    .lt("date", end);
  let tasksQuery = admin.from("improvement_tasks").select("id, status, store_id");
  let storesQuery = admin.from("stores").select("id, name").order("name");

  if (profile.role === "leader" && profile.store_id) {
    inspectionsQuery = inspectionsQuery.eq("store_id", profile.store_id);
    tasksQuery = tasksQuery.eq("store_id", profile.store_id);
    storesQuery = storesQuery.eq("id", profile.store_id);
  }

  const [{ data: inspections }, { data: tasks }, { data: stores }] = await Promise.all([
    inspectionsQuery,
    tasksQuery,
    storesQuery,
  ]);

  const totalInspections = inspections?.length ?? 0;
  const averageScore =
    totalInspections > 0
      ? (
          (inspections ?? []).reduce((sum, inspection) => sum + Number(inspection.total_score ?? 0), 0) / totalInspections
        ).toFixed(2)
      : "0.00";
  const pendingTasks = (tasks ?? []).filter((task) => task.status === "pending").length;
  const storeCount = stores?.length ?? 0;

  const quickLinks = [
    { href: "/inspection/new", label: "新增巡店", roles: ["owner", "manager"] },
    { href: "/inspection/history", label: "巡店紀錄", roles: ["owner", "manager", "leader"] },
    { href: "/inspection/improvements", label: "改善追蹤", roles: ["owner", "manager", "leader"] },
    { href: "/inspection/reports", label: "報表分析", roles: ["owner", "manager", "leader"] },
    { href: "/settings/staff", label: "組員管理", roles: ["owner", "manager", "leader"] },
    { href: "/settings/users", label: "帳號權限", roles: ["owner"] },
  ].filter((link) => link.roles.includes(profile.role));

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Dashboard</p>
        <h1 className="mt-2 font-serifTc text-3xl font-semibold">營運總覽</h1>
        <p className="mt-3 text-sm text-ink/70">
          這裡整理本月巡店與改善狀態，方便你快速掌握目前門市營運情況。
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">本月巡店次數</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{totalInspections}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">本月平均分數</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{averageScore}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">待改善項目</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{pendingTasks}</p>
        </div>
        <div className="rounded-[24px] border border-ink/10 bg-white/85 px-5 py-4 shadow-card">
          <p className="text-sm text-ink/60">{profile.role === "leader" ? "目前店別" : "管理店數"}</p>
          <p className="mt-2 font-serifTc text-3xl font-semibold">{storeCount}</p>
        </div>
      </section>

      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <div className="flex flex-col gap-3">
          <h2 className="font-serifTc text-2xl font-semibold">快速入口</h2>
          <p className="text-sm text-ink/70">從這裡直接進入最常使用的功能。</p>
        </div>

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
  );
}
