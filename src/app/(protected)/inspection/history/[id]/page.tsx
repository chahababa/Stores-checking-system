import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  buildCategoryGrades,
  buildOverallInspectionGrade,
  getScoreGrade,
  type InspectionGrade,
} from "@/lib/grading";
import {
  deleteInspection,
  deleteInspectionPhoto,
  getInspectionDetail,
  setInspectionEditable,
  setInspectionPhotoStandard,
} from "@/lib/inspection";
import {
  getBusynessLabel,
  getImprovementStatusLabel,
  getInspectionTagLabel,
  getShiftRoleLabel,
} from "@/lib/ui-labels";

type PageParams = Promise<{ id: string }>;
type PageSearchParams = Promise<{ show?: string }>;
type ScoreFilter = "all" | "attention" | "notes" | "photos";

function getGradeTone(grade: InspectionGrade) {
  if (grade === "A") return "bg-green-100 text-green-700";
  if (grade === "B") return "bg-warm/15 text-warm";
  return "bg-danger/10 text-danger";
}

function getScoreTone(score: 1 | 2 | 3) {
  if (score === 3) return "bg-green-100 text-green-700";
  if (score === 2) return "bg-warm/15 text-warm";
  return "bg-danger/10 text-danger";
}

function getCategoryPriority(grade: InspectionGrade) {
  if (grade === "C") return 0;
  if (grade === "B") return 1;
  return 2;
}

function shouldIncludeScore(
  filter: ScoreFilter,
  row: {
    score: 1 | 2 | 3;
    note: string | null;
    photos: Array<unknown>;
    isFocusItem: boolean;
  },
) {
  if (filter === "attention") {
    return row.score <= 2 || row.isFocusItem;
  }

  if (filter === "notes") {
    return Boolean(row.note?.trim());
  }

  if (filter === "photos") {
    return row.photos.length > 0;
  }

  return true;
}

