import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getInspectionTagDescription, getInspectionTagLabel, getInspectionTagSourceLabel } from "@/lib/ui-labels";
import { formatMonthValue } from "@/lib/utils";
import { getInspectionItemTags } from "@/lib/settings";

type SearchParams = Promise<{ month?: string; monthlyStore?: string; complaintStore?: string }>;

function getRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

export default async function FocusItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole("owner", "manager");
  const params = await searchParams;
  const month = formatMonthValue(params.month);
  const monthlyStoreId = params.monthlyStore || "";
  const complaintStoreId = params.complaintStore || "";
  const admin = createAdminClient();

  const [{ data: items }, { data: stores }, currentTags] = await Promise.all([
    admin
      .from("inspection_items")
      .select("id, name, categories(name)")
      .eq("is_active", true)
      .order("name"),
    admin.from("stores").select("id, name").order("name"),
    getInspectionItemTags(month),
  ]);

  const criticalIds = new Set(
    currentTags.filter((entry) => entry.type === "critical").map((entry) => entry.item_id as string),
  );
  const monthlyIds = new Set(
    currentTags
      .filter(
        (entry) =>
          entry.type === "monthly_attention" &&
          ((monthlyStoreId && entry.store_id === monthlyStoreId) || (!monthlyStoreId && !entry.store_id)),
      )
      .map((entry) => entry.item_id as string),
  );
  const complaintIds = new Set(
    currentTags
      .filter(
        (entry) =>
          entry.type === "complaint_watch" &&
          ((complaintStoreId && entry.store_id === complaintStoreId) || (!complaintStoreId && !entry.store_id)),
      )
      .map((entry) => entry.item_id as string),
  );

  const complaintAutoTags = currentTags.filter(
    (entry) =>
      entry.type === "complaint_watch" &&
      entry.source === "complaint_sync" &&
      ((complaintStoreId && entry.store_id === complaintStoreId) || (!complaintStoreId && !entry.store_id)),
  );

  async function updateCriticalAction(formData: FormData) {
    "use server";
    const { setInspectionItemTags } = await import("@/lib/settings");
    await setInspectionItemTags({
      type: "critical",
      itemIds: formData.getAll("item_ids").map(String),
    });
  }

  async function updateMonthlyAction(formData: FormData) {
    "use server";
    const { setInspectionItemTags } = await import("@/lib/settings");
    const storeValue = String(formData.get("store_id") ?? "");
    await setInspectionItemTags({
      type: "monthly_attention",
      month: String(formData.get("month")),
      storeId: storeValue || null,
      itemIds: formData.getAll("item_ids").map(String),
    });
  }

  async function updateComplaintAction(formData: FormData) {
    "use server";
    const { setInspectionItemTags } = await import("@/lib/settings");
    const storeValue = String(formData.get("store_id") ?? "");
    await setInspectionItemTags({
      type: "complaint_watch",
      month: String(formData.get("month")),
      storeId: storeValue || null,
      itemIds: formData.getAll("item_ids").map(String),
    });
  }

  function renderItemChecklist(selectedIds: Set<string>) {
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {items?.map((item) => {
          const category = getRelation(item.categories) as { name?: string } | null;
          return (
            <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-3">
              <input type="checkbox" name="item_ids" value={item.id} defaultChecked={selectedIds.has(item.id)} className="mt-1" />
              <span>
                <span className="block font-medium">{item.name}</span>
                <span className="text-xs text-ink/60">{category?.name ?? "未分類"}</span>
              </span>
            </label>
          );
        })}
      </div>
    );
  }

  return (
    <div data-testid="tag-management-page" className="grid gap-6">
      <SectionCard
        title="題目標籤總覽"
        description="這裡管理巡店表單中的題目標籤。只要題目被標記，就不會預設為 3 分，必須由巡店人員手動確認。"
      >
        <div className="grid gap-3 md:grid-cols-3">
          {(["critical", "monthly_attention", "complaint_watch"] as const).map((type) => (
            <div key={type} className="rounded-2xl border border-ink/10 bg-soft/40 p-4">
              <p className="font-medium text-ink">{getInspectionTagLabel(type)}</p>
              <p className="mt-2 text-sm leading-6 text-ink/70">{getInspectionTagDescription(type)}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      {profile.role === "owner" ? (
        <SectionCard title="必查項目" description="四間店都通用的高風險題目，適合食安、衛生與絕對不能出錯的檢查項目。">
          <form data-testid="tag-section-critical" action={updateCriticalAction} className="grid gap-4">
            {renderItemChecklist(criticalIds)}
            <div>
              <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
                更新必查項目
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="本月加強" description="這個月需要特別追蹤的題目，可選擇套用到全部店別或指定單店。">
        <form method="get" className="grid gap-3 rounded-2xl border border-ink/10 bg-soft/30 p-4 md:grid-cols-[200px_220px_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm text-ink/70">月份</label>
            <input type="month" name="month" defaultValue={month} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-ink/70">店別</label>
            <select data-testid="monthly-tag-store-filter" name="monthlyStore" defaultValue={monthlyStoreId} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <option value="">全部店別</option>
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button className="rounded-full bg-soft px-4 py-3 text-sm text-ink/75" type="submit">
              套用篩選
            </button>
          </div>
        </form>

        <form data-testid="tag-section-monthly-attention" action={updateMonthlyAction} className="mt-4 grid gap-4">
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="store_id" value={monthlyStoreId} />
          {renderItemChecklist(monthlyIds)}
          <div>
            <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
              更新本月加強標籤
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="客訴項目" description="先支援人工標記，未來客訴資料庫串進來後，系統也能自動補上最近一個月的客訴追蹤標籤。">
        <form method="get" className="grid gap-3 rounded-2xl border border-ink/10 bg-soft/30 p-4 md:grid-cols-[200px_220px_auto] md:items-end">
          <div>
            <label className="mb-2 block text-sm text-ink/70">月份</label>
            <input type="month" name="month" defaultValue={month} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3" />
          </div>
          <div>
            <label className="mb-2 block text-sm text-ink/70">店別</label>
            <select data-testid="complaint-tag-store-filter" name="complaintStore" defaultValue={complaintStoreId} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3">
              <option value="">全部店別</option>
              {stores?.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <button className="rounded-full bg-soft px-4 py-3 text-sm text-ink/75" type="submit">
              套用篩選
            </button>
          </div>
        </form>

        {complaintAutoTags.length > 0 ? (
          <div className="mt-4 rounded-2xl border border-warm/20 bg-warm/5 p-4 text-sm text-ink/75">
            <p className="font-medium text-ink">已存在客訴自動標記</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {complaintAutoTags.map((tag) => {
                const item = getRelation(tag.inspection_items) as { name?: string } | null;
                return (
                  <span key={tag.id} className="rounded-full bg-white px-3 py-2 text-xs text-ink/70">
                    {item?.name ?? tag.item_id} / {getInspectionTagSourceLabel(tag.source)}
                  </span>
                );
              })}
            </div>
          </div>
        ) : null}

        <form data-testid="tag-section-complaint-watch" action={updateComplaintAction} className="mt-4 grid gap-4">
          <input type="hidden" name="month" value={month} />
          <input type="hidden" name="store_id" value={complaintStoreId} />
          {renderItemChecklist(complaintIds)}
          <div>
            <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
              更新客訴項目標籤
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
