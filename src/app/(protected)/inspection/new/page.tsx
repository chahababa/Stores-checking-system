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
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Inspection</p>
        <h1 className="mt-2 font-serifTc text-3xl font-semibold">New Inspection</h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          Review the shift, score each item, upload photos when needed, and keep focus items fully completed before
          saving.
        </p>
      </div>

      <InspectionForm seed={seed} saveAction={createInspection} />
    </div>
  );
}
