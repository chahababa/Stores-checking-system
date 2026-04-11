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
      code: String(formData.get("code") || ""),
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
        description="工作站是巡店當下要指派給組員的站位。區域維持分成內場、外場、櫃台，但每個區域底下可以新增更多細部工作站。"
      >
        <form action={createWorkstationAction} className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">工作站代碼</span>
            <input
              name="code"
              required
              placeholder="fryer_station"
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">工作站名稱</span>
            <input
              name="name"
              required
              placeholder="炸台"
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
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">適用範圍</span>
            <select name="store_id" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <option value="">全部店通用</option>
              {(stores ?? []).map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </label>
          <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
            新增工作站
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="工作站清單"
        description="之後如果要增加新的工作站，就在這裡操作。全部店通用的工作站適用所有門市；指定店別則只會出現在該店的巡店表單。"
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
                <div className="grid gap-3 md:grid-cols-[140px_1fr_160px_180px_130px] md:items-center">
                  <input
                    name="code"
                    defaultValue={workstation.code}
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
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
                <p className="text-xs text-ink/60">
                  {getShiftRoleLabel(workstation.area)} / {getWorkstationScopeLabel(scope)} / {store?.name ?? "全部店通用"}
                </p>
                <div className="flex justify-end">
                  <button className="rounded-full bg-white px-4 py-2 text-sm" type="submit">
                    儲存工作站
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
