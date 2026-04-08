import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function UsersSettingsPage() {
  await requireRole("owner");
  const admin = createAdminClient();
  const [{ data: users }, { data: stores }] = await Promise.all([
    admin.from("users").select("id, email, name, role, is_active, store_id").order("email"),
    admin.from("stores").select("id, name").order("name"),
  ]);

  async function createUserAction(formData: FormData) {
    "use server";
    const { createAuthorizedUser } = await import("@/lib/settings");
    await createAuthorizedUser({
      email: String(formData.get("email") || ""),
      name: String(formData.get("name") || ""),
      role: String(formData.get("role") || "leader") as "owner" | "manager" | "leader",
      storeId: String(formData.get("store_id") || "") || null,
    });
  }

  async function toggleUserAction(formData: FormData) {
    "use server";
    const { updateAuthorizedUserStatus } = await import("@/lib/settings");
    await updateAuthorizedUserStatus(
      String(formData.get("id")),
      String(formData.get("next_active")) === "true",
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
      <SectionCard title="新增授權帳號" description="Owner 可先建立可登入名單，之後使用者再透過 Google OAuth 進入。">
        <form action={createUserAction} className="grid gap-4">
          <input name="name" placeholder="顯示名稱（可選）" className="rounded-2xl border border-ink/10 bg-white px-4 py-3" />
          <input name="email" type="email" required placeholder="email@example.com" className="rounded-2xl border border-ink/10 bg-white px-4 py-3" />
          <select name="role" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <option value="leader">leader</option>
            <option value="manager">manager</option>
            <option value="owner">owner</option>
          </select>
          <select name="store_id" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <option value="">無指定店別</option>
            {stores?.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
            建立或更新帳號
          </button>
        </form>
      </SectionCard>

      <SectionCard title="已授權帳號" description="登入授權與啟用狀態都由這張表控制。">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-ink/60">
              <tr>
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">名稱</th>
                <th className="px-3 py-2">角色</th>
                <th className="px-3 py-2">狀態</th>
                <th className="px-3 py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => (
                <tr key={user.id} className="border-t border-ink/10">
                  <td className="px-3 py-3">{user.email}</td>
                  <td className="px-3 py-3">{user.name ?? "-"}</td>
                  <td className="px-3 py-3">{user.role}</td>
                  <td className="px-3 py-3">{user.is_active ? "啟用中" : "已停用"}</td>
                  <td className="px-3 py-3">
                    <form action={toggleUserAction}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="next_active" value={String(!user.is_active)} />
                      <button className="rounded-full bg-soft px-4 py-2 text-xs" type="submit">
                        {user.is_active ? "停用" : "重新啟用"}
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
