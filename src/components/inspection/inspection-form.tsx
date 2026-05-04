"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { compressImage } from "@/lib/image";
import type { InspectionFormSeed } from "@/lib/inspection";
import {
  canAddInspectionPhotos,
  getPhotoLimitMessage,
  MAX_PHOTOS_PER_INSPECTION,
  MAX_PHOTOS_PER_ITEM,
} from "@/lib/photo-upload-limits";
import { getInspectionTagLabel, type InspectionTagType } from "@/lib/ui-labels";
import { getPreviousIssueLabel } from "@/lib/previous-issue-tags";

type ScoreValue = 1 | 2 | 3;
type DraftSaveState = "idle" | "saving" | "saved" | "error";
type WorkstationOption = InspectionFormSeed["workstations"][number];
const TIME_SLOT_OPTIONS = [
  "7\u9ede-8\u9ede",
  "8\u9ede-9\u9ede",
  "9\u9ede-10\u9ede",
  "10\u9ede-11\u9ede",
  "11\u9ede-12\u9ede",
  "12\u9ede-13\u9ede",
  "13\u9ede-14\u9ede",
  "14\u9ede-15\u9ede",
  "15\u9ede-16\u9ede",
] as const;
const CUSTOM_TIME_SLOT_VALUE = "__custom__";
const SCORE_OPTIONS = [
  { score: 3 as const, grade: "A", label: "\u826f\u597d" },
  { score: 2 as const, grade: "B", label: "\u5f85\u52a0\u5f37" },
  { score: 1 as const, grade: "C", label: "\u7570\u5e38" },
];
const LOAD_DRAFT_CONFIRM_MESSAGE =
  "\u767c\u73fe\u9019\u500b\u5e97\u5225\u8207\u65e5\u671f\u5df2\u6709\u8349\u7a3f\uff0c\u662f\u5426\u8981\u63a5\u8457\u8f09\u5165\u4e26\u7e7c\u7e8c\u586b\u5beb\uff1f";

type PhotoDraft = {
  itemId: string;
  base64: string;
  contentType: string;
  fileName: string;
  isStandard: boolean;
  previewUrl: string;
};

type MenuPhotoDraft = {
  base64: string;
  contentType: string;
  fileName: string;
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
    dineInObservationNote: string;
    dineInPhotoUrl: string;
    takeoutDishName: string;
    takeoutPortionWeight: string;
    takeoutObservationNote: string;
    takeoutPhotoUrl: string;
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
      dineInObservationNote: "",
      dineInPhotoUrl: "",
      takeoutDishName: "",
      takeoutPortionWeight: "",
      takeoutObservationNote: "",
      takeoutPhotoUrl: "",
    },
    legacyNote: "",
  };
}

function isScoreValue(value: unknown): value is ScoreValue {
  return value === 1 || value === 2 || value === 3;
}

