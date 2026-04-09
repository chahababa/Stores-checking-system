import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShiftRoleLabel } from "@/lib/ui-labels";

export default async function StaffSettingsPage() {
  const profile = await requireRole("owner", "manager", "leader");
  const admin = createAdminClient();
  const storesQuery = admin.from("stores").select("id, name").order("name");
  const staffQuery = admin
    .from("staff_members")
    .select("id, name, position, status, archived_at, store_id, stores(name)")
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
  }

  async function archiveAction(formData: FormData) {
    "use server";
    const { archiveStaffMember } = await import("@/lib/settings");
    await archiveStaffMember(String(formData.get("id")));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.5fr]">
      <SectionCard title="新增組員" description="可新增在職組員，封存後資料仍會保留，不會直接刪除。">
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
          <input name="name" required placeholder="組員姓名" className="rounded-2xl border border-ink/10 bg-white px-4 py-3" />
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
            新增組員
          </button>
        </form>
      </SectionCard>

      <SectionCard title="組員列表" description="MVP 階段先提供 active / archived 兩種狀態。">
        <div className="grid gap-3">
          {staffMembers?.map((member) => (
            <div
              key={member.id}
              className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-soft/60 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-sm text-ink/65">
                  {member.stores?.[0]?.name ?? "未指定店別"} / {getShiftRoleLabel(member.position)} /{" "}
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
                <span className="text-xs text-ink/55">已於 {member.archived_at?.slice(0, 10) ?? "-"} 封存</span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
