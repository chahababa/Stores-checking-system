import { redirect } from "next/navigation";

import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCategoryFieldTypeLabel } from "@/lib/ui-labels";

type SearchParams = Promise<{ store?: string; success?: string }>;

function getSuccessMessage(success?: string) {
  if (success === "category-created") return "題目類別已新增。";
  if (success === "category-updated") return "題目類別已更新。";
  if (success === "item-created") return "題目已新增。";
  if (success === "item-updated") return "題目內容已更新。";
  if (success === "item-scope-updated") return "店別加題適用範圍已更新。";
  return null;
}

export default async function ItemsSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner");
  const params = await searchParams;
  const admin = createAdminClient();

  const [{ data: stores }, { data: categories }, { data: items }, { data: extraRows }] = await Promise.all([
    admin.from("stores").select("id, name, code").order("name"),
    admin.from("categories").select("id, name, sort_order, field_type").order("sort_order"),
    admin
      .from("inspection_items")
      .select("id, name, is_base, is_active, category_id, sort_order, categories(id, name)")
      .order("sort_order"),
    admin.from("store_extra_items").select("store_id, item_id"),
  ]);

  const selectedStoreId = params.store || stores?.[0]?.id || "";
  const selectedExtraItemIds = new Set(
    (extraRows ?? []).filter((row) => row.store_id === selectedStoreId).map((row) => row.item_id),
  );
  const storeNamesById = Object.fromEntries((stores ?? []).map((store) => [store.id, store.name]));
  const storeIdsByItemId = (extraRows ?? []).reduce<Record<string, string[]>>((carry, row) => {
    const group = carry[row.item_id] ?? [];
    group.push(row.store_id);
    carry[row.item_id] = group;
    return carry;
  }, {});

  async function createItemAction(formData: FormData) {
    "use server";
    const { createInspectionItem } = await import("@/lib/settings");
    const type = String(formData.get("item_type") || "base");
    const storeIds = formData.getAll("store_ids").map(String);
    await createInspectionItem({
      name: String(formData.get("name") || ""),
      categoryId: String(formData.get("category_id") || ""),
      isBase: type === "base",
      storeIds,
    });
    const nextStore = storeIds[0] || String(formData.get("selected_store") || "");
    redirect(nextStore ? `/settings/items?success=item-created&store=${nextStore}` : "/settings/items?success=item-created");
  }

  async function createCategoryAction(formData: FormData) {
    "use server";
    const { createInspectionCategory } = await import("@/lib/settings");
    await createInspectionCategory({
      name: String(formData.get("name") || ""),
      sortOrder: Number(formData.get("sort_order") || 0) || null,
      fieldType: String(formData.get("field_type") || "none") as "kitchen" | "floor" | "none",
    });
    redirect(`/settings/items?success=category-created${selectedStoreId ? `&store=${selectedStoreId}` : ""}`);
  }

  async function updateCategoryAction(formData: FormData) {
    "use server";
    const { updateInspectionCategory } = await import("@/lib/settings");
    await updateInspectionCategory({
      id: String(formData.get("id") || ""),
      name: String(formData.get("name") || ""),
      sortOrder: Number(formData.get("sort_order") || 0) || 100,
      fieldType: String(formData.get("field_type") || "none") as "kitchen" | "floor" | "none",
    });
    redirect(`/settings/items?success=category-updated${selectedStoreId ? `&store=${selectedStoreId}` : ""}`);
  }

  async function updateItemAction(formData: FormData) {
    "use server";
    const { updateInspectionItem } = await import("@/lib/settings");
    const type = String(formData.get("item_type") || "base");
    const storeIds = formData.getAll("store_ids").map(String);
    const selectedStore = String(formData.get("selected_store") || "");
    await updateInspectionItem({
      id: String(formData.get("id") || ""),
      name: String(formData.get("name") || ""),
      categoryId: String(formData.get("category_id") || ""),
      isBase: type === "base",
      isActive: String(formData.get("is_active") || "true") === "true",
      storeIds,
    });
    redirect(selectedStore ? `/settings/items?success=item-updated&store=${selectedStore}` : "/settings/items?success=item-updated");
  }

  async function updateExtraItemsAction(formData: FormData) {
    "use server";
    const { setStoreExtraItems } = await import("@/lib/settings");
    const storeId = String(formData.get("store_id"));
    await setStoreExtraItems({
      storeId,
      itemIds: formData.getAll("item_ids").map(String),
    });
    redirect(`/settings/items?success=item-scope-updated&store=${storeId}`);
  }

  const groupedBaseItems = (categories ?? [])
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: (items ?? []).filter((item) => item.is_base && item.category_id === category.id),
    }))
    .filter((group) => group.items.length > 0);

  const groupedOptionalItems = (categories ?? [])
    .map((category) => ({
      id: category.id,
      name: category.name,
      items: (items ?? []).filter((item) => !item.is_base && item.category_id === category.id),
    }))
    .filter((group) => group.items.length > 0);

  const successMessage = getSuccessMessage(params.success);

  return (
    <div data-testid="items-settings-page" className="grid gap-6">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <SectionCard
        title="題目類別管理"
        description="先把類別整理好，新增題目時才不會越來越混亂。類別區域只用來幫助題目分群與後續報表判讀，不等於工作站。"
      >
        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <form data-testid="items-category-create-form" action={createCategoryAction} className="grid gap-4 rounded-[28px] border border-ink/10 bg-soft/30 p-5">
            <div>
              <p className="font-medium text-ink">新增類別</p>
              <p className="mt-1 text-sm text-ink/65">例如人員管理、內場作業環境、服務品質。若不特別填排序，系統會自動排在最後。</p>
            </div>
            <label className="grid gap-2 text-sm">
              <span className="text-ink/70">類別名稱</span>
              <input
                name="name"
                required
                placeholder="例如：出餐流程"
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-ink/70">排序（可不填）</span>
              <input
                name="sort_order"
                type="number"
                min={1}
                placeholder="例如：70"
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </label>
            <label className="grid gap-2 text-sm">
              <span className="text-ink/70">類別區域</span>
              <select name="field_type" defaultValue="none" className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
                <option value="none">共用</option>
                <option value="kitchen">內場</option>
                <option value="floor">外場</option>
              </select>
            </label>
            <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
              新增題目類別
            </button>
          </form>

          <div data-testid="items-category-list" className="grid gap-4">
            {(categories ?? []).map((category) => (
              <form key={category.id} action={updateCategoryAction} className="grid gap-4 rounded-[28px] border border-ink/10 bg-white/85 p-5 shadow-card">
                <input type="hidden" name="id" value={category.id} />
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-ink">{category.name}</p>
                    <p className="mt-1 text-sm text-ink/60">
                      目前排序 {category.sort_order} / 區域 {getCategoryFieldTypeLabel(category.field_type)}
                    </p>
                  </div>
                  <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">
                    {(items ?? []).filter((item) => item.category_id === category.id).length} 題
                  </span>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    name="name"
                    defaultValue={category.name}
                    required
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                  <input
                    name="sort_order"
                    type="number"
                    min={1}
                    defaultValue={category.sort_order}
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                  <select
                    name="field_type"
                    defaultValue={category.field_type}
                    className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  >
                    <option value="none">共用</option>
                    <option value="kitchen">內場</option>
                    <option value="floor">外場</option>
                  </select>
                </div>
                <div className="flex justify-end">
                  <button className="rounded-full bg-soft px-4 py-2 text-sm text-ink/80" type="submit">
                    儲存類別設定
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="新增題目"
        description="新增題目時先選類別，再決定它是所有門市都要巡的基礎題目，還是只適用特定店別的加題。店別加題保留為題目範圍設定，不和提醒用的標籤系統混在一起。"
      >
        <form data-testid="items-create-form" action={createItemAction} className="grid gap-4 lg:grid-cols-[1fr_220px]">
          <div className="grid gap-4">
            <input type="hidden" name="selected_store" value={selectedStoreId} />
            <label className="grid gap-2 text-sm">
              <span className="text-ink/70">題目名稱</span>
              <input
                name="name"
                required
                placeholder="例如：冰箱溫度記錄完整"
                className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
              />
            </label>

            <label className="grid gap-2 text-sm">
              <span className="text-ink/70">題目類別</span>
              <select name="category_id" required className="rounded-2xl border border-ink/10 bg-white px-4 py-3">
                <option value="">請先選擇類別</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <fieldset className="grid gap-3 rounded-2xl border border-ink/10 bg-soft/35 p-4">
              <legend className="px-2 text-sm font-medium text-ink">題目類型</legend>
              <label className="flex items-start gap-3 rounded-2xl bg-white/75 px-4 py-3 text-sm">
                <input type="radio" name="item_type" value="base" defaultChecked className="mt-1" />
                <span>
                  <span className="block font-medium">基礎題目</span>
                  <span className="text-ink/60">所有門市都會看到，也會直接進入巡店主流程。</span>
                </span>
              </label>
              <label className="flex items-start gap-3 rounded-2xl bg-white/75 px-4 py-3 text-sm">
                <input type="radio" name="item_type" value="scoped" className="mt-1" />
                <span>
                  <span className="block font-medium">店別加題</span>
                  <span className="text-ink/60">只出現在被勾選的店別，用來處理特殊站點或特定門市需求。</span>
                </span>
              </label>
            </fieldset>

            <fieldset className="grid gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4">
              <legend className="px-2 text-sm font-medium text-ink">適用店別（店別加題才需要勾）</legend>
              <div className="grid gap-3 md:grid-cols-2">
                {(stores ?? []).map((store) => (
                  <label key={store.id} className="flex items-center gap-3 rounded-2xl bg-soft/40 px-4 py-3 text-sm">
                    <input type="checkbox" name="store_ids" value={store.id} className="mt-0.5" />
                    <span>{store.name}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex flex-col justify-between rounded-[28px] border border-ink/10 bg-cream/85 p-5 shadow-card">
            <div className="space-y-3 text-sm text-ink/70">
              <p className="font-medium text-ink">新增流程建議</p>
              <ol className="space-y-2">
                <li>1. 先選類別</li>
                <li>2. 再決定是基礎題目還是店別加題</li>
                <li>3. 若是店別加題，就勾選適用的店別</li>
              </ol>
            </div>
            <button className="mt-6 rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
              新增題目
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="基礎題目"
        description="基礎題目依類別分組顯示，避免題目越來越多時整頁變成一長串。停用只會讓題目暫時不進巡店，不會刪掉歷史資料。"
      >
        <div data-testid="items-base-list" className="grid gap-5">
          {groupedBaseItems.map((group) => (
            <div key={group.id} className="rounded-[24px] border border-ink/10 bg-soft/35 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-serifTc text-xl font-semibold text-ink">{group.name}</p>
                  <p className="text-sm text-ink/65">{group.items.length} 題基礎題目</p>
                </div>
              </div>
              <div className="grid gap-3">
                {group.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-white/85 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-ink/60">
                        {item.is_active ? "目前啟用中" : "目前停用中"} / 基礎題目
                      </p>
                    </div>
                    <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">可在下方「編輯既有題目」調整名稱、類別與狀態</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="店別加題"
        description="店別加題一樣先按類別整理，下面再用店別去切換適用範圍。這種題目不屬於提醒標籤，而是『哪些店會看到這一題』的範圍設定。"
      >
        <form data-testid="items-store-filter-form" method="get" className="mb-5 grid gap-3 md:max-w-md md:grid-cols-[1fr_auto]">
          <select
            data-testid="items-store-select"
            name="store"
            defaultValue={selectedStoreId}
            className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
          >
            {(stores ?? []).map((store) => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <button className="rounded-full bg-soft px-4 py-2 text-xs" type="submit">
            切換店別
          </button>
        </form>

        <form data-testid="items-extra-form" action={updateExtraItemsAction} className="grid gap-5">
          <input type="hidden" name="store_id" value={selectedStoreId} />
          {groupedOptionalItems.length === 0 ? (
            <p className="text-sm text-ink/65">目前還沒有建立任何店別加題。你可以先在上方新增題目時選擇「店別加題」。</p>
          ) : (
            groupedOptionalItems.map((group) => (
              <div key={group.id} className="rounded-[24px] border border-ink/10 bg-soft/35 p-4">
                <div className="mb-4">
                  <p className="font-serifTc text-xl font-semibold text-ink">{group.name}</p>
                  <p className="text-sm text-ink/65">{group.items.length} 題店別加題</p>
                </div>
                <div className="grid gap-3">
                  {group.items.map((item) => {
                    const scopedStoreNames = (storeIdsByItemId[item.id] ?? []).map((storeId) => storeNamesById[storeId] ?? storeId);

                    return (
                      <label
                        key={item.id}
                        className="grid gap-4 rounded-2xl border border-ink/10 bg-white/85 p-4"
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            name="item_ids"
                            value={item.id}
                            defaultChecked={selectedExtraItemIds.has(item.id)}
                            className="mt-1"
                          />
                          <span className="grid gap-2">
                            <span className="font-medium text-ink">{item.name}</span>
                            <span className="text-xs text-ink/60">
                              {item.is_active ? "題目啟用中" : "題目停用中"} / 店別加題
                            </span>
                            <span className="flex flex-wrap gap-2">
                              {scopedStoreNames.length > 0 ? (
                                scopedStoreNames.map((storeName) => (
                                  <span key={storeName} className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">
                                    {storeName}
                                  </span>
                                ))
                              ) : (
                                <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">尚未指定店別</span>
                              )}
                            </span>
                          </span>
                        </div>
                        <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">可在下方「編輯既有題目」調整名稱、類別與狀態</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))
          )}
          <div>
            <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
              儲存店別加題設定
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard
        title="編輯既有題目"
        description="若你要改題目名稱、換類別，或把基礎題目改成店別加題，可以直接在下面操作。這裡會保留同樣的分類邏輯，避免未來題目越來越多時找不到。"
      >
        <div data-testid="items-item-editing" className="grid gap-5">
          {(categories ?? []).map((category) => {
            const categoryItems = (items ?? []).filter((item) => item.category_id === category.id);
            if (categoryItems.length === 0) return null;

            return (
              <div key={category.id} className="rounded-[24px] border border-ink/10 bg-soft/35 p-4">
                <div className="mb-4">
                  <p className="font-serifTc text-xl font-semibold text-ink">{category.name}</p>
                  <p className="text-sm text-ink/65">{categoryItems.length} 題</p>
                </div>
                <div className="grid gap-4">
                  {categoryItems.map((item) => (
                    <form key={item.id} action={updateItemAction} className="grid gap-4 rounded-2xl border border-ink/10 bg-white/85 p-4">
                      <input type="hidden" name="id" value={item.id} />
                      <input type="hidden" name="selected_store" value={selectedStoreId} />
                      <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                        <div className="grid gap-4">
                          <label className="grid gap-2 text-sm">
                            <span className="text-ink/70">題目名稱</span>
                            <input
                              name="name"
                              defaultValue={item.name}
                              required
                              className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                            />
                          </label>
                          <label className="grid gap-2 text-sm">
                            <span className="text-ink/70">題目類別</span>
                            <select
                              name="category_id"
                              defaultValue={item.category_id}
                              required
                              className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                            >
                              {(categories ?? []).map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="grid gap-2 text-sm">
                            <span className="text-ink/70">啟用狀態</span>
                            <select
                              name="is_active"
                              defaultValue={String(item.is_active)}
                              className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                            >
                              <option value="true">啟用</option>
                              <option value="false">停用</option>
                            </select>
                          </label>
                          <fieldset className="grid gap-3 rounded-2xl border border-ink/10 bg-soft/35 p-4">
                            <legend className="px-2 text-sm font-medium text-ink">題目類型</legend>
                            <label className="flex items-start gap-3 rounded-2xl bg-white/75 px-4 py-3 text-sm">
                              <input type="radio" name="item_type" value="base" defaultChecked={item.is_base} className="mt-1" />
                              <span>
                                <span className="block font-medium">基礎題目</span>
                                <span className="text-ink/60">所有門市都會看到，勾選的店別將被忽略。</span>
                              </span>
                            </label>
                            <label className="flex items-start gap-3 rounded-2xl bg-white/75 px-4 py-3 text-sm">
                              <input type="radio" name="item_type" value="scoped" defaultChecked={!item.is_base} className="mt-1" />
                              <span>
                                <span className="block font-medium">店別加題</span>
                                <span className="text-ink/60">只出現在下方勾選的店別。</span>
                              </span>
                            </label>
                          </fieldset>
                          <fieldset className="grid gap-3 rounded-2xl border border-ink/10 bg-white/70 p-4">
                            <legend className="px-2 text-sm font-medium text-ink">適用店別（只在店別加題時生效）</legend>
                            <div className="grid gap-3 md:grid-cols-2">
                              {(stores ?? []).map((store) => (
                                <label key={store.id} className="flex items-center gap-3 rounded-2xl bg-soft/40 px-4 py-3 text-sm">
                                  <input
                                    type="checkbox"
                                    name="store_ids"
                                    value={store.id}
                                    defaultChecked={(storeIdsByItemId[item.id] ?? []).includes(store.id)}
                                    className="mt-0.5"
                                  />
                                  <span>{store.name}</span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                        </div>
                        <div className="flex flex-col justify-between rounded-[24px] border border-ink/10 bg-cream/85 p-4">
                          <div className="space-y-3 text-sm text-ink/70">
                            <p className="font-medium text-ink">目前狀態</p>
                            <ul className="space-y-2">
                              <li>{item.is_active ? "啟用中" : "停用中"}</li>
                              <li>{item.is_base ? "基礎題目" : "店別加題"}</li>
                              <li>
                                適用店別：
                                {(storeIdsByItemId[item.id] ?? []).length > 0
                                  ? (storeIdsByItemId[item.id] ?? []).map((storeId) => storeNamesById[storeId] ?? storeId).join("、")
                                  : "全部店通用"}
                              </li>
                            </ul>
                          </div>
                          <button className="mt-6 rounded-full bg-white px-5 py-3 text-sm text-ink" type="submit">
                            儲存題目設定
                          </button>
                        </div>
                      </div>
                    </form>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}
