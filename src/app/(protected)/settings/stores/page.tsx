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
  return { code: `store_${next}`, name: `${next}店` };
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
        eyebrow="Create"
        description="開新店時直接在這新增即可。建議代碼延用 store_數字，顯示名稱用「數字店」。"
      >
        <form data-testid="stores-create-form" action={createStoreAction} className="grid gap-4">
          <div>
            <label className="nb-label">店別代碼</label>
            <input name="code" required defaultValue={suggested.code} placeholder="store_5" className="nb-input" />
          </div>
          <div>
            <label className="nb-label">店別名稱</label>
            <input name="name" required defaultValue={suggested.name} placeholder="5店" className="nb-input" />
          </div>
          <button className="nb-btn-primary" type="submit">
            建立店別
          </button>
        </form>
      </SectionCard>

      <SectionCard title="現有店別" eyebrow="Stores" description="可直接修正顯示名稱；既有 ID 不變，不影響關聯資料。">
        <div data-testid="stores-list" className="grid gap-3">
          {(stores ?? []).map((store) => (
            <form key={store.id} action={renameStoreAction} className="nb-row grid gap-3 md:grid-cols-[140px_1fr_auto] md:items-center">
              <input type="hidden" name="id" value={store.id} />
              <div>
                <p className="nb-eyebrow">Code</p>
                <p className="font-nbSerif text-lg font-black">{store.code}</p>
              </div>
              <input name="name" defaultValue={store.name} className="nb-input" />
              <button className="nb-btn-xs" type="submit">
                儲存名稱
              </button>
            </form>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
