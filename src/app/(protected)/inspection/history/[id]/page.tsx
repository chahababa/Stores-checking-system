import Image from "next/image";
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

function gradeChipClass(grade: InspectionGrade) {
  if (grade === "A") return "nb-chip-green";
  if (grade === "B") return "nb-chip-yellow";
  return "nb-chip-red";
}

function scoreChipClass(score: 1 | 2 | 3) {
  if (score === 3) return "nb-chip-green";
  if (score === 2) return "nb-chip-yellow";
  return "nb-chip-red";
}

function tagChipClass(tagType: "critical" | "monthly_attention" | "complaint_watch") {
  if (tagType === "critical") return "nb-chip-red";
  if (tagType === "monthly_attention") return "nb-chip-yellow";
  return "nb-chip-ink";
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
  if (filter === "attention") return row.score <= 2 || row.isFocusItem;
  if (filter === "notes") return Boolean(row.note?.trim());
  if (filter === "photos") return row.photos.length > 0;
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

  const groupedScores = detail.scores.reduce<Array<{ categoryName: string; rows: typeof detail.scores }>>(
    (groups, row) => {
      const existingGroup = groups.find((group) => group.categoryName === row.categoryName);
      if (existingGroup) {
        existingGroup.rows.push(row);
        return groups;
      }
      groups.push({ categoryName: row.categoryName, rows: [row] });
      return groups;
    },
    [],
  );

  const filteredGroups = groupedScores
    .map((group) => ({ ...group, rows: group.rows.filter((row) => shouldIncludeScore(filter, row)) }))
    .filter((group) => group.rows.length > 0);

  const categoryGrades = buildCategoryGrades(
    detail.scores.map((row) => ({ categoryName: row.categoryName, score: row.score, tagTypes: row.tagTypes })),
  );
  const categoryGradeMap = new Map(categoryGrades.map((group) => [group.categoryName, group]));
  const overallGrade = buildOverallInspectionGrade(
    detail.scores.map((row) => ({ categoryName: row.categoryName, score: row.score, tagTypes: row.tagTypes })),
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
      if (gradePriority !== 0) return gradePriority;
      return (left.summary?.averageScore ?? 0) - (right.summary?.averageScore ?? 0);
    });

  const visibleScoreCount = filteredGroups.reduce((sum, group) => sum + group.rows.length, 0);
  const concernCount = detail.scores.filter((row) => row.score <= 2 || row.isFocusItem).length;
  const globalAttentionRows = detail.scores.filter((row) => row.score <= 2);
  const allScoresAreA = detail.scores.length > 0 && detail.scores.every((row) => row.score === 3);

  return (
    <div className="grid gap-6" data-testid="inspection-detail-page">
      {/* Header */}
      <div className="nb-card p-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="nb-eyebrow">Inspection Detail</p>
          <h1 className="nb-h1 mt-2">
            {detail.store?.name ?? "未指定店別"} <span className="text-nb-ink/30">/</span> {detail.date}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-bold font-nbMono text-nb-ink/75">
            <span className="nb-chip">{detail.timeSlot}</span>
            <span className="nb-chip">{getBusynessLabel(detail.busynessLevel)}</span>
            <span className="nb-chip">平均 {detail.totalScore}</span>
            <span
              data-testid="inspection-detail-header-grade"
              className={gradeChipClass(overallGrade.finalGrade)}
            >
              總評 {overallGrade.finalGrade}
            </span>
            <span className={detail.isEditable ? "nb-chip-yellow" : "nb-chip bg-nb-ink/10 text-nb-ink/70"}>
              {detail.isEditable ? "可編輯" : "已鎖定"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inspection/history" className="nb-btn">
            ← 返回
          </Link>
          <Link href={`/api/reports/inspection/${id}`} className="nb-btn">
            ⬇ 匯出 CSV
          </Link>
          {canManageInspection && detail.isEditable ? (
            <Link href={`/inspection/history/${id}/edit`} data-testid="inspection-edit-link" className="nb-btn-primary">
              ✎ 編輯這份報告
            </Link>
          ) : null}
        </div>
      </div>

      {/* Management */}
      {canManageInspection ? (
        <SectionCard
          title="報告管理"
          eyebrow="Admin"
          description="可切換是否鎖定本份巡店報告，或在需要時刪除整筆記錄。"
        >
          <div className="flex flex-wrap gap-3">
            <form action={toggleEditableAction}>
              <input type="hidden" name="inspection_id" value={id} />
              <input type="hidden" name="next_value" value={String(!detail.isEditable)} />
              <button type="submit" className="nb-btn">
                {detail.isEditable ? "🔒 鎖定報告" : "🔓 解除鎖定"}
              </button>
            </form>

            {canDeleteInspection ? (
              <form action={deleteInspectionAction}>
                <input type="hidden" name="inspection_id" value={id} />
                <button type="submit" className="nb-btn-red">
                  刪除巡店報告
                </button>
              </form>
            ) : null}
          </div>
        </SectionCard>
      ) : null}

      {/* Summary + staff */}
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <SectionCard title="報告摘要" eyebrow="Summary" description="快速看這次巡店的整體結果、巡店人與調整原因。">
          <div className="grid gap-3 text-sm text-nb-ink/80 font-nbMono">
            <div className="flex flex-wrap items-center gap-2">
              <span data-testid="inspection-detail-overall-grade" className={gradeChipClass(overallGrade.finalGrade)}>
                總評 {overallGrade.finalGrade}
              </span>
              <span className="nb-chip">需關注 {concernCount} 項</span>
            </div>
            <p>店別：{detail.store?.name ?? "-"}</p>
            <p>巡店人：{detail.inspector?.name || detail.inspector?.email || "-"}</p>
            <p>日期：{detail.date}</p>
            <p>時段：{detail.timeSlot}</p>
            <p>忙碌程度：{getBusynessLabel(detail.busynessLevel)}</p>
            <p>原始總分：{detail.totalScore}</p>
            {overallGrade.adjustments.length > 0 ? (
              <div className="nb-card-flat bg-nb-red/10 border-nb-red px-4 py-3 text-xs leading-6 text-nb-red font-bold">
                <p className="uppercase tracking-[0.2em] text-[10px] mb-2">Adjustments</p>
                <ul className="grid gap-1">
                  {overallGrade.adjustments.map((adjustment) => (
                    <li key={adjustment}>· {adjustment}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </SectionCard>

        <SectionCard title="當班人員" eyebrow="On-shift" description="本次巡店時記錄的當班組員與其工作站。">
          <div className="grid gap-3 md:grid-cols-2">
            {detail.staff.map((member) => (
              <div key={member.id} className="nb-row">
                <p className="font-nbSerif text-base font-black">{member.name}</p>
                <p className="mt-1 text-xs text-nb-ink/65 font-bold font-nbMono">
                  {member.workstationName} · {getShiftRoleLabel(member.workstationArea)}
                </p>
              </div>
            ))}
            {detail.staff.length === 0 ? <div className="nb-empty">這次巡店沒有留下當班人員資料。</div> : null}
          </div>
        </SectionCard>
      </div>

      {/* Category highlights */}
      <SectionCard
        title="分類重點摘要"
        eyebrow="Category Focus"
        description="快速比較每個分類的 A / B / C 分布，立即看出哪區塊要先處理。"
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {categoryHighlights.map((group) => (
            <div key={group.categoryName} className="nb-card-flat p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-nbSerif text-xl font-black">{group.categoryName}</p>
                  {group.summary ? (
                    <p className="mt-2 text-xs text-nb-ink/60 font-bold font-nbMono">
                      平均 {group.summary.averageScore.toFixed(2)} · A {group.summary.counts.a} · B {group.summary.counts.b} · C {group.summary.counts.c}
                    </p>
                  ) : null}
                </div>
                <span className={gradeChipClass(group.summary?.grade ?? "A")}>{group.summary?.grade ?? "A"}</span>
              </div>

              {group.attentionRows.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  <p className="nb-eyebrow">Needs Attention</p>
                  {group.attentionRows.map((row) => (
                    <div
                      key={`${group.categoryName}-${row.id}`}
                      className="flex flex-wrap items-center gap-2 nb-card-flat bg-nb-bg2 px-3 py-2 text-sm"
                    >
                      <span className={gradeChipClass(getScoreGrade(row.score))}>{getScoreGrade(row.score)}</span>
                      <span className="font-bold">{row.itemName}</span>
                      {row.note ? <span className="text-nb-ink/65">· {row.note}</span> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 nb-card-flat bg-nb-green/25 border-nb-green px-4 py-3 text-sm font-bold">
                  此分類全部 A，表現穩定，繼續保持。
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="nb-card-flat bg-nb-bg2 p-5">
            <p className="nb-eyebrow">Global B / C</p>
            <p className="mt-1 font-nbSerif text-lg font-black">全場 B / C 題目整理</p>
            {globalAttentionRows.length > 0 ? (
              <div className="mt-4 grid gap-3">
                {globalAttentionRows.map((row) => (
                  <div key={row.id} className="nb-card-flat p-3 bg-nb-paper">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="nb-chip">{row.categoryName}</span>
                      <span className={gradeChipClass(getScoreGrade(row.score))}>{getScoreGrade(row.score)}</span>
                      <span className="font-bold text-sm">{row.itemName}</span>
                    </div>
                    {row.note ? <p className="mt-2 text-sm leading-6 text-nb-ink/80">{row.note}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-4 nb-card-flat bg-nb-green/25 border-nb-green px-4 py-3 text-sm font-bold">
                {allScoresAreA ? "這次巡店全部為 A，整體狀況很好。" : "目前沒有需要整理的 B / C 題目。"}
              </div>
            )}
          </div>
          <div className="nb-card-flat p-5">
            <p className="nb-eyebrow">How To Read</p>
            <p className="mt-1 font-nbSerif text-lg font-black">閱讀建議</p>
            <ol className="mt-4 grid gap-2 text-sm leading-6 text-nb-ink/75 font-bold list-decimal pl-5">
              <li>先看分類總評，找出本次巡店最弱的區塊。</li>
              <li>再看 B / C 題目與備註，通常就是要優先追的改善重點。</li>
              <li>若某分類全部 A，可維持現況，把注意力放到較弱分類。</li>
            </ol>
          </div>
        </div>
      </SectionCard>

      {/* Scores */}
      <SectionCard
        title="評分項目"
        eyebrow="Scores"
        description={`目前顯示 ${visibleScoreCount} / ${detail.scores.length} 題。`}
      >
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "全部項目" },
            { key: "attention", label: "只看需關注" },
            { key: "notes", label: "只看有備註" },
            { key: "photos", label: "只看有照片" },
          ].map((option) => {
            const isActive = filter === option.key;
            return (
              <Link
                key={option.key}
                href={option.key === "all" ? `/inspection/history/${id}` : `/inspection/history/${id}?show=${option.key}`}
                data-testid={`inspection-detail-filter-${option.key}`}
                className={isActive ? "nb-btn-primary" : "nb-btn"}
              >
                {option.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-5 grid gap-4">
          {filteredGroups.map((group) => {
            const categorySummary = categoryGradeMap.get(group.categoryName);

            return (
              <details
                key={group.categoryName}
                open
                data-testid={`inspection-detail-category-${group.categoryName}`}
                className="nb-card-flat"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 bg-nb-yellow/30 border-b-[2.5px] border-nb-ink">
                  <div className="flex flex-col gap-2">
                    <p className="font-nbSerif text-xl font-black">{group.categoryName}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-nb-ink/70 font-bold font-nbMono">
                      <span>{group.rows.length} 題</span>
                      {categorySummary ? (
                        <>
                          <span>·</span>
                          <span>平均 {categorySummary.averageScore.toFixed(2)}</span>
                          <span className={gradeChipClass(categorySummary.grade)}>等級 {categorySummary.grade}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <span className="nb-chip">展開 / 收合</span>
                </summary>
                <div className="grid gap-4 px-5 py-5">
                  {group.rows.map((row) => (
                    <article key={row.id} className="nb-card-flat bg-nb-bg2 p-4">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-nbSerif text-base font-black">{row.itemName}</p>
                            {row.tagTypes.map((tagType) => (
                              <span key={tagType} className={tagChipClass(tagType)}>
                                {getInspectionTagLabel(tagType)}
                              </span>
                            ))}
                            {row.isFocusItem && row.tagTypes.length === 0 ? (
                              <span className="nb-chip-yellow">重點追蹤</span>
                            ) : null}
                            {row.hasPrevIssue ? (
                              <span className="nb-chip-red">連續低分 {row.consecutiveWeeks} 週</span>
                            ) : null}
                          </div>
                          {row.note ? (
                            <p className="mt-3 text-sm leading-6 text-nb-ink/80 bg-nb-paper border-l-[3px] border-nb-ink px-3 py-2">
                              {row.note}
                            </p>
                          ) : null}
                          {row.task ? (
                            <p className="mt-2 text-xs text-nb-ink/55 font-bold font-nbMono">
                              改善任務：{getImprovementStatusLabel(row.task.status)} · 建立於{" "}
                              {row.task.createdAt.slice(0, 10)}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={gradeChipClass(getScoreGrade(row.score))}>
                            等級 {getScoreGrade(row.score)}
                          </span>
                          <span className={scoreChipClass(row.score)}>分數 {row.score}</span>
                        </div>
                      </div>

                      {row.photos.length > 0 ? (
                        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                          {row.photos.map((photo) => (
                            <div key={photo.id} className="nb-card-flat overflow-hidden">
                              <a href={photo.photoUrl} target="_blank" rel="noreferrer" className="group block">
                                <div
                                  className="aspect-square w-full bg-cover bg-center border-b-[2.5px] border-nb-ink transition group-hover:scale-[1.02]"
                                  style={{ backgroundImage: `url(${photo.photoUrl})` }}
                                />
                              </a>
                              <div className="grid gap-2 px-3 py-3">
                                <div className="nb-eyebrow">{photo.isStandard ? "標準照片" : "巡店照片"}</div>
                                {canManagePhotos ? (
                                  <div className="flex flex-wrap gap-2">
                                    <form action={toggleStandardAction}>
                                      <input type="hidden" name="photo_id" value={photo.id} />
                                      <input type="hidden" name="next_value" value={String(!photo.isStandard)} />
                                      <button type="submit" className="nb-btn-xs">
                                        {photo.isStandard ? "取消標準照" : "設為標準照"}
                                      </button>
                                    </form>
                                    <form action={deletePhotoAction}>
                                      <input type="hidden" name="photo_id" value={photo.id} />
                                      <button type="submit" className="nb-btn-xs bg-nb-red text-white">
                                        刪除
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

          {filteredGroups.length === 0 ? <div className="nb-empty">目前沒有符合篩選條件的評分項目。</div> : null}
        </div>
      </SectionCard>

      {/* Menu + notes */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="餐點品質抽查" eyebrow="Menu QA" description="保留本次巡店的內用、外帶餐點與照片。">
          <div className="grid gap-3">
            {detail.menuItems.map((item) => (
              <div key={item.id} className="nb-row">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 text-sm font-nbMono text-nb-ink/80">
                    <p className="font-nbSerif text-base font-black text-nb-ink">
                      {item.type === "dine_in" ? "內用" : "外帶"}
                    </p>
                    <p>餐點名稱：{item.dishName ?? "-"}</p>
                    <p>重量（克）：{item.portionWeight ?? "-"}</p>
                    {item.observationNote ? (
                      <p className="whitespace-pre-wrap leading-6">
                        觀察 / 製餐備註：{item.observationNote}
                      </p>
                    ) : null}
                  </div>
                  {item.photoUrl ? (
                    <a href={item.photoUrl} target="_blank" rel="noreferrer" className="group block">
                      <div className="relative h-24 w-24 overflow-hidden border-[2.5px] border-nb-ink bg-nb-paper">
                        <Image
                          src={item.photoUrl}
                          alt={`${item.type === "dine_in" ? "內用" : "外帶"}餐點照片`}
                          fill
                          unoptimized
                          className="object-cover transition duration-200 group-hover:scale-[1.03]"
                        />
                      </div>
                      <p className="mt-2 text-center text-[10px] font-bold font-nbMono uppercase tracking-[0.18em] text-nb-ink/65">
                        查看照片
                      </p>
                    </a>
                  ) : (
                    <div className="nb-card-flat border-dashed px-3 py-4 text-[10px] font-bold font-nbMono uppercase tracking-[0.2em] text-nb-ink/55">
                      未附照片
                    </div>
                  )}
                </div>
              </div>
            ))}
            {detail.menuItems.length === 0 ? <div className="nb-empty">這次巡店尚未留下餐點品質抽查記錄。</div> : null}
          </div>
        </SectionCard>

        <SectionCard title="補充備註" eyebrow="Notes" description="本次巡店留下的補充說明與觀察紀錄。">
          <div className="grid gap-3">
            {detail.legacyNotes.map((note) => (
              <div key={note.id} className="nb-row">
                <p className="text-sm leading-6 text-nb-ink/80">{note.content}</p>
                <p className="mt-2 text-[10px] font-bold font-nbMono uppercase tracking-[0.18em] text-nb-ink/55">
                  {note.createdAt.slice(0, 10)}
                </p>
              </div>
            ))}
            {detail.legacyNotes.length === 0 ? <div className="nb-empty">這次巡店沒有留下補充備註。</div> : null}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