function normalizeDraftState(raw: unknown, seed: InspectionFormSeed): InspectionFormDraftState {
  const fallback = createInitialState(seed);
  if (!raw || typeof raw !== "object") {
    return fallback;
  }

  const draft = raw as Partial<InspectionFormDraftState> & {
    selectedStaff?: Record<string, unknown>;
    scores?: Record<string, Partial<InspectionFormDraftState["scores"][string]>>;
  };

  const workstationByArea = {
    kitchen: seed.workstations.find((workstation) => workstation.area === "kitchen")?.id ?? null,
    floor: seed.workstations.find((workstation) => workstation.area === "floor")?.id ?? null,
    counter: seed.workstations.find((workstation) => workstation.area === "counter")?.id ?? null,
  };

  const normalizedSelectedStaff = Object.fromEntries(
    Object.entries(draft.selectedStaff ?? {})
      .map(([staffId, workstationId]) => {
        if (typeof workstationId !== "string") {
          return null;
        }

        if (seed.workstations.some((workstation) => workstation.id === workstationId)) {
          return [staffId, workstationId] as const;
        }

        if (workstationId in workstationByArea) {
          const mapped = workstationByArea[workstationId as keyof typeof workstationByArea];
          return mapped ? ([staffId, mapped] as const) : null;
        }

        return null;
      })
      .filter((entry): entry is readonly [string, string] => Boolean(entry)),
  );

  const normalizedScores = Object.fromEntries(
    Object.entries(fallback.scores).map(([itemId, baseScore]) => {
      const rawScore = draft.scores?.[itemId];
      return [
        itemId,
        {
          ...baseScore,
          score: isScoreValue(rawScore?.score) ? rawScore.score : baseScore.score,
          note: typeof rawScore?.note === "string" ? rawScore.note : baseScore.note,
          isFocusItem: typeof rawScore?.isFocusItem === "boolean" ? rawScore.isFocusItem : baseScore.isFocusItem,
          tagTypes: Array.isArray(rawScore?.tagTypes)
            ? rawScore.tagTypes.filter((tag): tag is InspectionTagType =>
                tag === "critical" || tag === "monthly_attention" || tag === "complaint_watch",
              )
            : baseScore.tagTypes,
          hasPrevIssue:
            typeof rawScore?.hasPrevIssue === "boolean" ? rawScore.hasPrevIssue : baseScore.hasPrevIssue,
          consecutiveWeeks:
            typeof rawScore?.consecutiveWeeks === "number" ? rawScore.consecutiveWeeks : baseScore.consecutiveWeeks,
        },
      ];
    }),
  );

  return {
    ...fallback,
    storeId: typeof draft.storeId === "string" && draft.storeId ? draft.storeId : fallback.storeId,
    date: typeof draft.date === "string" && draft.date ? draft.date : fallback.date,
    timeSlot: typeof draft.timeSlot === "string" ? draft.timeSlot : fallback.timeSlot,
    busynessLevel:
      draft.busynessLevel === "low" || draft.busynessLevel === "medium" || draft.busynessLevel === "high"
        ? draft.busynessLevel
        : fallback.busynessLevel,
    selectedStaff: normalizedSelectedStaff,
    scores: normalizedScores,
    menuItems: {
      dineInDishName:
        typeof draft.menuItems?.dineInDishName === "string" ? draft.menuItems.dineInDishName : fallback.menuItems.dineInDishName,
      dineInPortionWeight:
        typeof draft.menuItems?.dineInPortionWeight === "string"
          ? draft.menuItems.dineInPortionWeight
          : fallback.menuItems.dineInPortionWeight,
      dineInObservationNote:
        typeof draft.menuItems?.dineInObservationNote === "string"
          ? draft.menuItems.dineInObservationNote
          : fallback.menuItems.dineInObservationNote,
      dineInPhotoUrl:
        typeof draft.menuItems?.dineInPhotoUrl === "string"
          ? draft.menuItems.dineInPhotoUrl
          : fallback.menuItems.dineInPhotoUrl,
      takeoutDishName:
        typeof draft.menuItems?.takeoutDishName === "string"
          ? draft.menuItems.takeoutDishName
          : fallback.menuItems.takeoutDishName,
      takeoutPortionWeight:
        typeof draft.menuItems?.takeoutPortionWeight === "string"
          ? draft.menuItems.takeoutPortionWeight
          : fallback.menuItems.takeoutPortionWeight,
      takeoutObservationNote:
        typeof draft.menuItems?.takeoutObservationNote === "string"
          ? draft.menuItems.takeoutObservationNote
          : fallback.menuItems.takeoutObservationNote,
      takeoutPhotoUrl:
        typeof draft.menuItems?.takeoutPhotoUrl === "string"
          ? draft.menuItems.takeoutPhotoUrl
          : fallback.menuItems.takeoutPhotoUrl,
    },
    legacyNote: typeof draft.legacyNote === "string" ? draft.legacyNote : fallback.legacyNote,
  };
}

