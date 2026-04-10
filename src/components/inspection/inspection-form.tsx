"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { compressImage } from "@/lib/image";
import type { InspectionFormSeed } from "@/lib/inspection";

type ScoreValue = 1 | 2 | 3;
type ShiftRole = "kitchen" | "floor" | "counter";

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
  selectedStaff: Record<string, ShiftRole>;
  scores: Record<
    string,
    {
      score: ScoreValue | null;
      note: string;
      isFocusItem: boolean;
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

function roleLabel(role: ShiftRole) {
  if (role === "kitchen") return "內場";
  if (role === "floor") return "外場";
  return "櫃台";
}

export function InspectionForm({
  seed,
  saveAction,
  initialState,
  submitLabel = "儲存巡店紀錄",
  isEditMode = false,
}: {
  seed: InspectionFormSeed;
  saveAction: (payload: {
    storeId: string;
    date: string;
    timeSlot: string;
    busynessLevel: "low" | "medium" | "high";
    selectedStaff: Array<{ staffId: string; roleInShift: ShiftRole }>;
    scores: Array<{
      itemId: string;
      score: ScoreValue;
      note?: string;
      isFocusItem: boolean;
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
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const draftKey = useMemo(() => `draft_${form.storeId}_${form.date}`, [form.storeId, form.date]);

  useEffect(() => {
    const freshState = initialState ?? createInitialState(seed);
    setForm(freshState);
    setPhotos({});

    if (isEditMode) {
      return;
    }

    const existingDraft = localStorage.getItem(`draft_${seed.selectedStoreId}_${seed.selectedDate}`);
    if (existingDraft && !seed.duplicateInspectionWarning) {
      const shouldLoad = window.confirm("找到這間店在同一天的本機草稿，要不要還原？");
      if (shouldLoad) {
        try {
          setForm(JSON.parse(existingDraft) as InspectionFormDraftState);
        } catch {
          localStorage.removeItem(`draft_${seed.selectedStoreId}_${seed.selectedDate}`);
        }
      }
    }
  }, [initialState, isEditMode, seed]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      localStorage.setItem(draftKey, JSON.stringify(form));
    }, 30000);

    return () => window.clearInterval(timer);
  }, [draftKey, form]);

  const missingFocusCount = Object.values(form.scores).filter((score) => score.isFocusItem && score.score === null)
    .length;
  const totalItemCount = seed.groupedItems.reduce((sum, group) => sum + group.items.length, 0);
  const scoredItemCount = Object.values(form.scores).filter((value) => value.score !== null).length;

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

  function assignStaff(staffId: string, role: ShiftRole, checked: boolean) {
    setForm((current) => {
      const next = { ...current.selectedStaff };
      if (checked) {
        next[staffId] = role;
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
      setError(uploadError instanceof Error ? uploadError.message : "圖片處理失敗。");
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

    if (!form.timeSlot.trim()) {
      setError("請先輸入巡店時段。");
      return;
    }

    if (missingFocusCount > 0) {
      setError(`還有 ${missingFocusCount} 個重點項目尚未評分。`);
      return;
    }

    const invalidNotes = Object.values(form.scores).find(
      (value) => value.score !== null && value.score <= 2 && !value.note.trim(),
    );
    if (invalidNotes) {
      setError("評分為 1 或 2 時，必須填寫說明。");
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
          roleInShift,
        })),
        scores: Object.entries(form.scores)
          .filter(([, value]) => value.score !== null)
          .map(([itemId, value]) => ({
            itemId,
            score: value.score as ScoreValue,
            note: value.note,
            isFocusItem: value.isFocusItem,
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

      localStorage.removeItem(draftKey);
      if (result.success) {
        router.push("/inspection/history");
      }
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "儲存巡店紀錄失敗。");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-5 shadow-card">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-2 block text-sm text-ink/70">店別</label>
            <select
              value={form.storeId}
              onChange={(event) => router.push(`/inspection/new?store=${event.target.value}&date=${form.date}`)}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            >
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
              type="date"
              value={form.date}
              onChange={(event) => router.push(`/inspection/new?store=${form.storeId}&date=${event.target.value}`)}
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-ink/70">巡店時段</label>
            <input
              value={form.timeSlot}
              onChange={(event) => setForm((current) => ({ ...current, timeSlot: event.target.value }))}
              placeholder="例如：14:30-15:15"
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-ink/70">忙碌程度</label>
            <select
              value={form.busynessLevel}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  busynessLevel: event.target.value as InspectionFormDraftState["busynessLevel"],
                }))
              }
              className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            >
              <option value="low">不忙</option>
              <option value="medium">普通</option>
              <option value="high">繁忙</option>
            </select>
          </div>
        </div>

        {!isEditMode && seed.duplicateInspectionWarning && (
          <div className="mt-4 rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            這間店在同一天已經有巡店紀錄，若要再新增一筆，請先確認是否真的需要重複建立。
          </div>
        )}

        <p className="mt-4 text-xs leading-6 text-ink/60">
          {isEditMode
            ? "編輯模式會保留原本的巡店紀錄，也可以再補傳新照片，不會刪掉既有照片。"
            : "草稿會每 30 秒自動儲存一次，以同店別與同日期為單位。照片檔案不會存進瀏覽器草稿。"}
        </p>
      </section>

      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-serifTc text-2xl font-semibold">當班人員</h2>
            <p className="mt-2 text-sm text-ink/70">勾選這次巡店時在班的人員。</p>
          </div>
          <div className="rounded-full bg-soft px-4 py-2 text-sm text-ink/70">
            已選 {Object.keys(form.selectedStaff).length} 人
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {seed.activeStaff.map((staff) => {
            const checked = Boolean(form.selectedStaff[staff.id]);

            return (
              <label
                key={staff.id}
                className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white px-4 py-3"
              >
                <div>
                  <p className="font-medium text-ink">{staff.name}</p>
                  <p className="text-sm text-ink/60">{roleLabel(staff.position)}</p>
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(event) => assignStaff(staff.id, staff.position, event.target.checked)}
                  className="h-5 w-5 rounded border-ink/30 text-warm focus:ring-warm"
                />
              </label>
            );
          })}

          {seed.activeStaff.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
              這間店目前還沒有可選的在職組員。
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-5 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serifTc text-2xl font-semibold">批次評分</h2>
            <p className="mt-2 text-sm text-ink/70">
              已填 {scoredItemCount} / {totalItemCount} 題。建議先全部設為 3 分，再微調少數例外項目。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyBulkScore(3)}
              className="rounded-full bg-warm px-4 py-2 text-sm text-white"
            >
              全部設為 3 分
            </button>
            <button
              type="button"
              onClick={resetScoresToDefault}
              className="rounded-full bg-soft px-4 py-2 text-sm text-ink/75"
            >
              重設評分
            </button>
          </div>
        </div>
      </section>

      {seed.groupedItems.map((group) => (
        <section key={group.categoryId} className="rounded-[28px] border border-ink/10 bg-white/85 p-5 shadow-card">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">分類</p>
              <h2 className="mt-2 font-serifTc text-2xl font-semibold">{group.categoryName}</h2>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            {group.items.map((item) => {
              const value = form.scores[item.id];
              const itemPhotos = photos[item.id] ?? [];

              return (
                <article key={item.id} className="rounded-[24px] border border-ink/10 bg-white p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium text-ink">{item.name}</h3>
                        {value.isFocusItem && (
                          <span className="rounded-full bg-warm px-3 py-1 text-xs font-medium text-white">
                            重點項目
                          </span>
                        )}
                        {value.hasPrevIssue && (
                          <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
                            上次扣分項，已連續 {value.consecutiveWeeks} 週
                          </span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-ink/65">
                        評分為 1 或 2 時必須填寫說明；評分為 3 時可視需要標記為標準照片。
                      </p>
                    </div>

                    <div className="flex gap-2">
                      {[1, 2, 3].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setScore(item.id, score as ScoreValue)}
                          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                            value.score === score
                              ? "bg-warm text-white"
                              : "border border-ink/10 bg-soft text-ink/70 hover:bg-cream"
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
                        value={value.note}
                        onChange={(event) => setNote(item.id, event.target.value)}
                        placeholder="未達標時請補充說明。"
                        className="min-h-28 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                      />
                    </div>

                    <div className="rounded-2xl border border-dashed border-ink/15 bg-soft/40 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-ink">照片</p>
                          <p className="mt-1 text-xs leading-5 text-ink/60">
                            照片上傳前會先壓縮。表現良好的範例可標記成標準照片。
                          </p>
                        </div>
                        <label className="rounded-full bg-white px-4 py-2 text-sm text-ink shadow-sm">
                          新增
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
                          <div key={`${photo.fileName}_${photo.previewUrl}`} className="overflow-hidden rounded-2xl bg-white">
                            <div className="relative aspect-square w-full">
                              <Image
                                src={photo.previewUrl}
                                alt={photo.fileName}
                                fill
                                unoptimized
                                className="object-cover"
                              />
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
                                移除
                              </button>
                            </div>
                          </div>
                        ))}

                        {itemPhotos.length === 0 && (
                          <div className="col-span-2 rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/55">
                            尚未新增照片。
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}

      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-5 shadow-card">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[24px] border border-ink/10 bg-white p-4">
            <h2 className="font-serifTc text-2xl font-semibold">餐點品質抽查</h2>
            <p className="mt-2 text-sm text-ink/70">記錄這次巡店抽查的餐點品項與克重。</p>

            <div className="mt-5 grid gap-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-ink/70">內用品項</label>
                  <input
                    value={form.menuItems.dineInDishName}
                    onChange={(event) => setMenuField("dineInDishName", event.target.value)}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-ink/70">內用克重</label>
                  <input
                    value={form.menuItems.dineInPortionWeight}
                    onChange={(event) => setMenuField("dineInPortionWeight", event.target.value)}
                    placeholder="例如：285g"
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-ink/70">外帶品項</label>
                  <input
                    value={form.menuItems.takeoutDishName}
                    onChange={(event) => setMenuField("takeoutDishName", event.target.value)}
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-ink/70">外帶克重</label>
                  <input
                    value={form.menuItems.takeoutPortionWeight}
                    onChange={(event) => setMenuField("takeoutPortionWeight", event.target.value)}
                    placeholder="例如：260g"
                    className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-ink/10 bg-white p-4">
            <h2 className="font-serifTc text-2xl font-semibold">補充說明</h2>
            <p className="mt-2 text-sm text-ink/70">記錄不屬於單一題目的整體補充內容。</p>

            <textarea
              value={form.legacyNote}
              onChange={(event) => setForm((current) => ({ ...current, legacyNote: event.target.value }))}
              placeholder="可填寫本次巡店的補充說明、追蹤事項或其他情境。"
              className="mt-4 min-h-48 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3"
            />
          </div>
        </div>
      </section>

      {error && <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</div>}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink/65">
          尚未評分的重點項目：<span className="font-medium text-danger">{missingFocusCount}</span>
        </p>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSaving}
          className="rounded-full bg-warm px-6 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "儲存中..." : submitLabel}
        </button>
      </div>
    </div>
  );
}
