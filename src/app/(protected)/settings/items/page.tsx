import Link from "next/link";
import { redirect } from "next/navigation";

import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type FieldType = "kitchen" | "floor" | "none";
type SearchParams = Promise<{
  tab?: string;
  success?: string;
  q?: string;
  category?: string;
  scope?: string;
}>;

type StoreRecord = { id: string; name: string; code: string };
type CategoryRecord = { id: string; name: string; sort_order: number; field_type: FieldType };
type ItemRecord = {
  id: string;
  name: string;
  is_base: boolean;
  is_active: boolean;
  category_id: string;
  sort_order: number;
};

const ITEM_TABS = [
  { key: "items", label: "題目管理" },
  { key: "categories", label: "類別管理" },
] as const;

function getSuccessMessage(success?: string) {
  if (success === "category-created") return "題目類別已新增。";
  if (success === "category-updated") return "題目類別已更新。";
  if (success === "item-created") return "題目已新增。";
  if (success === "item-updated") return "題目設定已更新。";
  return null;
}

function getFieldTypeLabel(fieldType: FieldType) {
  if (fieldType === "kitchen") return "內場";
  if (fieldType === "floor") return "外場";
  return "共用";
}

function getScopeLabel(isBase: boolean) {
  return isBase ? "全門市共用題目" : "門市專屬題目";
}

function getScopeSummary(item: ItemRecord, storeNames: string[]) {
  if (item.is_base) return "所有門市都會看到這一題。";
  return storeNames.length > 0 ? `目前套用門市：${storeNames.join("、")}` : "尚未指定套用門市。";
}

function buildTabHref(tab: string, params: { q?: string; category?: string; scope?: string }) {
  const search = new URLSearchParams();
  search.set("tab", tab);
  if (params.q) search.set("q", params.q);
  if (params.category) search.set("category", params.category);
  if (params.scope) search.set("scope", params.scope);
  return `/settings/items?${search.toString()}`;
}

