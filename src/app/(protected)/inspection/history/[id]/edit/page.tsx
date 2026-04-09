import Link from "next/link";

import { InspectionForm } from "@/components/inspection/inspection-form";
import { getInspectionEditSeed, updateInspection } from "@/lib/inspection";

type PageParams = Promise<{ id: string }>;

export default async function EditInspectionPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const seed = await getInspectionEditSeed(id);

  async function updateAction(payload: Parameters<typeof updateInspection>[1]) {
    "use server";
    return updateInspection(id, payload);
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">巡店作業</p>
          <h1 className="mt-2 font-serifTc text-3xl font-semibold">編輯巡店紀錄</h1>
          <p className="mt-3 text-sm leading-6 text-ink/70">
            你可以調整評分、當班人員與備註，也能補傳更多照片，並保留同一筆巡店紀錄。
          </p>
        </div>
        <Link href={`/inspection/history/${id}`} className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
          返回明細
        </Link>
      </div>

      <InspectionForm
        seed={seed.formSeed}
        initialState={seed.initialState}
        saveAction={updateAction}
        submitLabel="更新巡店紀錄"
        isEditMode
      />
    </div>
  );
}
