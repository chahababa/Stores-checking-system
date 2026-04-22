import { redirect } from "next/navigation";

import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { getQaCleanupPreview } from "@/lib/settings";
import { getInspectionTagLabel } from "@/lib/ui-labels";

type SearchParams = Promise<{ success?: string }>;

function getSuccessMessage(success?: string) {
  if (success === "qa-cleaned") return "QA 測試資料已清理完成。";
  return null;
}

export default async function QaCleanupPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const preview = await getQaCleanupPreview();
  const successMessage = getSuccessMessage(params.success);

  async function cleanupAction() {
    "use server";
    const { cleanupQaTestData } = await import("@/lib/settings");
    await cleanupQaTestData();
    redirect("/settings/qa-cleanup?success=qa-cleaned");
  }

  const totalItems =
    preview.stores.length +
    preview.users.length +
    preview.staffMembers.length +
    preview.inspections.length +
    preview.scopedTags.length;

  return (
    <div data-testid="qa-cleanup-page" className="grid gap-6 lg:grid-cols-[0.9fr_1.35fr]">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <SectionCard
        title="QA 測試資料清理"
        eyebrow="Cleanup"
        description="這個頁面會集中清理以 QA-、測試用- 或 QA 黑箱測試資料建立的店別、帳號、組員、巡店紀錄，以及綁定在 QA 店別上的題目標籤。操作後會留下 audit log，但不會刪除操作紀錄本身。"
      >
        <div className="grid gap-4">
          <div data-testid="qa-cleanup-summary" className="nb-stat">
            <p className="nb-stat-eyebrow">目前可清理項目總數</p>
            <p className="nb-stat-value">{totalItems}</p>
          </div>

          <div className="grid gap-2 text-sm text-nb-ink/80 font-bold">
            <p>店別：{preview.stores.length} 筆</p>
            <p>帳號：{preview.users.length} 筆</p>
            <p>組員：{preview.staffMembers.length} 筆</p>
            <p>巡店紀錄：{preview.inspections.length} 筆</p>
            <p>店別標籤：{preview.scopedTags.length} 筆</p>
          </div>

          <form action={cleanupAction}>
            <ConfirmSubmitButton
              testId="qa-cleanup-submit"
              label="清理 QA 測試資料"
              confirmMessage="這會刪除所有被辨識為 QA 的店別、帳號、組員、巡店紀錄與店別標籤。確定要繼續嗎？"
              className="nb-btn-primary bg-nb-red"
            />
          </form>
        </div>
      </SectionCard>

      <div className="grid gap-6">
        <SectionCard title="清理預覽" eyebrow="Preview" description="先確認這次會影響哪些資料。若你看到不像測試資料的內容，先不要執行清理。">
          <div className="grid gap-4 md:grid-cols-2">
            <div data-testid="qa-preview-stores" className="nb-card-flat bg-white p-4">
              <p className="font-nbSerif text-lg font-black">QA 店別</p>
              <ul className="mt-3 grid gap-2 text-sm text-nb-ink/75 font-bold">
                {preview.stores.length > 0 ? (
                  preview.stores.map((store) => (
                    <li key={store.id}>
                      {store.name} <span className="text-nb-ink/50 font-nbMono">({store.code})</span>
                    </li>
                  ))
                ) : (
                  <li>目前沒有可清理的 QA 店別。</li>
                )}
              </ul>
            </div>

            <div data-testid="qa-preview-users" className="nb-card-flat bg-white p-4">
              <p className="font-nbSerif text-lg font-black">QA 帳號</p>
              <ul className="mt-3 grid gap-2 text-sm text-nb-ink/75 font-bold">
                {preview.users.length > 0 ? (
                  preview.users.map((user) => (
                    <li key={user.id}>
                      {user.name || "未命名帳號"} <span className="text-nb-ink/50 font-nbMono">({user.email})</span>
                    </li>
                  ))
                ) : (
                  <li>目前沒有可清理的 QA 帳號。</li>
                )}
              </ul>
            </div>

            <div data-testid="qa-preview-staff" className="nb-card-flat bg-white p-4">
              <p className="font-nbSerif text-lg font-black">QA 組員</p>
              <ul className="mt-3 grid gap-2 text-sm text-nb-ink/75 font-bold">
                {preview.staffMembers.length > 0 ? (
                  preview.staffMembers.map((staff) => (
                    <li key={staff.id}>
                      {staff.name}
                      <span className="text-nb-ink/50">
                        {" "}
                        ({staff.storeName ?? "未指定店別"} / {staff.status === "active" ? "在職" : "已封存"})
                      </span>
                    </li>
                  ))
                ) : (
                  <li>目前沒有可清理的 QA 組員。</li>
                )}
              </ul>
            </div>

            <div data-testid="qa-preview-inspections" className="nb-card-flat bg-white p-4">
              <p className="font-nbSerif text-lg font-black">QA 巡店紀錄</p>
              <ul className="mt-3 grid gap-2 text-sm text-nb-ink/75 font-bold">
                {preview.inspections.length > 0 ? (
                  preview.inspections.map((inspection) => (
                    <li key={inspection.id}>
                      {inspection.date} / {inspection.timeSlot}
                      <span className="text-nb-ink/50"> ({inspection.storeName ?? "未指定店別"})</span>
                    </li>
                  ))
                ) : (
                  <li>目前沒有可清理的 QA 巡店紀錄。</li>
                )}
              </ul>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="店別標籤預覽"
          eyebrow="Scoped Tags"
          description="這裡只會清理綁定在 QA 店別上的標籤設定。全店共用的正式標籤不會被碰到。"
        >
          <ul data-testid="qa-preview-tags" className="grid gap-2 text-sm text-nb-ink/80 font-bold">
            {preview.scopedTags.length > 0 ? (
              preview.scopedTags.map((tag) => (
                <li key={tag.id}>
                  {getInspectionTagLabel(tag.type)}
                  <span className="text-nb-ink/50">
                    {" "}
                    / {tag.storeName ?? "全部店別"}
                    {tag.month ? ` / ${tag.month}` : ""}
                  </span>
                </li>
              ))
            ) : (
              <li>目前沒有需要清理的 QA 店別標籤。</li>
            )}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}
