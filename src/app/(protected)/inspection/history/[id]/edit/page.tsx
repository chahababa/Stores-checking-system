import Link from "next/link";

import { InspectionForm } from "@/components/inspection/inspection-form";
import { updateInspectionAction } from "@/lib/inspection-actions";
import { getInspectionEditSeed, type InspectionMutationInput } from "@/lib/inspection";

type PageParams = Promise<{ id: string }>;

export default async function EditInspectionPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const seed = await getInspectionEditSeed(id);

  async function updateAction(payload: InspectionMutationInput) {
    "use server";
    return updateInspectionAction(id, payload);
  }

  return (
    <div className="grid gap-6">
      {/* Page header */}
      <div className="nb-card p-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="nb-eyebrow">Inspection / Edit</p>
          <h1 className="nb-h1 mt-2">編輯巡店紀錄</h1>
          <p className="mt-3 text-sm text-nb-ink/70 leading-6 max-w-2xl">
            你可以調整評分、當班人員與備註，也能補傳更多照片，並保留同一筆巡店紀錄。
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:items-end">
          <Link href={`/inspection/history/${id}`} className="nb-btn">
            ← 返回明細
          </Link>
          <div className="nb-stamp">Edit Mode</div>
        </div>
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
