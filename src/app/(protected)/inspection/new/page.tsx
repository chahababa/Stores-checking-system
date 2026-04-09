import { InspectionForm } from "@/components/inspection/inspection-form";
import { createInspection, getInspectionFormSeed } from "@/lib/inspection";

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
      <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">巡店作業</p>
        <h1 className="mt-2 font-serifTc text-3xl font-semibold">新增巡店</h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          確認當班人員、逐題評分、需要時補上照片，並在儲存前完成所有重點項目的評分。
        </p>
      </div>

      <InspectionForm seed={seed} saveAction={createInspection} />
    </div>
  );
}
