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
  const profile = await requireRole("owner", "manager");
  const params = await searchParams;
  const admin = createAdminClient();
  const isManager = profile.role === "manager";

  const usersQuery = admin
    .from("users")
    .select("id, email, name, role, is_active, store_id")
    .order("email");
  // Managers only manage leader accounts — hide other staff to keep emails private
  // and to match the restricted set of toggles they're allowed to perform.
  const scopedUsersQuery = isManager ? usersQuery.eq("role", "leader") : usersQuery;

  const [{ data: users }, { data: stores }] = await Promise.all([
    scopedUsersQuery,
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
  const createCardDescription = isManager
    ? "建立店長帳號授權。仍以 Google 登入，再依 email 判斷是否放行。"
    : "建立可登入系統的帳號；仍以 Google 登入、再依 email 判斷是否授權。";
  const listCardDescription = isManager
    ? "可查看目前已授權的店長帳號，並停用或重新啟用個別店長。"
    : "可查看目前已授權的帳號，並停用或重新啟用個別使用者。";

  return (
    <div data-testid="users-settings-page" className="grid gap-6 lg:grid-cols-[1.1fr_1.4fr]">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <SectionCard title="新增授權帳號" eyebrow="Create" description={createCardDescription}>
        <form data-testid="users-create-form" action={createUserAction} className="grid gap-4">
          <div>
            <label className="nb-label">顯示名稱</label>
            <input name="name" placeholder="輸入顯示名稱" className="nb-input" />
          </div>
          <div>
            <label className="nb-label">Email</label>
            <input name="email" type="email" required placeholder="email@example.com" className="nb-input" />
          </div>
          {isManager ? (
            <input type="hidden" name="role" value="leader" />
          ) : (
            <div>
              <label className="nb-label">角色</label>
              <select data-testid="users-role-select" name="role" className="nb-select" defaultValue="leader">
                <option value="leader">店長</option>
                <option value="manager">主管</option>
                <option value="owner">系統擁有者</option>
              </select>
            </div>
          )}
          <div>
            <label className="nb-label">所屬店別{isManager ? "（必選）" : ""}</label>
            <select
              data-testid="users-store-select"
              name="store_id"
              className="nb-select"
              required={isManager}
              defaultValue=""
            >
              {!isManager ? <option value="">不指定店別（僅限主管 / 系統擁有者）</option> : null}
              {isManager ? <option value="" disabled>請選擇所屬店別</option> : null}
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
            {!isManager ? (
              <p className="mt-1 text-xs text-nb-ink/55">建立店長時必選；主管 / 系統擁有者請維持「不指定店別」。</p>
            ) : null}
          </div>
          <button className="nb-btn-primary" type="submit">
            儲存帳號
          </button>
        </form>
      </SectionCard>

      <SectionCard title="已授權帳號" eyebrow="Users" description={listCardDescription}>
        <div data-testid="users-table" className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>名稱</th>
                <th>角色</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users?.map((user) => {
                const canToggle = !isManager || user.role === "leader";
                return (
                  <tr key={user.id}>
                    <td className="font-nbMono">{user.email}</td>
                    <td>{user.name ?? "-"}</td>
                    <td>
                      <span className="nb-chip">{getRoleLabel(user.role)}</span>
                    </td>
                    <td>
                      <span className={user.is_active ? "nb-chip-green" : "nb-chip bg-nb-ink/10 text-nb-ink/70"}>
                        {user.is_active ? "啟用中" : "已停用"}
                      </span>
                    </td>
                    <td>
                      {canToggle ? (
                        <form action={toggleUserAction}>
                          <input type="hidden" name="id" value={user.id} />
                          <input type="hidden" name="next_active" value={String(!user.is_active)} />
                          {user.is_active ? (
                            <ConfirmSubmitButton
                              label="停用"
                              className="nb-btn-xs bg-nb-red text-white"
                              confirmMessage={`確定要停用 ${user.email} 的帳號嗎？`}
                            />
                          ) : (
                            <button className="nb-btn-xs" type="submit">
                              重新啟用
                            </button>
                          )}
                        </form>
                      ) : (
                        <span className="text-xs text-nb-ink/45">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
