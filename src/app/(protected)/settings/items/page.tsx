import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type SearchParams = Promise<{ store?: string }>;

export default async function ItemsSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner");
  const params = await searchParams;
  const admin = createAdminClient();

  const [{ data: stores }, { data: items }, { data: extraRows }] = await Promise.all([
    admin.from("stores").select("id, name, code").order("name"),
    admin
      .from("inspection_items")
      .select("id, name, is_base, is_active, category_id, categories(name)")
      .order("sort_order"),
    admin.from("store_extra_items").select("store_id, item_id"),
  ]);

  const selectedStoreId = params.store || stores?.[0]?.id || "";
  const selectedExtraItemIds = new Set(
    (extraRows ?? []).filter((row) => row.store_id === selectedStoreId).map((row) => row.item_id),
  );

  async function toggleItemAction(formData: FormData) {
    "use server";
    const { updateInspectionItemStatus } = await import("@/lib/settings");
    await updateInspectionItemStatus(
      String(formData.get("id")),
      String(formData.get("next_active")) === "true",
    );
  }

  async function updateExtraItemsAction(formData: FormData) {
    "use server";
    const { setStoreExtraItems } = await import("@/lib/settings");
    await setStoreExtraItems({
      storeId: String(formData.get("store_id")),
      itemIds: formData.getAll("item_ids").map(String),
    });
  }

  const baseItems = (items ?? []).filter((item) => item.is_base);
  const optionalItems = (items ?? []).filter((item) => !item.is_base);

  return (
    <div className="grid gap-6">
      <SectionCard
        title="基礎題目管理"
        description="Owner 可啟用或停用所有基礎題目。這會影響後續巡店表單是否顯示該題。"
      >
        <div className="grid gap-3">
          {baseItems.map((item) => (
            <div
              key={item.id}
              className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-soft/40 p-4 md:flex-row md:items-center md:justify-between"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-sm text-ink/65">{item.categories?.[0]?.name ?? "未分類"} / 基礎題</p>
              </div>
              <form action={toggleItemAction}>
                <input type="hidden" name="id" value={item.id} />
                <input type="hidden" name="next_active" value={String(!item.is_active)} />
                <button className="rounded-full bg-white px-4 py-2 text-xs" type="submit">
                  {item.is_active ? "停用" : "啟用"}
                </button>
              </form>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="各店額外題目"
        description="選擇店別後設定該店專屬的額外題目。這裡只管理 `is_base = false` 的選配題。"
      >
        <form method="get" className="mb-5 max-w-xs">
          <select
            name="store"
            defaultValue={selectedStoreId}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          >
            {stores?.map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <button className="mt-3 rounded-full bg-soft px-4 py-2 text-xs" type="submit">
            切換店別
          </button>
        </form>

        <form action={updateExtraItemsAction} className="grid gap-4">
          <input type="hidden" name="store_id" value={selectedStoreId} />
          {optionalItems.length === 0 ? (
            <p className="text-sm text-ink/65">目前還沒有選配題目，後續可以直接在資料庫 seed 或 migration 新增。</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {optionalItems.map((item) => (
                <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-3">
                  <input
                    type="checkbox"
                    name="item_ids"
                    value={item.id}
                    defaultChecked={selectedExtraItemIds.has(item.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-medium">{item.name}</span>
                    <span className="text-xs text-ink/60">{item.categories?.[0]?.name ?? "未分類"} / 選配題</span>
                  </span>
                </label>
              ))}
            </div>
          )}
          <div>
            <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
              儲存店別選配題
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
