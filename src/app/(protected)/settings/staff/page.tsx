import { redirect } from "next/navigation";

import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShiftRoleLabel } from "@/lib/ui-labels";

type SearchParams = Promise<{ success?: string }>;

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getSuccessMessage(success?: string) {
  if (success === "staff-created") return "組員新增成功。";
  if (success === "staff-archived") return "組員已封存。";
  return null;
}

export default async function StaffSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole("owner", "manager", "leader");
  const params = await searchParams;
  const admin = createAdminClient();
  const storesQuery = admin.from("stores").select("id, name").order("name");
  const staffQuery = admin
    .from("staff_members")
    .select("id, name, position, status, archived_at, store_id, stores(id, name)")
    .order("created_at", { ascending: false });

  const [{ data: stores }, { data: staffMembers }] = await Promise.all([
    profile.role === "leader" ? storesQuery.eq("id", profile.store_id!) : storesQuery,
    profile.role === "leader" ? staffQuery.eq("store_id", profile.store_id!) : staffQuery,
  ]);

  async function createStaffAction(formData: FormData) {
    "use server";
    const { createStaffMember } = await import("@/lib/settings");
    await createStaffMember({
      storeId: String(formData.get("store_id")),
      name: String(formData.get("name")),
      position: String(formData.get("position")) as "kitchen" | "floor" | "counter",
    });
    redirect("/settings/staff?success=staff-created");
  }

  async function archiveAction(formData: FormData) {
    "use server";
    const { archiveStaffMember } = await import("@/lib/settings");
    await archiveStaffMember(String(formData.get("id")));
    redirect("/settings/staff?success=staff-archived");
  }

  const successMessage = getSuccessMessage(params.success);

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <SectionCard title="新增組員" description="新增在職組員後，這些人員就能出現在巡店表單的當班名單中。">
        <form action={createStaffAction} className="grid gap-4">
          <select
            name="store_id"
            defaultValue={profile.role === "leader" ? profile.store_id ?? "" : stores?.[0]?.id}
            disabled={profile.role === "leader"}
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
          >
            {stores?.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          {profile.role === "leader" ? <input type="hidden" name="store_id" value={profile.store_id ?? ""} /> : null}
          <input
            name="name"
            required
            placeholder="輸入組員姓名"
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
          <select name="position" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <option value="kitchen">內場</option>
            <option value="floor">外場</option>
            <option value="counter">櫃台</option>
          </select>
          <button
            className="rounded-full bg-warm px-5 py-3 text-sm text-white"
            type="submit"
            disabled={profile.role === "leader"}
          >
            建立組員
          </button>
        </form>
      </SectionCard>

      <SectionCard title="組員列表" description="可查看目前在職或已封存的組員，封存後不會出現在巡店表單。">
        <div className="grid gap-3">
          {staffMembers?.map((member) => {
            const store = getSingleRelation(member.stores) as { name?: string } | null;

            return (
              <div
                key={member.id}
                className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-soft/60 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-medium">{member.name}</p>
                  <p className="text-sm text-ink/65">
                    {store?.name ?? "未指定店別"} / {getShiftRoleLabel(member.position)} /{" "}
                    {member.status === "active" ? "在職" : "已封存"}
                  </p>
                </div>
                {member.status === "active" ? (
                  <form action={archiveAction}>
                    <input type="hidden" name="id" value={member.id} />
                    <button className="rounded-full bg-white px-4 py-2 text-xs" type="submit">
                      封存
                    </button>
                  </form>
                ) : (
                  <span className="text-xs text-ink/55">封存日期：{member.archived_at?.slice(0, 10) ?? "-"}</span>
                )}
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
