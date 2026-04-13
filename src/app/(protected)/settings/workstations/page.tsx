import { redirect } from "next/navigation";

import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShiftRoleLabel, getWorkstationScopeLabel } from "@/lib/ui-labels";

type SearchParams = Promise<{ success?: string }>;

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getSuccessMessage(success?: string) {
  if (success === "workstation-created") return "工作站已新增。";
  if (success === "workstation-updated") return "工作站已更新。";
  return null;
}

export default async function WorkstationsSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireRole("owner", "manager");
  const params = await searchParams;
  const admin = createAdminClient();
  const [{ data: stores }, { data: workstations }] = await Promise.all([
    admin.from("stores").select("id, name").order("name"),
    admin
      .from("workstations")
      .select("id, code, name, area, store_id, is_active, sort_order, stores(id, name)")
      .order("sort_order")
      .order("name"),
  ]);

  const successMessage = getSuccessMessage(params.success);

  async function createWorkstationAction(formData: FormData) {
    "use server";
    const { createWorkstation } = await import("@/lib/settings");
    const rawStoreId = String(formData.get("store_id") || "");
    await createWorkstation({
      code: "",
      name: String(formData.get("name") || ""),
      area: String(formData.get("area") || "floor") as "kitchen" | "floor" | "counter",
      storeId: rawStoreId || null,
    });
    redirect("/settings/workstations?success=workstation-created");
  }

  async function updateWorkstationAction(formData: FormData) {
    "use server";
    const { updateWorkstation } = await import("@/lib/settings");
    const rawStoreId = String(formData.get("store_id") || "");
    await updateWorkstation({
      id: String(formData.get("id") || ""),
      code: String(formData.get("code") || ""),
      name: String(formData.get("name") || ""),
      area: String(formData.get("area") || "floor") as "kitchen" | "floor" | "counter",
      storeId: rawStoreId || null,
      isActive: String(formData.get("is_active") || "true") === "true",
    });
    redirect("/settings/workstations?success=workstation-updated");
  }

  return (
    <div data-testid="workstations-settings-page" className="grid gap-6 lg:grid-cols-[0.95fr_1.45fr]">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <SectionCard
        title="新增工作站"
        description="工作站代碼會由系統自動產生，你只需要決定工作站名稱與所屬區域。之後巡店時，就可以把同一位組員依當班狀況派到不同工作站。"
      >
        <form action={createWorkstationAction} className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">工作站名稱</span>
            <input
              name="name"
              required
              placeholder="例如：炸台、飲料台、外帶交付"
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">所屬區域</span>
            <select name="area" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <option value="kitchen">內場</option>
              <option value="floor">外場</option>
              <option value="counter">櫃台</option>
            </select>
          </label>
          <div className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/70">
            <p className="font-medium text-ink">命名參考</p>
            <ul className="mt-2 grid gap-1">
              <li>內場：炸台、備料台、飲料台、洗滌區</li>
              <li>外場：帶位、送餐、桌面整理、出餐口</li>
              <li>櫃台：點餐、收銀、外帶交付</li>
            </ul>
          </div>
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">適用店別</span>
            <select name="store_id" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <option value="">全部店通用</option>
              {(stores ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <p className="text-xs leading-5 text-ink/55">
            工作站代碼屬於系統內部識別用，現在會自動產生，不需要手動填寫。
          </p>
          <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
            新增工作站
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="既有工作站"
        description="這裡可以調整工作站名稱、所屬區域、適用店別與啟用狀態。代碼會保留給系統內部使用，不需要日常維護。"
      >
        <div data-testid="workstations-list" className="grid gap-3">
          {(workstations ?? []).map((workstation) => {
            const store = getSingleRelation(workstation.stores) as { name?: string } | null;
            const scope = workstation.store_id ? "store" : "global";

            return (
              <form
                key={workstation.id}
                action={updateWorkstationAction}
                className="grid gap-3 rounded-2xl border border-ink/10 bg-soft/50 p-4"
              >
                <input type="hidden" name="id" value={workstation.id} />
                <input type="hidden" name="code" value={workstation.code} />
                <div className="grid gap-3 md:grid-cols-[1.15fr_160px_180px_130px] md:items-center">
                  <input
                    name="name"
                    defaultValue={workstation.name}
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                  <select
                    name="area"
                    defaultValue={workstation.area}
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  >
                    <option value="kitchen">內場</option>
                    <option value="floor">外場</option>
                    <option value="counter">櫃台</option>
                  </select>
                  <select
                    name="store_id"
                    defaultValue={workstation.store_id ?? ""}
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  >
                    <option value="">全部店通用</option>
                    {(stores ?? []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <select
                    name="is_active"
                    defaultValue={String(workstation.is_active)}
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  >
                    <option value="true">啟用</option>
                    <option value="false">停用</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink/60">
                  <span>
                    {getShiftRoleLabel(workstation.area)} / {getWorkstationScopeLabel(scope)} / {store?.name ?? "全部店通用"}
                  </span>
                  <span>系統代碼：{workstation.code}</span>
                </div>
                <div className="flex justify-end">
                  <button className="rounded-full bg-white px-4 py-2 text-sm" type="submit">
                    儲存變更
                  </button>
                </div>
              </form>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
