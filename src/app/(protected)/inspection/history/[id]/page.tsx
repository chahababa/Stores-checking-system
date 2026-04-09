import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  deleteInspection,
  deleteInspectionPhoto,
  getInspectionDetail,
  setInspectionEditable,
  setInspectionPhotoStandard,
} from "@/lib/inspection";
import { getBusynessLabel, getImprovementStatusLabel, getShiftRoleLabel } from "@/lib/ui-labels";

type PageParams = Promise<{ id: string }>;

function scoreTone(score: 1 | 2 | 3) {
  if (score === 3) return "bg-green-100 text-green-700";
  if (score === 2) return "bg-warm/15 text-warm";
  return "bg-danger/10 text-danger";
}

export default async function InspectionDetailPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const profile = await getCurrentUserProfile();
  const detail = await getInspectionDetail(id);
  const canManagePhotos = profile?.role === "owner" || profile?.role === "manager";
  const canManageInspection = profile?.role === "owner" || profile?.role === "manager";
  const canDeleteInspection = profile?.role === "owner";

  async function toggleStandardAction(formData: FormData) {
    "use server";
    await setInspectionPhotoStandard(String(formData.get("photo_id")), String(formData.get("next_value")) === "true");
  }

  async function deletePhotoAction(formData: FormData) {
    "use server";
    await deleteInspectionPhoto(String(formData.get("photo_id")));
  }

  async function toggleEditableAction(formData: FormData) {
    "use server";
    await setInspectionEditable(String(formData.get("inspection_id")), String(formData.get("next_value")) === "true");
  }

  async function deleteInspectionAction(formData: FormData) {
    "use server";
    await deleteInspection(String(formData.get("inspection_id")));
    redirect("/inspection/history");
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">巡店明細</p>
          <h1 className="mt-2 font-serifTc text-3xl font-semibold">
            {detail.store?.name ?? "店別"} / {detail.date}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
            <span>{detail.timeSlot}</span>
            <span>/</span>
            <span>{getBusynessLabel(detail.busynessLevel)}</span>
            <span>/</span>
            <span>總分 {detail.totalScore}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                detail.isEditable ? "bg-warm/15 text-warm" : "bg-ink/10 text-ink/70"
              }`}
            >
              {detail.isEditable ? "可編輯" : "已鎖定"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/inspection/history" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
            返回紀錄列表
          </Link>
          <Link href={`/api/reports/inspection/${id}`} className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
            匯出 CSV
          </Link>
          {canManageInspection && detail.isEditable && (
            <Link href={`/inspection/history/${id}/edit`} className="rounded-full bg-warm px-5 py-3 text-sm text-white">
              編輯巡店紀錄
            </Link>
          )}
        </div>
      </div>

      {canManageInspection && (
        <SectionCard title="紀錄控制" description="可將紀錄鎖定避免後續修改，或移除錯誤建立的資料。">
          <div className="flex flex-wrap gap-3">
            <form action={toggleEditableAction}>
              <input type="hidden" name="inspection_id" value={id} />
              <input type="hidden" name="next_value" value={String(!detail.isEditable)} />
              <button type="submit" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
                {detail.isEditable ? "鎖定巡店紀錄" : "解除鎖定"}
              </button>
            </form>

            {canDeleteInspection && (
              <form action={deleteInspectionAction}>
                <input type="hidden" name="inspection_id" value={id} />
                <button type="submit" className="rounded-full bg-danger px-5 py-3 text-sm text-white">
                  刪除巡店紀錄
                </button>
              </form>
            )}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <SectionCard title="巡店摘要" description="本次巡店的基本資訊與參與人員。">
          <div className="grid gap-3 text-sm text-ink/75">
            <p>店別：{detail.store?.name ?? "-"}</p>
            <p>巡店人：{detail.inspector?.email ?? "-"}</p>
            <p>日期：{detail.date}</p>
            <p>時段：{detail.timeSlot}</p>
            <p>忙碌程度：{getBusynessLabel(detail.busynessLevel)}</p>
            <p>總分：{detail.totalScore}</p>
          </div>
        </SectionCard>

        <SectionCard title="當班人員" description="本次巡店時勾選的在班人員。">
          <div className="grid gap-3 md:grid-cols-2">
            {detail.staff.map((member) => (
              <div key={member.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/75">
                <p className="font-medium text-ink">{member.name}</p>
                <p>
                  職位：{getShiftRoleLabel(member.position)} / 當班角色：{getShiftRoleLabel(member.roleInShift)}
                </p>
              </div>
            ))}
            {detail.staff.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                這筆巡店沒有勾選任何當班人員。
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="評分項目" description="每個項目都保留分數、備註、照片與改善任務資訊。">
        <div className="grid gap-4">
          {detail.scores.map((row) => (
            <article key={row.id} className="rounded-[24px] border border-ink/10 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{row.itemName}</p>
                    <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">{row.categoryName}</span>
                    {row.isFocusItem && (
                      <span className="rounded-full bg-warm px-3 py-1 text-xs text-white">重點項目</span>
                    )}
                    {row.hasPrevIssue && (
                      <span className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">
                        上次扣分項 / 連續 {row.consecutiveWeeks} 週
                      </span>
                    )}
                  </div>
                  {row.note && <p className="mt-3 text-sm leading-6 text-ink/75">{row.note}</p>}
                  {row.task && (
                    <p className="mt-2 text-xs text-ink/55">
                      改善任務：{getImprovementStatusLabel(row.task.status)} / 建立於 {row.task.createdAt.slice(0, 10)}
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-4 py-2 text-sm font-medium ${scoreTone(row.score)}`}>
                  分數 {row.score}
                </span>
              </div>

              {row.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {row.photos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-soft/30">
                      <a href={photo.photoUrl} target="_blank" rel="noreferrer" className="group block">
                        <div
                          className="aspect-square w-full bg-cover bg-center transition group-hover:scale-[1.02]"
                          style={{ backgroundImage: `url(${photo.photoUrl})` }}
                        />
                      </a>
                      <div className="grid gap-2 px-3 py-3">
                        <div className="text-xs text-ink/70">{photo.isStandard ? "標準照片" : "參考照片"}</div>
                        {canManagePhotos && (
                          <div className="flex flex-wrap gap-2">
                            <form action={toggleStandardAction}>
                              <input type="hidden" name="photo_id" value={photo.id} />
                              <input type="hidden" name="next_value" value={String(!photo.isStandard)} />
                              <button type="submit" className="rounded-full bg-white px-3 py-2 text-xs text-ink/70">
                                {photo.isStandard ? "取消標準" : "設為標準"}
                              </button>
                            </form>
                            <form action={deletePhotoAction}>
                              <input type="hidden" name="photo_id" value={photo.id} />
                              <button type="submit" className="rounded-full bg-danger/10 px-3 py-2 text-xs text-danger">
                                刪除照片
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="餐點品質抽查" description="本次巡店記錄的內用與外帶抽查品項。">
          <div className="grid gap-3">
            {detail.menuItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/75">
                <p className="font-medium text-ink">{item.type === "dine_in" ? "內用" : "外帶"}</p>
                <p>品項：{item.dishName ?? "-"}</p>
                <p>克重：{item.portionWeight ?? "-"}</p>
              </div>
            ))}
            {detail.menuItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                本次沒有記錄餐點抽查資料。
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="補充說明" description="不屬於單一題目的整體備註。">
          <div className="grid gap-3">
            {detail.legacyNotes.map((note) => (
              <div key={note.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm leading-6 text-ink/75">
                <p>{note.content}</p>
                <p className="mt-2 text-xs text-ink/50">{note.createdAt.slice(0, 10)}</p>
              </div>
            ))}
            {detail.legacyNotes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                本次沒有補充說明。
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
