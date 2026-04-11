import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function getSuggestedNextStore(stores: Array<{ code: string; name: string }>) {
  const numericSuffixes = stores
    .map((store) => {
      const codeMatch = store.code.match(/^store_(\d+)$/);
      const nameMatch = store.name.match(/^(\d+)店$/);
      return Number(codeMatch?.[1] ?? nameMatch?.[1] ?? 0);
    })
    .filter((value) => Number.isFinite(value) && value > 0);

  const next = numericSuffixes.length ? Math.max(...numericSuffixes) + 1 : 1;
  return {
    code: `store_${next}`,
    name: `${next}店`,
  };
}

export default async function StoresSettingsPage() {
  await requireRole("owner");
  const admin = createAdminClient();
  const { data: stores } = await admin
    .from("stores")
    .select("id, code, name, created_at")
    .order("created_at", { ascending: true });

  const suggested = getSuggestedNextStore(stores ?? []);

  async function createStoreAction(formData: FormData) {
    "use server";
    const { createStore } = await import("@/lib/settings");
    await createStore({
      code: String(formData.get("code") || ""),
      name: String(formData.get("name") || ""),
    });
  }

  async function renameStoreAction(formData: FormData) {
    "use server";
    const { updateStoreName } = await import("@/lib/settings");
    await updateStoreName({
      id: String(formData.get("id") || ""),
      name: String(formData.get("name") || ""),
    });
  }

  return (
    <div data-testid="stores-settings-page" className="grid gap-6 lg:grid-cols-[0.95fr_1.45fr]">
      <SectionCard
        title="新增店別"
        description="之後要開第 5 店、第 6 店時，直接在這裡新增即可。建議代碼延續使用 store_數字，顯示名稱使用數字店。"
      >
        <form data-testid="stores-create-form" action={createStoreAction} className="grid gap-4">
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">店別代碼</span>
            <input
              name="code"
              required
              defaultValue={suggested.code}
              placeholder="store_5"
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </label>
          <label className="grid gap-2 text-sm">
            <span className="text-ink/70">店別名稱</span>
            <input
              name="name"
              required
              defaultValue={suggested.name}
              placeholder="5店"
              className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </label>
          <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
            建立店別
          </button>
        </form>
      </SectionCard>

      <SectionCard
        title="現有店別"
        description="這裡可以直接修正顯示名稱。既有資料會沿用同一個店別 ID，所以不會影響帳號、組員或巡店紀錄的關聯。"
      >
        <div data-testid="stores-list" className="grid gap-3">
          {(stores ?? []).map((store) => (
            <form
              key={store.id}
              action={renameStoreAction}
              className="grid gap-3 rounded-2xl border border-ink/10 bg-soft/50 p-4 md:grid-cols-[140px_1fr_auto] md:items-center"
            >
              <input type="hidden" name="id" value={store.id} />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ink/50">Code</p>
                <p className="font-medium">{store.code}</p>
              </div>
              <input
                name="name"
                defaultValue={store.name}
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
              <button className="rounded-full bg-white px-4 py-2 text-sm" type="submit">
                儲存名稱
              </button>
            </form>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