export default async function ItemsSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner");
  const params = await searchParams;
  const activeTab = params.tab === "categories" ? "categories" : "items";
  const query = params.q?.trim() ?? "";
  const selectedCategory = params.category?.trim() ?? "";
  const selectedScope = params.scope?.trim() ?? "all";
  const successMessage = getSuccessMessage(params.success);

  const admin = createAdminClient();
  const [{ data: stores }, { data: categories }, { data: items }, { data: extraRows }] = await Promise.all([
    admin.from("stores").select("id, name, code").order("name"),
    admin.from("categories").select("id, name, sort_order, field_type").order("sort_order"),
    admin
      .from("inspection_items")
      .select("id, name, is_base, is_active, category_id, sort_order")
      .order("sort_order"),
    admin.from("store_extra_items").select("store_id, item_id"),
  ]);

  const typedStores = (stores ?? []) as StoreRecord[];
  const typedCategories = (categories ?? []) as CategoryRecord[];
  const typedItems = (items ?? []) as ItemRecord[];
  const storeIdsByItemId = (extraRows ?? []).reduce<Record<string, string[]>>((carry, row) => {
    const group = carry[row.item_id] ?? [];
    group.push(row.store_id);
    carry[row.item_id] = group;
    return carry;
  }, {});
  const storeNamesById = Object.fromEntries(typedStores.map((store) => [store.id, store.name]));

  const normalizedQuery = query.toLowerCase();
  const filteredItems = typedItems.filter((item) => {
    const matchesQuery = !normalizedQuery || item.name.toLowerCase().includes(normalizedQuery);
    const matchesCategory = !selectedCategory || item.category_id === selectedCategory;
    const matchesScope =
      selectedScope === "all" ||
      (selectedScope === "base" && item.is_base) ||
      (selectedScope === "scoped" && !item.is_base);
    return matchesQuery && matchesCategory && matchesScope;
  });

  const groupedItems = typedCategories
    .map((category) => ({
      category,
      items: filteredItems
        .filter((item) => item.category_id === category.id)
        .sort((left, right) => left.sort_order - right.sort_order),
    }))
    .filter((group) => group.items.length > 0);

  async function createItemAction(formData: FormData) {
    "use server";
    const { createInspectionItem } = await import("@/lib/settings");
    const type = String(formData.get("item_type") || "base");
    await createInspectionItem({
      name: String(formData.get("name") || ""),
      categoryId: String(formData.get("category_id") || ""),
      isBase: type === "base",
      storeIds: formData.getAll("store_ids").map(String),
    });
    redirect("/settings/items?tab=items&success=item-created");
  }

  async function updateItemAction(formData: FormData) {
    "use server";
    const { updateInspectionItem } = await import("@/lib/settings");
    const type = String(formData.get("item_type") || "base");
    const qValue = String(formData.get("return_q") || "");
    const categoryValue = String(formData.get("return_category") || "");
    const scopeValue = String(formData.get("return_scope") || "all");

    await updateInspectionItem({
      id: String(formData.get("id") || ""),
      name: String(formData.get("name") || ""),
      categoryId: String(formData.get("category_id") || ""),
      isBase: type === "base",
      isActive: String(formData.get("is_active") || "true") === "true",
      storeIds: formData.getAll("store_ids").map(String),
    });

    const next = new URLSearchParams({ tab: "items", success: "item-updated" });
    if (qValue) next.set("q", qValue);
    if (categoryValue) next.set("category", categoryValue);
    if (scopeValue && scopeValue !== "all") next.set("scope", scopeValue);
    redirect(`/settings/items?${next.toString()}`);
  }

  async function createCategoryAction(formData: FormData) {
    "use server";
    const { createInspectionCategory } = await import("@/lib/settings");
    await createInspectionCategory({
      name: String(formData.get("name") || ""),
      sortOrder: Number(formData.get("sort_order") || 0) || null,
      fieldType: String(formData.get("field_type") || "none") as FieldType,
    });
    redirect("/settings/items?tab=categories&success=category-created");
  }

  async function updateCategoryAction(formData: FormData) {
    "use server";
    const { updateInspectionCategory } = await import("@/lib/settings");
    await updateInspectionCategory({
      id: String(formData.get("id") || ""),
      name: String(formData.get("name") || ""),
      sortOrder: Number(formData.get("sort_order") || 0) || 100,
      fieldType: String(formData.get("field_type") || "none") as FieldType,
    });
    redirect("/settings/items?tab=categories&success=category-updated");
  }

  return (
    <div className="grid gap-6" data-testid="items-settings-page">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <section className="nb-card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="nb-eyebrow">Inspection Items</p>
            <h1 className="font-nbSerif text-4xl font-black text-nb-ink">題目管理</h1>
            <p className="max-w-3xl text-sm leading-7 text-nb-ink/75 font-bold">
              先整理類別，再新增或調整題目會比較順。這一頁把題目與類別拆成兩個工作區，避免所有功能都堆在同一個超長畫面裡。
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            {ITEM_TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <Link
                  key={tab.key}
                  href={buildTabHref(tab.key, { q: query, category: selectedCategory, scope: selectedScope })}
                  className={isActive ? "nb-tab-active" : "nb-tab"}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </section>

      {activeTab === "categories" ? (
        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="xl:sticky xl:top-24 xl:self-start">
            <SectionCard
              title="新增題目類別"
              eyebrow="Create Category"
              description="類別主要用來整理題目、控制報表分組，以及幫管理者快速找到要看的區塊。排序數字越小會排越前面。"
            >
              <form action={createCategoryAction} className="grid gap-4" data-testid="items-category-create-form">
                <div>
                  <label className="nb-label">類別名稱</label>
                  <input className="nb-input" name="name" placeholder="例如：餐點品質" required />
                </div>
                <div>
                  <label className="nb-label">排序</label>
                  <input className="nb-input" name="sort_order" type="number" min={1} placeholder="數字越小排越前面" />
                </div>
                <div>
                  <label className="nb-label">巡檢區域（報表用）</label>
                  <select className="nb-select" defaultValue="none" name="field_type">
                    <option value="none">共用</option>
                    <option value="kitchen">內場</option>
                    <option value="floor">外場</option>
                  </select>
                  <p className="nb-help">只影響分組與報表判讀，不會限制巡店流程。</p>
                </div>
                <button className="nb-btn-primary" type="submit">
                  儲存變更
                </button>
              </form>
            </SectionCard>
          </div>

          <SectionCard
            title="既有類別"
            eyebrow="Categories"
            description="這裡會顯示目前的題目類別、排序與題數。若要調整名稱或順序，直接在對應卡片上修改即可。"
          >
            <div className="grid gap-4" data-testid="items-category-list">
              {typedCategories.map((category) => (
                <form key={category.id} action={updateCategoryAction} className="nb-row grid gap-4">
                  <input name="id" type="hidden" value={category.id} />
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-nbSerif text-xl font-black">{category.name}</p>
                      <p className="nb-eyebrow mt-1">
                        排序 {category.sort_order} ・ {getFieldTypeLabel(category.field_type)}
                      </p>
                    </div>
                    <span className="nb-chip">
                      {typedItems.filter((item) => item.category_id === category.id).length} 題
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="nb-label">類別名稱</label>
                      <input className="nb-input" defaultValue={category.name} name="name" required />
                    </div>
                    <div>
                      <label className="nb-label">排序</label>
                      <input className="nb-input" defaultValue={category.sort_order} min={1} name="sort_order" type="number" />
                    </div>
                    <div>
                      <label className="nb-label">巡檢區域（報表用）</label>
                      <select className="nb-select" defaultValue={category.field_type} name="field_type">
                        <option value="none">共用</option>
                        <option value="kitchen">內場</option>
                        <option value="floor">外場</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button className="nb-btn-xs" type="submit">
                      儲存變更
                    </button>
                  </div>
                </form>
              ))}
            </div>
          </SectionCard>
        </div>
      ) : (
        <div className="grid gap-6">
          <SectionCard
            title="新增題目"
            eyebrow="Create Item"
            description="先選類別，再決定這題是全門市共用題目，還是只給特定門市使用的專屬題目。建立後就會出現在下方清單。"
          >
            <form action={createItemAction} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]" data-testid="items-create-form">
              <div className="grid gap-4">
                <div>
                  <label className="nb-label">題目名稱</label>
                  <input className="nb-input" name="name" placeholder="例如：冷藏庫溫度是否正常" required />
                </div>
                <div>
                  <label className="nb-label">題目類別</label>
                  <select className="nb-select" name="category_id" required>
                    <option value="">請選擇類別</option>
                    {typedCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <fieldset className="nb-card-flat bg-nb-bg2 grid gap-3 p-4">
                  <legend className="px-2 font-nbSerif text-base font-black">題目類型</legend>
                  <label className="nb-check-card">
                    <input className="nb-radio mt-1" defaultChecked name="item_type" type="radio" value="base" />
                    <span className="grid gap-1">
                      <span className="font-bold">全門市共用題目</span>
                      <span className="nb-eyebrow">所有門市都會看到，適合共通規範或固定檢查項目。</span>
                    </span>
                  </label>
                  <label className="nb-check-card">
                    <input className="nb-radio mt-1" name="item_type" type="radio" value="scoped" />
                    <span className="grid gap-1">
                      <span className="font-bold">門市專屬題目</span>
                      <span className="nb-eyebrow">只會出現在指定門市，適合特定設備或門市流程。</span>
                    </span>
                  </label>
                </fieldset>

                <fieldset className="nb-card-flat bg-white grid gap-3 p-4">
                  <legend className="px-2 font-nbSerif text-base font-black">適用門市（只對門市專屬題目生效）</legend>
                  <div className="grid gap-3 md:grid-cols-2">
                    {typedStores.map((store) => (
                      <label key={store.id} className="nb-check-card">
                        <input className="nb-check" name="store_ids" type="checkbox" value={store.id} />
                        <span className="font-bold">{store.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>

              <aside className="nb-card-flat bg-nb-amber/40 p-5">
                <p className="font-nbSerif text-lg font-black">建立前小提醒</p>
                <ol className="mt-3 grid gap-2 text-sm leading-7 text-nb-ink/80 font-bold">
                  <li>1. 類別先整理好，報表才會好判讀。</li>
                  <li>2. 全門市共用題目適合共同規範，門市專屬題目適合在地差異。</li>
                  <li>3. 若是門市專屬題目，請至少勾選一間門市。</li>
                </ol>
                <button className="nb-btn-primary mt-6 w-full" type="submit">
                  新增題目
                </button>
              </aside>
            </form>
          </SectionCard>

          <SectionCard
            title="題目清單"
            eyebrow="Items"
            description="用搜尋與篩選快速找到要改的題目。平常先掃描摘要列，真的需要調整時再展開單一題目即可。"
          >
            <form
              className="nb-card-flat bg-nb-bg2 grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_220px_220px_auto]"
              method="get"
            >
              <input name="tab" type="hidden" value="items" />
              <div>
                <label className="nb-label">搜尋題目</label>
                <input className="nb-input" defaultValue={query} name="q" placeholder="輸入題目名稱關鍵字" />
              </div>
              <div>
                <label className="nb-label">類別篩選</label>
                <select className="nb-select" defaultValue={selectedCategory} name="category">
                  <option value="">全部類別</option>
                  {typedCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="nb-label">題目類型</label>
                <select className="nb-select" defaultValue={selectedScope} name="scope">
                  <option value="all">全部題目</option>
                  <option value="base">全門市共用題目</option>
                  <option value="scoped">門市專屬題目</option>
                </select>
              </div>
              <div className="flex items-end gap-3">
                <button className="nb-btn-xs" type="submit">
                  套用篩選
                </button>
                <Link className="nb-btn-xs bg-nb-bg2" href="/settings/items?tab=items">
                  清除
                </Link>
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <span className="nb-chip">目前共 {filteredItems.length} 題</span>
              {query ? <span className="nb-chip">關鍵字：{query}</span> : null}
              {selectedCategory ? (
                <span className="nb-chip">
                  類別：{typedCategories.find((category) => category.id === selectedCategory)?.name ?? "未指定"}
                </span>
              ) : null}
              {selectedScope !== "all" ? (
                <span className="nb-chip">類型：{selectedScope === "base" ? "全門市共用題目" : "門市專屬題目"}</span>
              ) : null}
            </div>

            <div className="mt-5 grid gap-5" data-testid="items-item-editing">
              {groupedItems.length === 0 ? (
                <div className="nb-empty">目前沒有符合條件的題目。可以先清除篩選，或直接新增一題。</div>
              ) : (
                groupedItems.map(({ category, items: categoryItems }) => (
                  <div key={category.id} className="nb-card-flat bg-nb-bg2 p-4">
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="font-nbSerif text-xl font-black">{category.name}</p>
                        <p className="nb-eyebrow mt-1">
                          {categoryItems.length} 題 ・ {getFieldTypeLabel(category.field_type)}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-3">
                      {categoryItems.map((item) => {
                        const scopedStoreNames = (storeIdsByItemId[item.id] ?? []).map(
                          (storeId) => storeNamesById[storeId] ?? storeId,
                        );

                        return (
                          <details
                            key={item.id}
                            className="nb-details"
                            open={Boolean(query || selectedCategory || selectedScope !== "all")}
                          >
                            <summary className="nb-details-summary">
                              <div className="space-y-2">
                                <p className="font-nbSerif text-lg font-black">{item.name}</p>
                                <div className="flex flex-wrap gap-2">
                                  <span className="nb-chip">{category.name}</span>
                                  <span className="nb-chip">{getScopeLabel(item.is_base)}</span>
                                  <span className={item.is_active ? "nb-chip-green" : "nb-chip bg-nb-ink/10 text-nb-ink/70"}>
                                    {item.is_active ? "啟用中" : "停用"}
                                  </span>
                                </div>
                              </div>
                              <div className="max-w-xl text-right text-sm text-nb-ink/65 font-bold">
                                {getScopeSummary(item, scopedStoreNames)}
                              </div>
                            </summary>

                            <form action={updateItemAction} className="grid gap-5 border-t-2 border-nb-ink px-5 py-5">
                              <input name="id" type="hidden" value={item.id} />
                              <input name="return_q" type="hidden" value={query} />
                              <input name="return_category" type="hidden" value={selectedCategory} />
                              <input name="return_scope" type="hidden" value={selectedScope} />

                              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                                <div className="grid gap-4">
                                  <div className="nb-card-flat bg-nb-bg2 p-4">
                                    <p className="nb-eyebrow">正在編輯</p>
                                    <p className="mt-1 font-nbSerif text-lg font-black">{item.name}</p>
                                  </div>

                                  <div>
                                    <label className="nb-label">題目名稱</label>
                                    <input className="nb-input" defaultValue={item.name} name="name" required />
                                  </div>

                                  <div className="grid gap-4 md:grid-cols-2">
                                    <div>
                                      <label className="nb-label">題目類別</label>
                                      <select className="nb-select" defaultValue={item.category_id} name="category_id" required>
                                        {typedCategories.map((option) => (
                                          <option key={option.id} value={option.id}>
                                            {option.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="nb-label">啟用狀態</label>
                                      <select className="nb-select" defaultValue={String(item.is_active)} name="is_active">
                                        <option value="true">啟用中</option>
                                        <option value="false">停用</option>
                                      </select>
                                    </div>
                                  </div>

                                  <fieldset className="nb-card-flat bg-nb-bg2 grid gap-3 p-4">
                                    <legend className="px-2 font-nbSerif text-base font-black">題目類型</legend>
                                    <label className="nb-check-card">
                                      <input
                                        className="nb-radio mt-1"
                                        defaultChecked={item.is_base}
                                        name="item_type"
                                        type="radio"
                                        value="base"
                                      />
                                      <span className="grid gap-1">
                                        <span className="font-bold">全門市共用題目</span>
                                        <span className="nb-eyebrow">適合所有門市都要執行的固定題目。</span>
                                      </span>
                                    </label>
                                    <label className="nb-check-card">
                                      <input
                                        className="nb-radio mt-1"
                                        defaultChecked={!item.is_base}
                                        name="item_type"
                                        type="radio"
                                        value="scoped"
                                      />
                                      <span className="grid gap-1">
                                        <span className="font-bold">門市專屬題目</span>
                                        <span className="nb-eyebrow">只在指定門市出現，適合設備或流程差異。</span>
                                      </span>
                                    </label>
                                  </fieldset>

                                  <fieldset className="nb-card-flat bg-white grid gap-3 p-4">
                                    <legend className="px-2 font-nbSerif text-base font-black">適用門市（只對門市專屬題目生效）</legend>
                                    <div className="grid gap-3 md:grid-cols-2">
                                      {typedStores.map((store) => (
                                        <label key={store.id} className="nb-check-card">
                                          <input
                                            className="nb-check"
                                            defaultChecked={(storeIdsByItemId[item.id] ?? []).includes(store.id)}
                                            name="store_ids"
                                            type="checkbox"
                                            value={store.id}
                                          />
                                          <span className="font-bold">{store.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </fieldset>
                                </div>

                                <aside className="nb-card-flat bg-nb-amber/40 p-4">
                                  <p className="font-nbSerif text-lg font-black">目前狀態</p>
                                  <ul className="mt-3 grid gap-2 text-sm leading-7 text-nb-ink/80 font-bold">
                                    <li>題目類型：{getScopeLabel(item.is_base)}</li>
                                    <li>啟用狀態：{item.is_active ? "啟用中" : "停用"}</li>
                                    <li>巡檢區域：{getFieldTypeLabel(category.field_type)}</li>
                                    <li>{getScopeSummary(item, scopedStoreNames)}</li>
                                  </ul>
                                  <button className="nb-btn-primary mt-6 w-full" type="submit">
                                    儲存變更
                                  </button>
                                </aside>
                              </div>
                            </form>
                          </details>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>
        </div>
      )}
    </div>
  );
}
