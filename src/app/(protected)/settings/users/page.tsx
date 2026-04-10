import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getRoleLabel } from "@/lib/ui-labels";

type SearchParams = Promise<{ success?: string }>;

function getSuccessMessage(success?: string) {
  if (success === "user-created") return "帳號已建立或更新。";
  if (success === "user-disabled") return "帳號已停用。";
  if (success === "user-enabled") return "帳號已重新啟用。";
  return null;
}

export default async function UsersSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner");
  const params = await searchParams;
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
    redirect("/settings/users?success=user-created");
  }

  async function toggleUserAction(formData: FormData) {
    "use server";
    const nextActive = String(formData.get("next_active")) === "true";
    const { updateAuthorizedUserStatus } = await import("@/lib/settings");
    await updateAuthorizedUserStatus(String(formData.get("id")), nextActive);
    redirect(`/settings/users?success=${nextActive ? "user-enabled" : "user-disabled"}`);
  }

  const successMessage = getSuccessMessage(params.success);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <SectionCard title="新增授權帳號" description="建立可登入系統的帳號。使用者仍需透過 Google 登入，系統再依 email 判斷是否授權。">
        <form action={createUserAction} className="grid gap-4">
          <input
            name="name"
            placeholder="輸入顯示名稱"
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
          <input
            name="email"
            type="email"
            required
            placeholder="email@example.com"
            className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
          />
          <select name="role" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <option value="leader">店長</option>
            <option value="manager">主管</option>
            <option value="owner">系統擁有者</option>
          </select>
          <select name="store_id" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
            <option value="">不指定店別</option>
            {stores?.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
            儲存帳號
          </button>
        </form>
      </SectionCard>

      <SectionCard title="已授權帳號" description="可查看目前已授權的帳號，並停用或重新啟用個別使用者。">
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
                  <td className="px-3 py-3">{getRoleLabel(user.role)}</td>
                  <td className="px-3 py-3">{user.is_active ? "啟用中" : "已停用"}</td>
                  <td className="px-3 py-3">
                    <form action={toggleUserAction}>
                      <input type="hidden" name="id" value={user.id} />
                      <input type="hidden" name="next_active" value={String(!user.is_active)} />
                      {user.is_active ? (
                        <ConfirmSubmitButton
                          label="停用"
                          className="rounded-full bg-soft px-4 py-2 text-xs"
                          confirmMessage={`確定要停用 ${user.email} 的帳號嗎？`}
                        />
                      ) : (
                        <button className="rounded-full bg-soft px-4 py-2 text-xs" type="submit">
                          重新啟用
                        </button>
                      )}
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
