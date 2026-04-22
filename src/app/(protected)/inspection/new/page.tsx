import { InspectionForm } from "@/components/inspection/inspection-form";
import { createInspectionAction } from "@/lib/inspection-actions";
import { getInspectionFormSeed } from "@/lib/inspection";

type SearchParams = Promise<{ store?: string; date?: string }>;

export default async function NewInspectionPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const seed = await getInspectionFormSeed({
    storeId: params.store,
    date: params.date,
  });

  return (
    <div className="grid gap-6">
      {/* Page header */}
      <div className="nb-card p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="nb-eyebrow">Inspection / New</p>
          <h1 className="nb-h1 mt-2">新增巡店</h1>
          <p className="mt-3 text-sm text-nb-ink/70 leading-6 max-w-2xl">
            請勾選當班人員、完成逐題評分、必要時補上照片，送出前再確認所有標籤題目（必查 / 本月加強 / 客訴）都已手動評分。
          </p>
        </div>
        <div className="nb-stamp">
          Inspection Form
        </div>
      </div>

      <InspectionForm
        key={`${seed.selectedStoreId}:${seed.selectedDate}`}
        seed={seed}
        saveAction={createInspectionAction}
      />
    </div>
  );
}
