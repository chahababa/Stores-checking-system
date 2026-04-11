"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { compressImage } from "@/lib/image";
import type { InspectionFormSeed } from "@/lib/inspection";
import { getInspectionTagLabel, type InspectionTagType } from "@/lib/ui-labels";

type ScoreValue = 1 | 2 | 3;
type DraftSaveState = "idle" | "saving" | "saved" | "error";
type WorkstationOption = InspectionFormSeed["workstations"][number];

type PhotoDraft = {
  itemId: string;
  base64: string;
  contentType: string;
  fileName: string;
  isStandard: boolean;
  previewUrl: string;
};

export type InspectionFormDraftState = {
  storeId: string;
  date: string;
  timeSlot: string;
  busynessLevel: "low" | "medium" | "high";
  selectedStaff: Record<string, string>;
  scores: Record<
    string,
    {
      score: ScoreValue | null;
      note: string;
      isFocusItem: boolean;
      tagTypes: InspectionTagType[];
      hasPrevIssue: boolean;
      consecutiveWeeks: number;
    }
  >;
  menuItems: {
    dineInDishName: string;
    dineInPortionWeight: string;
    takeoutDishName: string;
    takeoutPortionWeight: string;
  };
  legacyNote: string;
};

function createInitialState(seed: InspectionFormSeed): InspectionFormDraftState {
  return {
    storeId: seed.selectedStoreId,
    date: seed.selectedDate,
    timeSlot: "",
    busynessLevel: "medium",
    selectedStaff: {},
    scores: Object.fromEntries(
      seed.groupedItems.flatMap((group) =>
        group.items.map((item) => [
          item.id,
          {
            score: item.defaultScore,
            note: "",
            isFocusItem: item.isFocusItem,
            tagTypes: item.tagTypes,
            hasPrevIssue: item.hasPrevIssue,
            consecutiveWeeks: item.consecutiveWeeks,
          },
        ]),
      ),
    ),
    menuItems: {
      dineInDishName: "",
      dineInPortionWeight: "",
      takeoutDishName: "",
      takeoutPortionWeight: "",
    },
    legacyNote: "",
  };
}

function getWorkstationLabel(workstation: WorkstationOption | undefined) {
  if (!workstation) {
    return "未指定工作站";
  }

  return `${workstation.name}（${workstation.area === "kitchen" ? "內場" : workstation.area === "floor" ? "外場" : "櫃台"}）`;
}

function formatDraftTimestamp(value: Date | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(value);
}