export default async function InspectionDetailPage({
  params,
  searchParams,
}: {
  params: PageParams;
  searchParams: PageSearchParams;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const filter = (resolvedSearchParams.show as ScoreFilter | undefined) ?? "all";
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

  const groupedScores = detail.scores.reduce<
    Array<{
      categoryName: string;
      rows: typeof detail.scores;
    }>
  >((groups, row) => {
    const existingGroup = groups.find((group) => group.categoryName === row.categoryName);
    if (existingGroup) {
      existingGroup.rows.push(row);
      return groups;
    }

    groups.push({
      categoryName: row.categoryName,
      rows: [row],
    });

    return groups;
  }, []);

  const filteredGroups = groupedScores
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => shouldIncludeScore(filter, row)),
    }))
    .filter((group) => group.rows.length > 0);

  const categoryGrades = buildCategoryGrades(
    detail.scores.map((row) => ({
      categoryName: row.categoryName,
      score: row.score,
      tagTypes: row.tagTypes,
    })),
  );
  const categoryGradeMap = new Map(categoryGrades.map((group) => [group.categoryName, group]));
  const overallGrade = buildOverallInspectionGrade(
    detail.scores.map((row) => ({
      categoryName: row.categoryName,
      score: row.score,
      tagTypes: row.tagTypes,
    })),
  );

  const categoryHighlights = groupedScores
    .map((group) => ({
      categoryName: group.categoryName,
      summary: categoryGradeMap.get(group.categoryName),
      attentionRows: group.rows.filter((row) => row.score <= 2),
    }))
    .sort((left, right) => {
      const leftGrade = left.summary?.grade ?? "A";
      const rightGrade = right.summary?.grade ?? "A";
      const gradePriority = getCategoryPriority(leftGrade) - getCategoryPriority(rightGrade);
      if (gradePriority !== 0) {
        return gradePriority;
      }

      return (left.summary?.averageScore ?? 0) - (right.summary?.averageScore ?? 0);
    });

  const visibleScoreCount = filteredGroups.reduce((sum, group) => sum + group.rows.length, 0);
  const concernCount = detail.scores.filter((row) => row.score <= 2 || row.isFocusItem).length;
  const globalAttentionRows = detail.scores.filter((row) => row.score <= 2);
  const allScoresAreA = detail.scores.length > 0 && detail.scores.every((row) => row.score === 3);

  return (
    <div className="grid gap-6" data-testid="inspection-detail-page">
      <div className="flex flex-col gap-4 rounded-[28px] border border-ink/10 bg-white p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Inspection Detail</p>
          <h1 className="mt-2 font-serifTc text-3xl font-semibold text-ink">
            {detail.store?.name ?? "未指定店別"} / {detail.date}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
            <span>{detail.timeSlot}</span>
            <span>/</span>
            <span>{getBusynessLabel(detail.busynessLevel)}</span>
            <span>/</span>
            <span>平均分數 {detail.totalScore}</span>
            <span
              data-testid="inspection-detail-header-grade"
              className={`rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(overallGrade.finalGrade)}`}
            >
              總評 {overallGrade.finalGrade}
            </span>
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
            返回巡店紀錄
          </Link>
          <Link href={`/api/reports/inspection/${id}`} className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
            匯出明細 CSV
          </Link>
          {canManageInspection && detail.isEditable ? (
            <Link
              href={`/inspection/history/${id}/edit`}
              data-testid="inspection-edit-link"
              className="rounded-full bg-warm px-5 py-3 text-sm text-white"
            >
              編輯這份巡店
            </Link>
          ) : null}
        </div>
      </div>

      {canManageInspection ? (
        <SectionCard title="巡店控管" description="主管或系統擁有者可以鎖定、解鎖或刪除這筆巡店紀錄。">
          <div className="flex flex-wrap gap-3">
            <form action={toggleEditableAction}>
              <input type="hidden" name="inspection_id" value={id} />
              <input type="hidden" name="next_value" value={String(!detail.isEditable)} />
              <button type="submit" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
                {detail.isEditable ? "鎖定巡店紀錄" : "解除鎖定"}
              </button>
            </form>

            {canDeleteInspection ? (
              <form action={deleteInspectionAction}>
                <input type="hidden" name="inspection_id" value={id} />
                <button type="submit" className="rounded-full bg-danger px-5 py-3 text-sm text-white">
                  刪除這筆巡店
                </button>
              </form>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <SectionCard title="報告摘要" description="先看總評、巡店人與總體異常數，掌握這份巡店報告的基本狀態。">
          <div className="grid gap-3 text-sm text-ink/75">
            <div className="flex flex-wrap items-center gap-2">
              <span
                data-testid="inspection-detail-overall-grade"
                className={`rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(overallGrade.finalGrade)}`}
              >
                總評 {overallGrade.finalGrade}
              </span>
              <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/75">需關注 {concernCount} 題</span>
            </div>
            <p>店別：{detail.store?.name ?? "-"}</p>
            <p>巡店人：{detail.inspector?.name || detail.inspector?.email || "-"}</p>
            <p>日期：{detail.date}</p>
            <p>巡店時段：{detail.timeSlot}</p>
            <p>忙碌程度：{getBusynessLabel(detail.busynessLevel)}</p>
            <p>平均分數：{detail.totalScore}</p>
            {overallGrade.adjustments.length > 0 ? (
              <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-xs leading-6 text-danger">
                <p className="font-medium">總評被調整的原因</p>
                <ul className="mt-2 grid gap-1">
                  {overallGrade.adjustments.map((adjustment) => (
                    <li key={adjustment}>- {adjustment}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="當班人員" description="這次巡店勾選的組員，以及他們當班時被安排的工作站。">
          <div className="grid gap-3 md:grid-cols-2">
            {detail.staff.map((member) => (
              <div key={member.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/75">
                <p className="font-medium text-ink">{member.name}</p>
                <p>
                  工作站：{member.workstationName} / 區域：{getShiftRoleLabel(member.workstationArea)}
                </p>
              </div>
            ))}
            {detail.staff.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                這次巡店沒有勾選當班人員。
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="本次報告重點"
        description="先看每個分類的等級、B / C 題數與需要注意的項目，快速知道這次巡店該先處理哪一塊。"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {categoryHighlights.map((group) => (
            <div key={group.categoryName} className="rounded-[24px] border border-ink/10 bg-white px-5 py-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-serifTc text-xl font-semibold text-ink">{group.categoryName}</p>
                  {group.summary ? (
                    <p className="mt-2 text-sm text-ink/60">
                      平均 {group.summary.averageScore.toFixed(2)} / A {group.summary.counts.a} 題 / B {group.summary.counts.b} 題 / C {group.summary.counts.c} 題
                    </p>
                  ) : null}
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${getGradeTone(group.summary?.grade ?? "A")}`}>
                  {group.summary?.grade ?? "A"}
                </span>
              </div>

              {group.attentionRows.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  <p className="text-sm font-medium text-ink">需要注意的項目</p>
                  {group.attentionRows.map((row) => (
                    <div
                      key={`${group.categoryName}-${row.id}`}
                      className="flex flex-wrap items-center gap-2 rounded-2xl bg-soft/35 px-4 py-3 text-sm text-ink/75"
                    >
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(getScoreGrade(row.score))}`}>
                        {getScoreGrade(row.score)}
                      </span>
                      <span className="font-medium text-ink">{row.itemName}</span>
                      {row.note ? <span className="text-ink/60">/ {row.note}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                  這個分類全部都是 A，表現穩定，做得很好。
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[24px] border border-ink/10 bg-soft/25 px-5 py-5">
            <p className="font-medium text-ink">本次 B / C 項目總整理</p>
            {globalAttentionRows.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {globalAttentionRows.map((row) => (
                  <div key={row.id} className="rounded-2xl bg-white px-4 py-4 text-sm text-ink/75">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-soft px-3 py-1 text-xs">{row.categoryName}</span>
                      <span className={`rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(getScoreGrade(row.score))}`}>
                        {getScoreGrade(row.score)}
                      </span>
                      <span className="font-medium text-ink">{row.itemName}</span>
                    </div>
                    {row.note ? <p className="mt-3 leading-6">{row.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-4 text-sm text-green-700">
                {allScoresAreA
                  ? "這次巡店所有項目都是 A，整體表現非常穩定，值得鼓勵。"
                  : "目前沒有 B / C 項目。"}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-ink/10 bg-white px-5 py-5">
            <p className="font-medium text-ink">閱讀建議</p>
            <div className="mt-4 grid gap-3 text-sm leading-7 text-ink/70">
              <p>1. 先看分類等級，最快找出本次最弱的區塊。</p>
              <p>2. 再看 B / C 項目總整理，直接抓到要優先改善的題目。</p>
              <p>3. 若某分類全部是 A，就代表這一塊本次表現穩定，可以先把注意力放到其他區塊。</p>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="評分項目"
        description={`目前顯示 ${visibleScoreCount} / ${detail.scores.length} 題，可依照關注條件切換，只看需要追蹤的項目。`}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "全部項目" },
            { key: "attention", label: "只看需關注" },
            { key: "notes", label: "只看有備註" },
            { key: "photos", label: "只看有照片" },
          ].map((option) => (
            <Link
              key={option.key}
              href={option.key === "all" ? `/inspection/history/${id}` : `/inspection/history/${id}?show=${option.key}`}
              data-testid={`inspection-detail-filter-${option.key}`}
              className={`rounded-full px-4 py-2 text-sm transition ${
                filter === option.key ? "bg-warm text-white" : "bg-soft text-ink/75 hover:bg-cream"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </div>

        <div className="mt-5 grid gap-4">
          {filteredGroups.map((group) => {
            const categorySummary = categoryGradeMap.get(group.categoryName);

            return (
              <details
                key={group.categoryName}
                open
                data-testid={`inspection-detail-category-${group.categoryName}`}
                className="rounded-[24px] border border-ink/10 bg-white"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4">
                  <div className="flex flex-col gap-2">
                    <p className="font-serifTc text-xl font-semibold text-ink">{group.categoryName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-ink/60">
                      <span>{group.rows.length} 題</span>
                      {categorySummary ? (
                        <>
                          <span>/</span>
                          <span>平均 {categorySummary.averageScore.toFixed(2)}</span>
                          <span className={`rounded-full px-3 py-1 text-xs font-medium ${getGradeTone(categorySummary.grade)}`}>
                            分類等級 {categorySummary.grade}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">展開 / 收合</span>
                </summary>
                <div className="grid gap-4 border-t border-ink/10 px-5 py-5">
                  {group.rows.map((row) => (
                    <article key={row.id} className="rounded-[24px] border border-ink/10 bg-soft/30 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-ink">{row.itemName}</p>
                            {row.tagTypes.map((tagType) => (
                              <span
                                key={tagType}
                                className={`rounded-full px-3 py-1 text-xs text-white ${
                                  tagType === "critical"
                                    ? "bg-danger"
                                    : tagType === "monthly_attention"
                                      ? "bg-warm"
                                      : "bg-ink"
                                }`}
                              >
                                {getInspectionTagLabel(tagType)}
                              </span>
                            ))}
                            {row.isFocusItem && row.tagTypes.length === 0 ? (
                              <span className="rounded-full bg-warm px-3 py-1 text-xs text-white">重點追蹤</span>
                            ) : null}
                            {row.hasPrevIssue ? (
                              <span className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">
                                連續低分 {row.consecutiveWeeks} 週
                              </span>
                            ) : null}
                          </div>
                          {row.note ? <p className="mt-3 text-sm leading-6 text-ink/75">{row.note}</p> : null}
                          {row.task ? (
                            <p className="mt-2 text-xs text-ink/55">
                              改善任務：{getImprovementStatusLabel(row.task.status)} / 建立於 {row.task.createdAt.slice(0, 10)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`rounded-full px-4 py-2 text-sm font-medium ${getGradeTone(getScoreGrade(row.score))}`}>
                            等級 {getScoreGrade(row.score)}
                          </span>
                          <span className={`rounded-full px-4 py-2 text-xs font-medium ${getScoreTone(row.score)}`}>
                            原始分數 {row.score}
                          </span>
                        </div>
                      </div>

                      {row.photos.length > 0 ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                          {row.photos.map((photo) => (
                            <div key={photo.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                              <a href={photo.photoUrl} target="_blank" rel="noreferrer" className="group block">
                                <div
                                  className="aspect-square w-full bg-cover bg-center transition group-hover:scale-[1.02]"
                                  style={{ backgroundImage: `url(${photo.photoUrl})` }}
                                />
                              </a>
                              <div className="grid gap-2 px-3 py-3">
                                <div className="text-xs text-ink/70">{photo.isStandard ? "標準照片" : "巡店照片"}</div>
                                {canManagePhotos ? (
                                  <div className="flex flex-wrap gap-2">
                                    <form action={toggleStandardAction}>
                                      <input type="hidden" name="photo_id" value={photo.id} />
                                      <input type="hidden" name="next_value" value={String(!photo.isStandard)} />
                                      <button type="submit" className="rounded-full bg-soft px-3 py-2 text-xs text-ink/70">
                                        {photo.isStandard ? "取消標準照" : "設為標準照"}
                                      </button>
                                    </form>
                                    <form action={deletePhotoAction}>
                                      <input type="hidden" name="photo_id" value={photo.id} />
                                      <button type="submit" className="rounded-full bg-danger/10 px-3 py-2 text-xs text-danger">
                                        刪除照片
                                      </button>
                                    </form>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </details>
            );
          })}

          {filteredGroups.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
              目前沒有符合篩選條件的評分項目。
            </div>
          ) : null}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="餐點品質抽查" description="若這次巡店有抽查內用或外帶餐點，會整理在這裡。">
          <div className="grid gap-3">
            {detail.menuItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/75">
                <p className="font-medium text-ink">{item.type === "dine_in" ? "內用" : "外帶"}</p>
                <p>餐點名稱：{item.dishName ?? "-"}</p>
                <p>重量 / 克數：{item.portionWeight ?? "-"}</p>
              </div>
            ))}
            {detail.menuItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                這次巡店沒有填寫餐點抽查資料。
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="補充備註" description="巡店時另外留下的補充內容，會集中整理在這裡。">
          <div className="grid gap-3">
            {detail.legacyNotes.map((note) => (
              <div key={note.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm leading-6 text-ink/75">
                <p>{note.content}</p>
                <p className="mt-2 text-xs text-ink/50">{note.createdAt.slice(0, 10)}</p>
              </div>
            ))}
            {detail.legacyNotes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                這次巡店沒有補充備註。
              </div>
            ) : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
