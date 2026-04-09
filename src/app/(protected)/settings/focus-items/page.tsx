import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { getFocusItems } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatMonthValue } from "@/lib/utils";

type SearchParams = Promise<{ month?: string }>;

export default async function FocusItemsPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireRole("owner", "manager");
  const params = await searchParams;
  const month = formatMonthValue(params.month);
  const admin = createAdminClient();
  const [{ data: items }, currentFocus] = await Promise.all([
    admin
      .from("inspection_items")
      .select("id, name, categories(name)")
      .eq("is_active", true)
      .order("name"),
    getFocusItems(month),
  ]);

  const selectedIds = new Set(currentFocus.map((item) => item.item_id as string));

  async function updatePermanentAction(formData: FormData) {
    "use server";
    const { setFocusItems } = await import("@/lib/settings");
    await setFocusItems({
      type: "permanent",
      itemIds: formData.getAll("item_ids").map(String),
    });
  }

  async function updateMonthlyAction(formData: FormData) {
    "use server";
    const { setFocusItems } = await import("@/lib/settings");
    await setFocusItems({
      type: "monthly",
      month: String(formData.get("month")),
      itemIds: formData.getAll("item_ids").map(String),
    });
  }

  return (
    <div className="grid gap-6">
      {profile.role === "owner" ? (
        <SectionCard title="永久重點項目" description="只有系統擁有者可以維護長期重點。">
          <form action={updatePermanentAction} className="grid gap-3 md:grid-cols-2">
            {items?.map((item) => (
              <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-soft/40 p-3">
                <input
                  type="checkbox"
                  name="item_ids"
                  value={item.id}
                  defaultChecked={currentFocus.some((entry) => entry.type === "permanent" && entry.item_id === item.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-xs text-ink/60">{item.categories?.[0]?.name ?? "未分類"}</span>
                </span>
              </label>
            ))}
            <div className="md:col-span-2">
              <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
                儲存永久重點
              </button>
            </div>
          </form>
        </SectionCard>
      ) : null}

      <SectionCard title="每月重點項目" description="系統擁有者與店主管都可以設定指定月份要特別追蹤的項目。">
        <form action={updateMonthlyAction} className="grid gap-4">
          <div className="max-w-xs">
            <input type="month" name="month" defaultValue={month} className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3" />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {items?.map((item) => (
              <label key={item.id} className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-white/70 p-3">
                <input
                  type="checkbox"
                  name="item_ids"
                  value={item.id}
                  defaultChecked={currentFocus.some((entry) => entry.type === "monthly" && entry.item_id === item.id)}
                  className="mt-1"
                />
                <span>
                  <span className="block font-medium">{item.name}</span>
                  <span className="text-xs text-ink/60">{item.categories?.[0]?.name ?? "未分類"}</span>
                  {selectedIds.has(item.id) ? (
                    <span className="mt-1 inline-block rounded-full bg-soft px-2 py-1 text-[11px] text-ink/70">
                      目前已列入重點
                    </span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
          <div>
            <button className="rounded-full bg-warm px-5 py-3 text-sm text-white" type="submit">
              儲存每月重點
            </button>
          </div>
        </form>
      </SectionCard>
    </div>
  );
}
