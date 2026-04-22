import { redirect } from "next/navigation";

import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getShiftRoleLabel, getWorkstationScopeLabel } from "@/lib/ui-labels";

type SearchParams = Promise<{ success?: string }>;

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
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
        eyebrow="Create"
        description="工作站代碼由系統自動產生。組員可依當班狀況被派到不同工作站。"
      >
        <form action={createWorkstationAction} className="grid gap-4">
          <div>
            <label className="nb-label">工作站名稱</label>
            <input name="name" required placeholder="例如：炸台、飲料台、外帶交付" className="nb-input" />
          </div>
          <div>
            <label className="nb-label">所屬區域</label>
            <select name="area" className="nb-select">
              <option value="kitchen">內場</option>
              <option value="floor">外場</option>
              <option value="counter">櫃台</option>
            </select>
          </div>
          <div className="nb-card-flat bg-nb-bg2 px-4 py-3 text-xs leading-6 text-nb-ink/75 font-bold">
            <p className="nb-eyebrow">命名參考</p>
            <ul className="mt-2 grid gap-1">
              <li>· 內場：炸台、備料台、飲料台、洗滌區</li>
              <li>· 外場：帶位、送餐、桌面整理、出餐口</li>
              <li>· 櫃台：點餐、收銀、外帶交付</li>
            </ul>
          </div>
          <div>
            <label className="nb-label">適用店別</label>
            <select name="store_id" className="nb-select">
              <option value="">全部店通用</option>
              {(stores ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] leading-5 text-nb-ink/55 font-bold font-nbMono uppercase tracking-[0.18em]">
            工作站代碼屬系統內部識別用，會自動產生。
          </p>
          <button className="nb-btn-primary" type="submit">
            新增工作站
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="既有工作站"
        eyebrow="Workstations"
        description="可調整名稱、所屬區域、適用店別與啟用狀態。代碼保留給系統內部使用。"
      >
        <div data-testid="workstations-list" className="grid gap-3">
          {(workstations ?? []).map((workstation) => {
            const store = getSingleRelation(workstation.stores) as { name?: string } | null;
            const scope = workstation.store_id ? "store" : "global";

            return (
              <form key={workstation.id} action={updateWorkstationAction} className="nb-row grid gap-3">
                <input type="hidden" name="id" value={workstation.id} />
                <input type="hidden" name="code" value={workstation.code} />
                <div className="grid gap-3 md:grid-cols-[1.15fr_160px_180px_130px] md:items-center">
                  <input name="name" defaultValue={workstation.name} className="nb-input" />
                  <select name="area" defaultValue={workstation.area} className="nb-select">
                    <option value="kitchen">內場</option>
                    <option value="floor">外場</option>
                    <option value="counter">櫃台</option>
                  </select>
                  <select name="store_id" defaultValue={workstation.store_id ?? ""} className="nb-select">
                    <option value="">全部店通用</option>
                    {(stores ?? []).map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.name}
                      </option>
                    ))}
                  </select>
                  <select name="is_active" defaultValue={String(workstation.is_active)} className="nb-select">
                    <option value="true">啟用</option>
                    <option value="false">停用</option>
                  </select>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-nb-ink/60 font-bold font-nbMono uppercase tracking-[0.18em]">
                  <span>
                    {getShiftRoleLabel(workstation.area)} · {getWorkstationScopeLabel(scope)} · {store?.name ?? "全部店通用"}
                  </span>
                  <span>系統代碼：{workstation.code}</span>
                </div>
                <div className="flex justify-end">
                  <button className="nb-btn-xs" type="submit">
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