function getWorkstationLabel(workstation: WorkstationOption | undefined) {
  if (!workstation) {
    return "未指定工作站";
  }

  const areaLabel =
    workstation.area === "kitchen" ? "內場" : workstation.area === "floor" ? "外場" : "櫃台";
  return `${workstation.name} / ${areaLabel}`;
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

function getInitialCollapsedCategoryIds(
  seed: InspectionFormSeed,
  state: InspectionFormDraftState,
): Record<string, boolean> {
  if (seed.groupedItems.length === 0) {
    return {};
  }

  const firstIncompleteGroup =
    seed.groupedItems.find((group) => group.items.some((item) => state.scores[item.id]?.score === null)) ??
    seed.groupedItems[0];

  return Object.fromEntries(
    seed.groupedItems.map((group) => [group.categoryId, group.categoryId !== firstIncompleteGroup.categoryId]),
  );
}

export function InspectionForm({
  seed,
  saveAction,
  initialState,
  submitLabel = "送出巡店",
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
      observationNote?: string;
      photoUrl?: string;
      photo?: {
        base64: string;
        contentType: string;
        fileName: string;
      };
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
  const [menuPhotos, setMenuPhotos] = useState<Partial<Record<"dine_in" | "takeout", MenuPhotoDraft>>>({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>("idle");
  const [lastDraftSavedAt, setLastDraftSavedAt] = useState<Date | null>(null);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<Record<string, boolean>>(() =>
    getInitialCollapsedCategoryIds(seed, initialState ?? createInitialState(seed)),
  );
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const menuPhotoInputRefs = useRef<Partial<Record<"dine_in" | "takeout", HTMLInputElement | null>>>({});
  const workstationsById = useMemo(
    () => Object.fromEntries(seed.workstations.map((workstation) => [workstation.id, workstation])),
    [seed.workstations],
  );

  const draftKey = useMemo(() => `draft_${form.storeId}_${form.date}`, [form.storeId, form.date]);
  const requiresStoreSelection = !isEditMode && !form.storeId;
  const selectedTimeSlotValue = TIME_SLOT_OPTIONS.includes(form.timeSlot as (typeof TIME_SLOT_OPTIONS)[number])
    ? form.timeSlot
    : form.timeSlot
      ? CUSTOM_TIME_SLOT_VALUE
      : "";

  useEffect(() => {
    const freshState = initialState ?? createInitialState(seed);
    setForm(freshState);
    setPhotos({});
    setMenuPhotos({});
    setDraftSaveState("idle");
    setLastDraftSavedAt(null);
    setCollapsedCategoryIds(getInitialCollapsedCategoryIds(seed, freshState));

    if (isEditMode) {
      return;
    }

    if (!seed.selectedStoreId) {
      return;
    }

    const existingDraft = localStorage.getItem(`draft_${seed.selectedStoreId}_${seed.selectedDate}`);
    if (existingDraft && !seed.duplicateInspectionWarning) {
      const shouldLoad = window.confirm(LOAD_DRAFT_CONFIRM_MESSAGE);
      if (shouldLoad) {
        try {
          const normalizedDraft = normalizeDraftState(JSON.parse(existingDraft), seed);
          setForm(normalizedDraft);
          setCollapsedCategoryIds(getInitialCollapsedCategoryIds(seed, normalizedDraft));
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
  const dineInPhotoPreview = menuPhotos.dine_in?.previewUrl ?? form.menuItems.dineInPhotoUrl;
  const takeoutPhotoPreview = menuPhotos.takeout?.previewUrl ?? form.menuItems.takeoutPhotoUrl;

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

  async function handleMenuPhotoChange(menuType: "dine_in" | "takeout", fileList: FileList | null) {
    if (!fileList?.length) {
      return;
    }

    setError("");

    try {
      const result = await compressImage(fileList[0]);
      setMenuPhotos((current) => ({
        ...current,
        [menuType]: {
          ...result,
          previewUrl: `data:${result.contentType};base64,${result.base64}`,
        },
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "餐點照片壓縮失敗，請換一張再試。");
    } finally {
      const input = menuPhotoInputRefs.current[menuType];
      if (input) {
        input.value = "";
      }
    }
  }

  function removeMenuPhoto(menuType: "dine_in" | "takeout") {
    setMenuPhotos((current) => {
      const next = { ...current };
      delete next[menuType];
      return next;
    });

    setForm((current) => ({
      ...current,
      menuItems: {
        ...current.menuItems,
        ...(menuType === "dine_in" ? { dineInPhotoUrl: "" } : { takeoutPhotoUrl: "" }),
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

    const incomingPhotoCount = fileList.length;
    const existingItemPhotoCount = photos[itemId]?.length ?? 0;
    const existingInspectionPhotoCount = Object.values(photos).reduce((sum, itemPhotos) => sum + itemPhotos.length, 0);

    if (
      !canAddInspectionPhotos({
        existingItemPhotoCount,
        existingInspectionPhotoCount,
        incomingPhotoCount,
      })
    ) {
      setError(getPhotoLimitMessage());
      const input = fileInputRefs.current[itemId];
      if (input) {
        input.value = "";
      }
      return;
    }

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
      setError(uploadError instanceof Error ? uploadError.message : "巡店照片壓縮失敗，請換一張再試。");
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
      setError("請先選擇要開始巡店的店別。");
      return;
    }

    if (!form.timeSlot.trim()) {
      setError("請先選擇巡店時段。");
      return;
    }

    if (missingFocusCount > 0) {
      setError(`還有 ${missingFocusCount} 個標籤題目尚未評分，請先完成。`);
      return;
    }

    const invalidNotes = Object.values(form.scores).find(
      (value) => value.score !== null && value.score <= 2 && !value.note.trim(),
    );
    if (invalidNotes) {
      setError("評為 B 或 C 的題目請補上備註說明。");
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
            observationNote: form.menuItems.dineInObservationNote,
            photoUrl: form.menuItems.dineInPhotoUrl || undefined,
            photo: menuPhotos.dine_in
              ? {
                  base64: menuPhotos.dine_in.base64,
                  contentType: menuPhotos.dine_in.contentType,
                  fileName: menuPhotos.dine_in.fileName,
                }
              : undefined,
          },
          {
            type: "takeout",
            dishName: form.menuItems.takeoutDishName,
            portionWeight: form.menuItems.takeoutPortionWeight,
            observationNote: form.menuItems.takeoutObservationNote,
            photoUrl: form.menuItems.takeoutPhotoUrl || undefined,
            photo: menuPhotos.takeout
              ? {
                  base64: menuPhotos.takeout.base64,
                  contentType: menuPhotos.takeout.contentType,
                  fileName: menuPhotos.takeout.fileName,
                }
              : undefined,
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
        router.push(`/inspection/history/${result.inspectionId}`);
      }
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "送出巡店時發生錯誤，請稍後再試。");
    } finally {
      setIsSaving(false);
    }
  }
  const draftStatusLabel = requiresStoreSelection
    ? "先選擇店別後，系統才會讀取或儲存草稿。"
    : isEditMode
      ? "編輯模式不會自動覆蓋既有巡店草稿。"
      : draftSaveState === "saving"
        ? "正在儲存草稿..."
        : draftSaveState === "saved"
          ? `草稿已儲存於 ${formatDraftTimestamp(lastDraftSavedAt)}`
          : draftSaveState === "error"
            ? "草稿儲存失敗，請檢查網路後再試一次。"
            : "尚未開始儲存草稿。";
  return (
    <div className="grid gap-6" data-testid={isEditMode ? "inspection-edit-form" : "inspection-create-form"}>
      <section className="nb-card p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="nb-label">店別</label>
            <select
              data-testid="inspection-store-select"
              value={form.storeId}
              onChange={(event) => navigateToSeed(event.target.value, form.date)}
              disabled={isEditMode}
              className="nb-select disabled:bg-nb-ink/10 disabled:text-nb-ink/45"
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
            <label className="nb-label">日期</label>
            <input
              data-testid="inspection-date-input"
              type="date"
              value={form.date}
              onChange={(event) => navigateToSeed(form.storeId, event.target.value)}
              disabled={isEditMode}
              className="nb-input disabled:bg-nb-ink/10 disabled:text-nb-ink/45"
            />
          </div>

          <div>
            <label className="nb-label">巡店時段</label>
            <div className="grid gap-2">
              <select
                data-testid="inspection-time-slot-select"
                value={selectedTimeSlotValue}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    timeSlot: event.target.value === CUSTOM_TIME_SLOT_VALUE ? current.timeSlot : event.target.value,
                  }))
                }
                className="nb-select"
              >
                <option value="">請選擇巡店時段</option>
                {TIME_SLOT_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
                <option value={CUSTOM_TIME_SLOT_VALUE}>其他（自訂）</option>
              </select>

              {selectedTimeSlotValue === CUSTOM_TIME_SLOT_VALUE ? (
                <input
                  data-testid="inspection-time-slot-input"
                  value={form.timeSlot}
                  onChange={(event) => setForm((current) => ({ ...current, timeSlot: event.target.value }))}
                  placeholder="請輸入自訂巡店時段，例如：14:30-15:15"
                  className="nb-input"
                />
              ) : null}
            </div>
          </div>

          <div>
            <label className="nb-label">忙碌程度</label>
            <select
              data-testid="inspection-busyness-select"
              value={form.busynessLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  busynessLevel: event.target.value as InspectionFormDraftState["busynessLevel"],
                }))
              }
              className="nb-select"
            >
              <option value="low">較空</option>
              <option value="medium">一般</option>
              <option value="high">忙碌</option>
            </select>
          </div>
        </div>

        {isEditMode ? (
          <div className="nb-card-flat bg-nb-bg2 mt-4 px-4 py-3 text-sm font-bold text-nb-ink/70">
            目前為編輯模式，店別與日期會維持原本紀錄，避免誤把既有巡店改到其他店或其他日期。
          </div>
        ) : null}

        {!isEditMode && seed.duplicateInspectionWarning ? (
          <div className="nb-card-flat border-nb-red bg-nb-red/10 mt-4 px-4 py-3 text-sm font-bold text-nb-red">
            這個店別在同一天已經有巡店紀錄，送出前請再次確認是否需要重複建立。
          </div>
        ) : null}

        <div className="mt-4 grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="nb-card-flat bg-nb-bg2 px-4 py-4">
            <p className="nb-eyebrow">Progress</p>
            <p className="mt-1 font-nbSerif text-base font-black text-nb-ink">填寫進度</p>
            <div className="mt-2 flex flex-wrap gap-3 text-sm font-bold text-nb-ink/70 font-nbMono">
              <span>已完成 {completedCategoryCount} / {seed.groupedItems.length} 個分類</span>
              <span>已填 {scoredItemCount} / {totalItemCount} 題</span>
              <span>未填標籤題目 {missingFocusCount} 題</span>
            </div>
            <div className="mt-3 h-3 border-[2.5px] border-nb-ink bg-nb-paper">
              <div
                className="h-full bg-nb-ink transition-all"
                style={{ width: `${Math.max((scoredItemCount / Math.max(totalItemCount, 1)) * 100, 4)}%` }}
              />
            </div>
          </div>
          <div className="nb-card-flat bg-nb-bg2 px-4 py-4">
            <p className="nb-eyebrow">Draft</p>
            <p className="mt-1 font-nbSerif text-base font-black text-nb-ink">草稿狀態</p>
            <p className="mt-2 text-sm font-bold text-nb-ink/70" data-testid="inspection-draft-status">
              {draftStatusLabel}
            </p>
            <p className="mt-2 text-xs leading-5 text-nb-ink/55">
              {isEditMode
                ? "編輯既有巡店時不會覆蓋瀏覽器裡的草稿。"
                : "草稿只會保存在目前這台裝置；照片不會保存在瀏覽器草稿中。"}
            </p>
          </div>
        </div>
      </section>

      <section className="nb-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="nb-eyebrow">On-shift</p>
            <h2 className="nb-h2 mt-1">當班人員</h2>
            <p className="mt-2 text-sm text-nb-ink/70">勾選這次巡店時段實際在場的組員，並指定本次工作站。</p>
          </div>
          <div className="nb-chip-yellow">已選 {Object.keys(form.selectedStaff).length} 人</div>
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
              <div key={staff.id} className="nb-card-flat bg-nb-bg2 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-nbSerif text-base font-black text-nb-ink">{staff.name}</p>
                    <p className="text-xs font-bold text-nb-ink/60 font-nbMono mt-1">
                      常用工作站：
                      {staff.defaultWorkstationId ? getWorkstationLabel(workstationsById[staff.defaultWorkstationId]) : "尚未指定"}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => assignStaff(staff.id, defaultWorkstation?.id ?? "", event.target.checked)}
                    disabled={!defaultWorkstation}
                    className="nb-check mt-1"
                  />
                </div>
                {checked ? (
                  <label className="mt-3 grid gap-2 text-sm">
                    <span className="nb-label !mb-0">本次巡店工作站</span>
                    <select
                      value={selectedWorkstationId}
                      onChange={(event) => setStaffWorkstation(staff.id, event.target.value)}
                      className="nb-select"
                    >
                      {seed.workstations.map((workstation) => (
                        <option key={workstation.id} value={workstation.id}>
                          {getWorkstationLabel(workstation)}
                        </option>
                      ))}
                    </select>
                    <span className="nb-help">
                      目前記錄為：{selectedWorkstation ? getWorkstationLabel(selectedWorkstation) : "尚未選擇工作站"}
                    </span>
                  </label>
                ) : null}
              </div>
            );
          })}

          {seed.activeStaff.length === 0 ? (
            <div className="nb-empty col-span-full">
              目前這家店沒有可選的在職組員。
            </div>
          ) : null}
        </div>
      </section>

      <section className="sticky top-2 z-10 nb-card bg-nb-bg2/95 backdrop-blur px-3 py-3 sm:top-4 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="nb-eyebrow">Quick Nav</p>
            <h2 className="nb-h2 mt-1 text-lg sm:text-2xl">分類導航</h2>
            <p className="mt-2 hidden text-sm text-nb-ink/70 sm:block">先快速把整體評分完成，再回頭調整個別題目的 B / C 與備註會更快。</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              data-testid="inspection-bulk-score-3"
              onClick={() => applyBulkScore(3)}
              className="nb-btn-green text-xs sm:text-sm"
            >
              全部設為 A
            </button>
            <button
              type="button"
              data-testid="inspection-reset-scores"
              onClick={resetScoresToDefault}
              className="nb-btn text-xs sm:text-sm"
            >
              重設為預設值
            </button>
          </div>
        </div>

        <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" data-testid="inspection-category-nav">
          <div className="flex min-w-max gap-2">
          {seed.groupedItems.map((group, index) => {
            const answeredCount = group.items.filter((item) => form.scores[item.id]?.score !== null).length;
            const isCompleted = answeredCount === group.items.length;
            return (
              <a
                key={group.categoryId}
                href={`#category-${group.categoryId}`}
                onClick={() =>
                  setCollapsedCategoryIds((current) => ({
                    ...current,
                    [group.categoryId]: false,
                  }))
                }
                className={`whitespace-nowrap ${isCompleted ? "nb-tab-active" : "nb-tab"}`}
              >
                {index + 1}. {group.categoryName} ({answeredCount}/{group.items.length})
              </a>
            );
          })}
          </div>
        </div>
      </section>

      {seed.groupedItems.map((group, index) => {
        const answeredCount = group.items.filter((item) => form.scores[item.id]?.score !== null).length;
        const collapsed = collapsedCategoryIds[group.categoryId];

        return (
          <section
            key={group.categoryId}
            id={`category-${group.categoryId}`}
            className="scroll-mt-32 nb-card p-4 sm:scroll-mt-36 sm:p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="nb-eyebrow">Category {index + 1}</p>
                <h2 className="nb-h2 mt-1 text-xl sm:text-2xl">{group.categoryName}</h2>
                <p className="mt-2 text-sm font-bold font-nbMono text-nb-ink/70">已填 {answeredCount} / {group.items.length} 題</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <span className={answeredCount === group.items.length ? "nb-chip-green" : "nb-chip"}>
                  {answeredCount === group.items.length ? "已完成" : "填寫中"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleCategory(group.categoryId)}
                  className="nb-btn text-xs"
                >
                  {collapsed ? "展開分類" : "收合分類"}
                </button>
              </div>
            </div>

            {!collapsed ? (
              <div className="mt-4 grid gap-3 sm:mt-5 sm:gap-4">
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
                  const hasFollowupContent = value.note.trim().length > 0 || itemPhotos.length > 0;
                  const needsFollowup = value.score !== null && value.score <= 2;
                  const showFollowup = needsFollowup || hasFollowupContent;

                  return (
                    <article
                      key={item.id}
                      data-testid={`inspection-item-${item.id}`}
                      data-item-id={item.id}
                      className="nb-card-flat bg-nb-bg2 p-3 sm:p-4"
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-nbSerif text-base font-black text-nb-ink sm:text-lg">{item.name}</h3>
                            {value.tagTypes.map((tagType) => (
                              <span
                                key={tagType}
                                className={
                                  tagType === "critical"
                                    ? "nb-chip-red"
                                    : tagType === "monthly_attention"
                                      ? "nb-chip-yellow"
                                      : "nb-chip-ink"
                                }
                              >
                                {getInspectionTagLabel(tagType)}
                              </span>
                            ))}
                            {value.hasPrevIssue ? (
                              <span className="nb-chip-red">
                                {getPreviousIssueLabel(value.consecutiveWeeks)}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-2 text-xs leading-5 text-nb-ink/65 sm:text-sm">
                            這題請以 A / B / C 評分：A 代表良好、B 代表待加強、C 代表異常。
                          </p>
                        </div>

                        <div className="grid grid-cols-3 gap-2 sm:flex">
                          {SCORE_OPTIONS.map((option) => {
                            const isSelected = value.score === option.score;
                            const selectedBg =
                              option.score === 3
                                ? "bg-nb-green text-nb-ink"
                                : option.score === 2
                                  ? "bg-nb-yellow text-nb-ink"
                                  : "bg-nb-red text-white";
                            return (
                              <button
                                key={option.score}
                                type="button"
                                data-testid={`inspection-score-${item.id}-${option.score}`}
                                data-score={option.score}
                                onClick={() => setScore(item.id, option.score)}
                                className={`flex min-w-[72px] flex-col items-center justify-center px-3 py-2 border-[2.5px] border-nb-ink font-bold transition-all duration-100 hover:-translate-y-0.5 hover:shadow-nb-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none sm:px-4 ${
                                  isSelected ? `${selectedBg} shadow-nb-sm` : "bg-nb-paper text-nb-ink/70"
                                }`}
                              >
                                <span className="font-nbSerif text-base font-black">{option.grade}</span>
                                <span className="text-[11px] font-nbMono">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {showFollowup ? (
                        <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                          <div>
                            <label className="nb-label">備註</label>
                            <textarea
                              data-testid={`inspection-note-${item.id}`}
                              value={value.note}
                              onChange={(event) => setNote(item.id, event.target.value)}
                              placeholder="若為 B 或 C，請補充異常原因、現場觀察或後續處理方式。"
                              className="nb-textarea min-h-28"
                            />
                          </div>

                          <div className="nb-card-flat p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="font-nbSerif text-sm font-black text-nb-ink">巡店照片</p>
                                <p className="mt-1 text-xs leading-5 text-nb-ink/60">
                                  每題最多可附 {MAX_PHOTOS_PER_ITEM} 張照片，單次巡店最多 {MAX_PHOTOS_PER_INSPECTION} 張。上傳前會自動壓縮，避免檔案過大。
                                </p>
                              </div>
                              <label className="nb-btn w-full justify-center sm:w-auto cursor-pointer">
                                選擇照片
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

                            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              {itemPhotos.map((photo) => (
                                <div key={`${photo.fileName}_${photo.previewUrl}`} className="nb-card-flat overflow-hidden">
                                  <div className="relative aspect-square w-full border-b-[2.5px] border-nb-ink">
                                    <Image src={photo.previewUrl} alt={photo.fileName} fill unoptimized className="object-cover" />
                                  </div>
                                  <div className="grid gap-2 p-3">
                                    <button
                                      type="button"
                                      onClick={() => toggleStandardPhoto(item.id, photo.fileName)}
                                      className={photo.isStandard ? "nb-btn-xs bg-nb-yellow" : "nb-btn-xs"}
                                    >
                                      {photo.isStandard ? "標準照片" : "設成標準照"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => removePhoto(item.id, photo.fileName)}
                                      className="nb-btn-xs bg-nb-red text-white"
                                    >
                                      刪除
                                    </button>
                                  </div>
                                </div>
                              ))}

                              {itemPhotos.length === 0 ? (
                                <div className="col-span-2 nb-empty">
                                  目前尚未上傳照片。
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="nb-empty mt-4 bg-nb-paper/70">
                          {value.score === 3
                            ? "這題目前評為 A，暫時不需要補充備註與照片。"
                            : "若選 B 或 C，系統會自動展開備註與照片欄位。"}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : null}
          </section>
        );
      })}

      <section className="nb-card p-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="nb-card-flat bg-nb-bg2 p-4">
            <p className="nb-eyebrow">Menu QA</p>
            <h2 className="nb-h2 mt-1">餐點品質抽查記錄</h2>
            <p className="mt-2 text-sm text-nb-ink/70">巡店時可同步記錄內用與外帶餐點，並各自附上一張壓縮後的照片。</p>

            <div className="mt-5 grid gap-4">
              <div className="nb-card-flat p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="nb-label">內用餐點名稱</label>
                    <input
                      value={form.menuItems.dineInDishName}
                      onChange={(event) => setMenuField("dineInDishName", event.target.value)}
                      className="nb-input"
                    />
                  </div>
                  <div>
                    <label className="nb-label">內用重量（克）</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={form.menuItems.dineInPortionWeight}
                      onChange={(event) => setMenuField("dineInPortionWeight", event.target.value)}
                      placeholder="例如 285（只填數字）"
                      className="nb-input"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="nb-label">內用餐點觀察 / 製餐過程備註</label>
                  <textarea
                    value={form.menuItems.dineInObservationNote}
                    onChange={(event) => setMenuField("dineInObservationNote", event.target.value)}
                    placeholder="例如：外觀偏乾、色澤不均、製餐時湯匙落地。"
                    className="nb-textarea min-h-24"
                  />
                </div>

                <div className="mt-4 nb-card-flat border-dashed bg-nb-bg2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-nbSerif text-sm font-black text-nb-ink">內用餐點照片</p>
                      <p className="mt-1 text-xs text-nb-ink/60">上傳前會自動壓縮，只保留一張目前照片。</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={(element) => {
                          menuPhotoInputRefs.current.dine_in = element;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleMenuPhotoChange("dine_in", event.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => menuPhotoInputRefs.current.dine_in?.click()}
                        className="nb-btn text-xs"
                      >
                        上傳照片
                      </button>
                      {dineInPhotoPreview ? (
                        <button
                          type="button"
                          onClick={() => removeMenuPhoto("dine_in")}
                          className="nb-btn-red text-xs"
                        >
                          移除照片
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {dineInPhotoPreview ? (
                    <div className="mt-4 flex items-start gap-4">
                      <div className="relative h-24 w-24 overflow-hidden border-[2.5px] border-nb-ink bg-nb-paper">
                        <Image src={dineInPhotoPreview} alt="內用餐點照片預覽" fill unoptimized className="object-cover" />
                      </div>
                      <div className="text-sm text-nb-ink/65">
                        <p>{menuPhotos.dine_in ? "新照片已壓縮完成，送出後會一併上傳。" : "目前已附上餐點抽查照片。"}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="nb-card-flat p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="nb-label">外帶餐點名稱</label>
                    <input
                      value={form.menuItems.takeoutDishName}
                      onChange={(event) => setMenuField("takeoutDishName", event.target.value)}
                      className="nb-input"
                    />
                  </div>
                  <div>
                    <label className="nb-label">外帶重量（克）</label>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step="0.01"
                      value={form.menuItems.takeoutPortionWeight}
                      onChange={(event) => setMenuField("takeoutPortionWeight", event.target.value)}
                      placeholder="例如 260（只填數字）"
                      className="nb-input"
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="nb-label">外帶餐點觀察 / 製餐過程備註</label>
                  <textarea
                    value={form.menuItems.takeoutObservationNote}
                    onChange={(event) => setMenuField("takeoutObservationNote", event.target.value)}
                    placeholder="例如：包裝封口未貼穩、湯汁外漏、外觀偏油。"
                    className="nb-textarea min-h-24"
                  />
                </div>

                <div className="mt-4 nb-card-flat border-dashed bg-nb-bg2 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-nbSerif text-sm font-black text-nb-ink">外帶餐點照片</p>
                      <p className="mt-1 text-xs text-nb-ink/60">上傳前會自動壓縮，只保留一張目前照片。</p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={(element) => {
                          menuPhotoInputRefs.current.takeout = element;
                        }}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => handleMenuPhotoChange("takeout", event.target.files)}
                      />
                      <button
                        type="button"
                        onClick={() => menuPhotoInputRefs.current.takeout?.click()}
                        className="nb-btn text-xs"
                      >
                        上傳照片
                      </button>
                      {takeoutPhotoPreview ? (
                        <button
                          type="button"
                          onClick={() => removeMenuPhoto("takeout")}
                          className="nb-btn-red text-xs"
                        >
                          移除照片
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {takeoutPhotoPreview ? (
                    <div className="mt-4 flex items-start gap-4">
                      <div className="relative h-24 w-24 overflow-hidden border-[2.5px] border-nb-ink bg-nb-paper">
                        <Image src={takeoutPhotoPreview} alt="外帶餐點照片預覽" fill unoptimized className="object-cover" />
                      </div>
                      <div className="text-sm text-nb-ink/65">
                        <p>{menuPhotos.takeout ? "新照片已壓縮完成，送出後會一併上傳。" : "目前已附上餐點抽查照片。"}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="nb-card-flat bg-nb-bg2 p-4">
            <p className="nb-eyebrow">Field Notes</p>
            <h2 className="nb-h2 mt-1">巡店補充記錄</h2>
            <p className="mt-2 text-sm text-nb-ink/70">補充這次巡店需要追蹤的背景資訊、異常脈絡或後續提醒。</p>

            <textarea
              value={form.legacyNote}
              onChange={(event) => setForm((current) => ({ ...current, legacyNote: event.target.value }))}
              placeholder="例如：內用出餐速度偏慢、外帶包裝封口需再確認，或記錄現場特殊情況。"
              className="nb-textarea mt-4 min-h-48"
            />
          </div>
        </div>
      </section>
      {error ? (
        <div className="nb-card-flat border-nb-red bg-nb-red/10 px-4 py-3 text-sm font-bold text-nb-red">{error}</div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm font-bold text-nb-ink/65">
          目前還有 <span className="text-nb-red">{missingFocusCount}</span> 題標籤項目尚未評分。
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          data-testid="inspection-submit-button"
          disabled={isSaving || requiresStoreSelection}
          className="nb-btn-primary px-6 py-3 disabled:opacity-50"
        >
          {isSaving ? "送出中..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
