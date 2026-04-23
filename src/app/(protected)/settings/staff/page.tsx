import { redirect } from "next/navigation";

import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShiftRoleLabel } from "@/lib/ui-labels";

type SearchParams = Promise<{ success?: string }>;

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function getSuccessMessage(success?: string) {
  if (success === "staff-created") return "組員已新增。";
  if (success === "staff-archived") return "組員已封存。";
  if (success === "staff-restored") return "組員已恢復為在職。";
  return null;
}

export default async function StaffSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole("owner", "manager", "leader");
  const params = await searchParams;
  const admin = createAdminClient();
  const storesQuery = admin.from("stores").select("id, name").order("name");
  const staffQuery = admin
    .from("staff_members")
    .select(
      "id, name, status, archived_at, store_id, default_workstation_id, stores(id, name), workstations(id, name, area)",
    )
    .order("created_at", { ascending: false });
  const workstationsQuery = admin
    .from("workstations")
    .select("id, name, area, store_id")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");

  const [{ data: stores }, { data: staffMembers }, { data: workstations }] = await Promise.all([
    profile.role === "leader" ? storesQuery.eq("id", profile.store_id!) : storesQuery,
    profile.role === "leader" ? staffQuery.eq("store_id", profile.store_id!) : staffQuery,
    profile.role === "leader"
      ? workstationsQuery.or(`store_id.is.null,store_id.eq.${profile.store_id!}`)
      : workstationsQuery,
  ]);

  async function createStaffAction(formData: FormData) {
    "use server";
    const { createStaffMember } = await import("@/lib/settings");
    await createStaffMember({
      storeId: String(formData.get("store_id")),
      name: String(formData.get("name")),
      defaultWorkstationId: String(formData.get("default_workstation_id") || "") || null,
    });
    redirect("/settings/staff?success=staff-created");
  }

  async function archiveAction(formData: FormData) {
    "use server";
    const { archiveStaffMember } = await import("@/lib/settings");
    await archiveStaffMember(String(formData.get("id")));
    redirect("/settings/staff?success=staff-archived");
  }

  async function restoreAction(formData: FormData) {
    "use server";
    const { restoreStaffMember } = await import("@/lib/settings");
    await restoreStaffMember(String(formData.get("id")));
    redirect("/settings/staff?success=staff-restored");
  }

  const successMessage = getSuccessMessage(params.success);

  return (
    <div data-testid="staff-settings-page" className="grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <SectionCard
        title="新增組員"
        eyebrow="Create"
        description="組員只綁定店別，不再固定站點。常用工作站為預設值，巡店時可依當班狀況改派。"
      >
        <form data-testid="staff-create-form" action={createStaffAction} className="grid gap-4">
          <div>
            <label className="nb-label">店別</label>
            <select
              data-testid="staff-store-select"
              name="store_id"
              defaultValue={profile.role === "leader" ? profile.store_id ?? "" : stores?.[0]?.id}
              disabled={profile.role === "leader"}
              className="nb-select"
            >
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {profile.role === "leader" ? <input type="hidden" name="store_id" value={profile.store_id ?? ""} /> : null}
          </div>
          <div>
            <label className="nb-label">姓名</label>
            <input name="name" required placeholder="請輸入組員姓名" className="nb-input" />
          </div>
          <div>
            <label className="nb-label">常用工作站（可不選）</label>
            <select name="default_workstation_id" className="nb-select" defaultValue="">
              <option value="">未指定</option>
              {(workstations ?? []).map((workstation) => (
                <option key={workstation.id} value={workstation.id}>
                  {workstation.name}（{getShiftRoleLabel(workstation.area)} / {workstation.store_id ? "指定店別" : "全部店通用"}）
                </option>
              ))}
            </select>
          </div>
          <button className="nb-btn-primary" type="submit">
            新增組員
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="組員清單"
        eyebrow="Staff List"
        description="常用工作站只是預設值，不代表當班工作站；實際站位會在每次巡店時指派。"
      >
        <div data-testid="staff-list" className="grid gap-3">
          {staffMembers?.map((member) => {
            const store = getSingleRelation(member.stores) as { name?: string } | null;
            const defaultWorkstation = getSingleRelation(member.workstations) as
              | { name?: string; area?: "kitchen" | "floor" | "counter" }
              | null;

            return (
              <div key={member.id} className="nb-row flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-nbSerif text-lg font-black">{member.name}</p>
                  <p className="mt-1 text-xs text-nb-ink/65 font-bold font-nbMono">
                    {store?.name ?? "未指定店別"} · {member.status === "active" ? "在職" : "已封存"}
                  </p>
                  <p className="mt-1 text-xs text-nb-ink/55 font-nbMono">
                    常用工作站：
                    {defaultWorkstation
                      ? `${defaultWorkstation.name}（${getShiftRoleLabel(defaultWorkstation.area ?? "floor")}）`
                      : "未指定"}
                  </p>
                </div>
                {member.status === "active" ? (
                  <form action={archiveAction}>
                    <input type="hidden" name="id" value={member.id} />
                    <button className="nb-btn-xs" type="submit">
                      封存
                    </button>
                  </form>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold font-nbMono text-nb-ink/55 uppercase tracking-[0.18em]">
                      封存日期：{member.archived_at?.slice(0, 10) ?? "-"}
                    </span>
                    <form action={restoreAction}>
                      <input type="hidden" name="id" value={member.id} />
                      <button className="nb-btn-xs bg-nb-green" type="submit">
                        恢復在職
                      </button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