export function InspectionForm({
  seed,
  saveAction,
  initialState,
  submitLabel = "建立巡店紀錄",
  isEditMode = false,
}: {
  seed: InspectionFormSeed;
  saveAction: (payload: {
    storeId: string;
    date: string;
    timeSlot: string;
    busynessLevel: "low" | "medium" | "high";
    selectedStaff: Array<{ staffId: string; workstationId: string }>;
    scores: Array<{
      itemId: string;
      score: ScoreValue;
      note?: string;
      isFocusItem: boolean;
      tagTypes: InspectionTagType[];
      hasPrevIssue: boolean;
      consecutiveWeeks: number;
    }>;
    menuItems: Array<{
      type: "dine_in" | "takeout";
      dishName?: string;
      portionWeight?: string;
    }>;
    legacyNote?: string;
    photos?: Array<{
      itemId: string;
      base64: string;
      contentType: string;
      fileName: string;
      isStandard: boolean;
    }>;
  }) => Promise<{ success: true; inspectionId: string }>;
  initialState?: InspectionFormDraftState;
  submitLabel?: string;
  isEditMode?: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<InspectionFormDraftState>(() => initialState ?? createInitialState(seed));
  const [photos, setPhotos] = useState<Record<string, PhotoDraft[]>>({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("idle");
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Record<string, boolean>>(
    Object.fromEntries(seed.groupedItems.map((group) => [group.categoryId, false])),
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const workstationsById = useMemo(
    () => Object.fromEntries(seed.workstations.map((workstation) => [workstation.id, workstation])),
    [seed.workstations],
  );

  const draftKey = useMemo(() => `draft_${form.storeId}_${form.date}`, [form.storeId, form.date]);
  const requiresStoreSelection = !isEditMode && !form.storeId;

  useEffect(() => {
    const freshState = initialState ?? createInitialState(seed);
    setForm(freshState);
    setPhotos({});
    setDraftSaveState("idle");
    setLastDraftSavedAt(null);
    setCollapsedCategoryIds(Object.fromEntries(seed.groupedItems.map((group) => [group.categoryId, false])));

    if (isEditMode) {
      return;
    }

    if (!seed.selectedStoreId) {
      return;
    }

    const existingDraft = localStorage.getItem(`draft_${seed.selectedStoreId}_${seed.selectedDate}`);
    if (existingDraft && !seed.duplicateInspectionWarning) {
      const shouldLoad = window.confirm("發現這個店別與日期已有草稿，要繼續接著填寫嗎？");
      if (shouldLoad) {
        try {
          setForm(JSON.parse(existingDraft) as InspectionFormDraftState);
          setDraftSaveState("saved");
          setLastDraftSavedAt(new Date());
        } catch {
          localStorage.removeItem(`draft_${seed.selectedStoreId}_${seed.selectedDate}`);
        }
      }
    }
  }, [initialState, isEditMode, seed]);

  useEffect(() => {
    if (isEditMode || !form.storeId) {
      return;
    }

    setDraftSaveState("saving");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(draftKey, JSON.stringify(form));
        setDraftSaveState("saved");
        setLastDraftSavedAt(new Date());
      } catch {
        setDraftSaveState("error");
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [draftKey, form, isEditMode]);

  const missingFocusCount = Object.values(form.scores).filter((score) => score.isFocusItem && score.score === null)
    .length;
  const totalItemCount = seed.groupedItems.reduce((sum, group) => sum + group.items.length, 0);
  const scoredItemCount = Object.values(form.scores).filter((value) => value.score !== null).length;
  const completedCategoryCount = seed.groupedItems.filter((group) =>
    group.items.every((item) => form.scores[item.id]?.score !== null),
  ).length;

  function applyBulkScore(score: ScoreValue) {
    setForm((current) => ({
      ...current,
      scores: Object.fromEntries(
        Object.entries(current.scores).map(([itemId, value]) => [
          itemId,
          {
            ...value,
            score,
          },
        ]),
      ),
    }));
  }

  function resetScoresToDefault() {
    const defaults = createInitialState(seed);
    setForm((current) => ({
      ...current,
      scores: defaults.scores,
    }));
  }

  function setScore(itemId: string, score: ScoreValue) {
    setForm((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [itemId]: {
          ...current.scores[itemId],
          score,
        },
      },
    }));
  }

  function setNote(itemId: string, note: string) {
    setForm((current) => ({
      ...current,
      scores: {
        ...current.scores,
        [itemId]: {
          ...current.scores[itemId],
          note,
        },
      },
    }));
  }

  function assignStaff(staffId: string, workstationId: string, checked: boolean) {
    setForm((current) => {
      const next = { ...current.selectedStaff };
      if (checked) {
        next[staffId] = workstationId;
      } else {
        delete next[staffId];
      }

      return {
        ...current,
        selectedStaff: next,
      };
    });
  }

  function setMenuField(field: keyof InspectionFormDraftState["menuItems"], value: string) {
    setForm((current) => ({
      ...current,
      menuItems: {
        ...current.menuItems,
        [field]: value,
      },
    }));
  }

  function setStaffWorkstation(staffId: string, workstationId: string) {
    setForm((current) => ({
      ...current,
      selectedStaff: {
        ...current.selectedStaff,
        [staffId]: workstationId,
      },
    }));
  }

  function toggleCategory(categoryId: string) {
    setCollapsedCategoryIds((current) => ({
      ...current,
      [categoryId]: !current[categoryId],
    }));
  }

  function navigateToSeed(nextStoreId: string, nextDate: string) {
    const params = new URLSearchParams();
    if (nextStoreId) {
      params.set("store", nextStoreId);
    }
    params.set("date", nextDate);
    router.push(`/inspection/new?${params.toString()}`);
  }

  async function handlePhotoChange(itemId: string, fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setError("");

    try {
      const compressed = await Promise.all(
        Array.from(fileList).map(async (file) => {
          const result = await compressImage(file);
          return {
            itemId,
            ...result,
            isStandard: false,
            previewUrl: `data:${result.contentType};base64,${result.base64}`,
          } satisfies PhotoDraft;
        }),
      );

      setPhotos((current) => ({
        ...current,
        [itemId]: [...(current[itemId] ?? []), ...compressed],
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "照片處理失敗，請再試一次。");
    } finally {
      const input = fileInputRefs.current[itemId];
      if (input) {
        input.value = "";
      }
    }
  }

  function removePhoto(itemId: string, fileName: string) {
    setPhotos((current) => ({
      ...current,
      [itemId]: (current[itemId] ?? []).filter((photo) => photo.fileName !== fileName),
    }));
  }

  function toggleStandardPhoto(itemId: string, fileName: string) {
    setPhotos((current) => ({
      ...current,
      [itemId]: (current[itemId] ?? []).map((photo) =>
        photo.fileName === fileName ? { ...photo, isStandard: !photo.isStandard } : photo,
      ),
    }));
  }

  async function handleSubmit() {
    setError("");

    if (!form.storeId) {
      setError("請先選擇要巡店的店別。");
      return;
    }

    if (!form.timeSlot.trim()) {
      setError("請先填寫巡店時段。");
      return;
    }

    if (missingFocusCount > 0) {
      setError(`還有 ${missingFocusCount} 個標籤項目尚未評分。`);
      return;
    }

    const invalidNotes = Object.values(form.scores).find(
      (value) => value.score !== null && value.score <= 2 && !value.note.trim(),
    );
    if (invalidNotes) {
      setError("分數為 1 分或 2 分的項目，請補上改善備註。");
      return;
    }

    setIsSaving(true);

    try {
      const result = await saveAction({
        storeId: form.storeId,
        date: form.date,
        timeSlot: form.timeSlot,
        busynessLevel: form.busynessLevel,
        selectedStaff: Object.entries(form.selectedStaff).map(([staffId, roleInShift]) => ({
          staffId,
          workstationId: roleInShift,
        })),
        scores: Object.entries(form.scores)
          .filter(([, value]) => value.score !== null)
          .map(([itemId, value]) => ({
            itemId,
            score: value.score as ScoreValue,
            note: value.note,
            isFocusItem: value.isFocusItem,
            tagTypes: value.tagTypes,
            hasPrevIssue: value.hasPrevIssue,
            consecutiveWeeks: value.consecutiveWeeks,
          })),
        menuItems: [
          {
            type: "dine_in",
            dishName: form.menuItems.dineInDishName,
            portionWeight: form.menuItems.dineInPortionWeight,
          },
          {
            type: "takeout",
            dishName: form.menuItems.takeoutDishName,
            portionWeight: form.menuItems.takeoutPortionWeight,
          },
        ],
        legacyNote: form.legacyNote,
        photos: Object.values(photos).flat().map((photo) => ({
          itemId: photo.itemId,
          base64: photo.base64,
          contentType: photo.contentType,
          fileName: photo.fileName,
          isStandard: photo.isStandard,
        })),
      });

      if (!isEditMode) {
        localStorage.removeItem(draftKey);
      }

      if (result.success) {
        router.push("/inspection/history");
      }
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "建立巡店紀錄失敗，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  }

  const draftStatusLabel = requiresStoreSelection ? "選定店別後才會開始讀取與儲存草稿。" : isEditMode
    ? "編輯模式不會另外保存瀏覽器草稿。"
    : draftSaveState === "saving"
      ? "正在儲存草稿..."
      : draftSaveState === "saved"
        ? `草稿已儲存（${formatDraftTimestamp(lastDraftSavedAt)}）`
        : draftSaveState === "error"
          ? "草稿儲存失敗，請檢查瀏覽器儲存空間或網路狀態。"
          : "尚未開始儲存草稿。";

  return (
    <div className="grid gap-6" data-testid={isEditMode ? "inspection-edit-form" : "inspection-create-form"}>
      {requiresStoreSelection ? (
        <section className="rounded-[28px] border border-dashed border-ink/15 bg-white p-6 shadow-card">
          <h2 className="font-serifTc text-2xl font-semibold text-ink">先選擇店別，再開始巡店</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-ink/70">
            這一頁不再預設帶入一店，避免一進來就跳出舊草稿提示。請先從上方選擇要巡的店別，系統才會載入該店的當班人員、題目與草稿。
          </p>
        </section>
      ) : null}
      <section className="rounded-[28px] border border-ink/10 bg-white p-5 shadow-card">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-ink/70">店別</label>
            <select
              data-testid="inspection-store-select"
              value={form.storeId}
              onChange={(event) => navigateToSeed(event.target.value, form.date)}
              disabled={isEditMode}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 disabled:bg-soft/60 disabled:text-ink/45"
            >
              {!isEditMode ? <option value="">請先選擇店別</option> : null}
              {seed.stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm text-ink/70">日期</label>
            <input
              data-testid="inspection-date-input"
              type="date"
              value={form.date}
              onChange={(event) => navigateToSeed(form.storeId, event.target.value)}
              disabled={isEditMode}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 disabled:bg-soft/60 disabled:text-ink/45"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-ink/70">巡店時段</label>
            <input
              data-testid="inspection-time-slot-input"
              value={form.timeSlot}
              onChange={(event) => setForm((current) => ({ ...current, timeSlot: event.target.value }))}
              placeholder="例如 14:30-15:15"
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-ink/70">忙碌程度</label>
            <select
              data-testid="inspection-busyness-select"
              value={form.busynessLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  busynessLevel: event.target.value as InspectionFormDraftState["busynessLevel"],
                }))
              }
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            >
              <option value="low">較空</option>
              <option value="medium">一般</option>
              <option value="high">忙碌</option>
            </select>
          </div>
        </div>

        {isEditMode ? (
          <div className="mt-4 rounded-2xl border border-ink/10 bg-soft/50 px-4 py-3 text-sm text-ink/65">
            編輯模式先固定店別與日期，避免切換後載入到另一份巡店表單。
          </div>
        ) : null}

        {!isEditMode && seed.duplicateInspectionWarning ? (
          <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            這個店別與日期已存在巡店紀錄，若只是補寫請先確認是否會重複建立。
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-ink/10 bg-soft/35 px-4 py-4">
            <p className="text-sm font-medium text-ink">填寫進度</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm text-ink/70">
              <span>已完成 {completedCategoryCount} / {seed.groupedItems.length} 個分類</span>
              <span>已填 {scoredItemCount} / {totalItemCount} 題</span>
              <span>未填標籤項目 {missingFocusCount} 題</span>
            </div>
            <div className="mt-3 h-2 rounded-full bg-cream">
              <div
                className="h-full rounded-full bg-warm transition-all"
                style={{ width: `${Math.max((scoredItemCount / Math.max(totalItemCount, 1)) * 100, 4)}%` }}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-ink/10 bg-soft/35 px-4 py-4">
            <p className="text-sm font-medium text-ink">草稿狀態</p>
            <p className="mt-2 text-sm text-ink/70" data-testid="inspection-draft-status">
              {draftStatusLabel}
            </p>
            <p className="mt-2 text-xs leading-5 text-ink/55">
              {isEditMode
                ? "編輯送出後會直接更新原本巡店紀錄。"
                : "新增模式會自動保存目前表單內容；照片不會保存在瀏覽器草稿中。"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-[28px] border border-ink/10 bg-white p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serifTc text-2xl font-semibold">當班人員</h2>
            <p className="mt-2 text-sm text-ink/70">勾選這次巡店時段實際在場的組員。</p>
          </div>
          <div className="rounded-full bg-soft px-4 py-2 text-sm text-ink/70">已選 {Object.keys(form.selectedStaff).length} 人</div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {seed.activeStaff.map((staff) => {
            const checked = Boolean(form.selectedStaff[staff.id]);
            const selectedWorkstationId = form.selectedStaff[staff.id];
            const defaultWorkstation =
              (staff.defaultWorkstationId ? workstationsById[staff.defaultWorkstationId] : undefined) ??
              seed.workstations[0];
            const selectedWorkstation = selectedWorkstationId ? workstationsById[selectedWorkstationId] : undefined;

            return (
              <div
                key={staff.id}
                className="rounded-2xl border border-ink/10 bg-soft/30 px-4 py-3"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-ink">{staff.name}</p>
                    <p className="text-sm text-ink/60">
                      常用工作站：{staff.defaultWorkstationId ? getWorkstationLabel(workstationsById[staff.defaultWorkstationId]) : "未指定"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => assignStaff(staff.id, defaultWorkstation?.id ?? "", event.target.checked)}
                    disabled={!defaultWorkstation}
                    className="mt-1 h-5 w-5 rounded border-ink/30 text-warm focus:ring-warm"
                  />
                </div>
                {checked ? (
                  <label className="mt-3 grid gap-2 text-sm">
                    <span className="text-ink/65">本次當班工作站</span>
                    <select
                      value={selectedWorkstationId}
                      onChange={(event) => setStaffWorkstation(staff.id, event.target.value)}
                      className="rounded-2xl border border-ink/10 bg-white px-4 py-3"
                    >
                      {seed.workstations.map((workstation) => (
                        <option key={workstation.id} value={workstation.id}>
                          {getWorkstationLabel(workstation)}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-ink/55">
                      這次巡店會以「{selectedWorkstation ? getWorkstationLabel(selectedWorkstation) : "未指定工作站"}」記錄。
                    </span>
                  </label>
                ) : null}
              </div>
            );
          })}

          {seed.activeStaff.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
              目前這家店沒有可選的在職組員。
            </div>
          ) : null}
        </div>
      </section>

      <section className="sticky top-4 z-10 rounded-[28px] border border-ink/10 bg-cream/95 p-5 shadow-card backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-serifTc text-2xl font-semibold">分類導航</h2>
            <p className="mt-2 text-sm text-ink/70">先快速把整體評分設好，再只調整例外項目會更快。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              data-testid="inspection-bulk-score-3"
              onClick={() => applyBulkScore(3)}
              className="rounded-full bg-warm px-4 py-2 text-sm text-white"
            >
              全部設為 3 分
            </button>
            <button
              type="button"
              data-testid="inspection-reset-scores"
              onClick={resetScoresToDefault}
              className="rounded-full bg-soft px-4 py-2 text-sm text-ink/75"
            >
              重設評分
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" data-testid="inspection-category-nav">
          {seed.groupedItems.map((group, index) => {
            const answeredCount = group.items.filter((item) => form.scores[item.id]?.score !== null).length;
            const isCompleted = answeredCount === group.items.length;
            return (
              <a
                key={group.categoryId}
                href={`#category-${group.categoryId}`}
                className={`rounded-full px-4 py-2 text-sm transition ${
                  isCompleted ? "bg-white text-ink shadow-sm" : "bg-soft text-ink/75 hover:bg-white"
                }`}
              >
                {index + 1}. {group.categoryName} ({answeredCount}/{group.items.length})
              </a>
            );
          })}
        </div>
      </section>

      {seed.groupedItems.map((group, index) => {
        const answeredCount = group.items.filter((item) => form.scores[item.id]?.score !== null).length;
        const collapsed = collapsedCategoryIds[group.categoryId];

        return (
          <section
            key={group.categoryId}
            id={`category-${group.categoryId}`}
            className="scroll-mt-36 rounded-[28px] border border-ink/10 bg-white p-5 shadow-card"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">分類 {index + 1}</p>
                <h2 className="mt-2 font-serifTc text-2xl font-semibold">{group.categoryName}</h2>
                <p className="mt-2 text-sm text-ink/70">
                  已填 {answeredCount} / {group.items.length} 題
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-soft px-4 py-2 text-sm text-ink/70">
                  {answeredCount === group.items.length ? "已完成" : "尚未完成"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleCategory(group.categoryId)}
                  className="rounded-full bg-soft px-4 py-2 text-sm text-ink/75"
                >
                  {collapsed ? "展開分類" : "收合分類"}
                </button>
              </div>
            </div>

            {!collapsed ? (
              <div className="mt-5 grid gap-4">
                {group.items.map((item) => {
                  const value = form.scores[item.id] ?? {
                    score: item.defaultScore,
                    note: "",
                    isFocusItem: item.isFocusItem,
                    tagTypes: item.tagTypes,
                    hasPrevIssue: item.hasPrevIssue,
                    consecutiveWeeks: item.consecutiveWeeks,
                  };
                  const itemPhotos = photos[item.id] ?? [];

                  return (
                    <article
                      key={item.id}
                      data-testid={`inspection-item-${item.id}`}
                      data-item-id={item.id}
                      className="rounded-[24px] border border-ink/10 bg-soft/25 p-4"
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-medium text-ink">{item.name}</h3>
                            {value.tagTypes.map((tagType) => (
                              <span
                                key={tagType}
                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                  tagType === "critical"
                                    ? "bg-danger text-white"
                                    : tagType === "monthly_attention"
                                      ? "bg-warm px-3 py-1 text-white"
                                      : "bg-ink text-white"
                                }`}
                              >
                                {getInspectionTagLabel(tagType)}
                              </span>
                            ))}
                            {value.hasPrevIssue ? (
                              <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                                連續低分 {value.consecutiveWeeks} 週
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm text-ink/65">
                            1 分代表明顯不合格，2 分代表需要改善，3 分代表符合標準。
                          </p>
                        </div>

                        <div className="flex gap-2">
                          {[1, 2, 3].map((score) => (
                            <button
                              key={score}
                              type="button"
                              data-testid={`inspection-score-${item.id}-${score}`}
                              data-score={score}
                              onClick={() => setScore(item.id, score as ScoreValue)}
                              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                value.score === score
                                  ? "bg-warm text-white"
                                  : "border border-ink/10 bg-white text-ink/70 hover:bg-cream"
                              }`}
                            >
                              {score}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                        <div>
                          <label className="mb-2 block text-sm text-ink/70">備註</label>
                          <textarea
                            data-testid={`inspection-note-${item.id}`}
                            value={value.note}
                            onChange={(event) => setNote(item.id, event.target.value)}
                            placeholder="若為低分，請補充原因、現場觀察或改善方向。"
                            className="min-h-28 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                          />
                        </div>

                        <div className="rounded-2xl border border-ink/10 bg-white p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium text-ink">照片</p>
                              <p className="mt-1 text-xs leading-5 text-ink/60">
                                可上傳巡店照片；3 分項目可標記為標準照片。
                              </p>
                            </div>
                            <label className="rounded-full bg-soft px-4 py-2 text-sm text-ink">
                              上傳
                              <input
                                ref={(node) => {
                                  fileInputRefs.current[item.id] = node;
                                }}
                                type="file"
                                accept="image/*"
                                multiple
                                className="hidden"
                                onChange={(event) => handlePhotoChange(item.id, event.target.files)}
                              />
                            </label>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-3">
                            {itemPhotos.map((photo) => (
                              <div key={`${photo.fileName}_${photo.previewUrl}`} className="overflow-hidden rounded-2xl border border-ink/10 bg-soft/20">
                                <div className="relative aspect-square w-full">
                                  <Image src={photo.previewUrl} alt={photo.fileName} fill unoptimized className="object-cover" />
                                </div>
                                <div className="grid gap-2 p-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleStandardPhoto(item.id, photo.fileName)}
                                    className={`rounded-full px-3 py-2 text-xs ${
                                      photo.isStandard ? "bg-warm text-white" : "bg-soft text-ink/70"
                                    }`}
                                  >
                                    {photo.isStandard ? "標準照片" : "設為標準"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removePhoto(item.id, photo.fileName)}
                                    className="rounded-full bg-danger/10 px-3 py-2 text-xs text-danger"
                                  >
                                    刪除
                                  </button>
                                </div>
                              </div>
                            ))}

                            {itemPhotos.length === 0 ? (
                              <div className="col-span-2 rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/55">
                                尚未上傳照片。
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="rounded-[28px] border border-ink/10 bg-white p-5 shadow-card">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-ink/10 bg-soft/25 p-4">
            <h2 className="font-serifTc text-2xl font-semibold">餐點品質抽查記錄</h2>
            <p className="mt-2 text-sm text-ink/70">填寫內用與外帶的抽查品項與重量。</p>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-ink/70">內用餐點名稱</label>
                  <input
                    value={form.menuItems.dineInDishName}
                    onChange={(event) => setMenuField("dineInDishName", event.target.value)}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-ink/70">內用重量 / 克數</label>
                  <input
                    value={form.menuItems.dineInPortionWeight}
                    onChange={(event) => setMenuField("dineInPortionWeight", event.target.value)}
                    placeholder="例如 285g"
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-ink/70">外帶餐點名稱</label>
                  <input
                    value={form.menuItems.takeoutDishName}
                    onChange={(event) => setMenuField("takeoutDishName", event.target.value)}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-ink/70">外帶重量 / 克數</label>
                  <input
                    value={form.menuItems.takeoutPortionWeight}
                    onChange={(event) => setMenuField("takeoutPortionWeight", event.target.value)}
                    placeholder="例如 260g"
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-ink/10 bg-soft/25 p-4">
            <h2 className="font-serifTc text-2xl font-semibold">補充說明</h2>
            <p className="mt-2 text-sm text-ink/70">紀錄現場觀察、前次追蹤情況或其他補充資訊。</p>

            <textarea
              value={form.legacyNote}
              onChange={(event) => setForm((current) => ({ ...current, legacyNote: event.target.value }))}
              placeholder="例如：上次低分項已改善、現場人力不足、尖峰時段出餐延遲等。"
              className="mt-4 min-h-48 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div> : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/65">
          尚未完成評分的標籤項目：<span className="font-medium text-danger">{missingFocusCount}</span>
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          data-testid="inspection-submit-button"
          disabled={isSaving || requiresStoreSelection}
          className="rounded-full bg-warm px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "儲存中..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
