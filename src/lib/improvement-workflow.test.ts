import { describe, expect, it } from "vitest";

import {
  buildNotionImprovementTaskProperties,
  buildNotionImprovementTaskSyncInput,
  canTransitionImprovementTaskStatus,
  getImprovementStatusLabel,
} from "@/lib/improvement-workflow";

describe("improvement task workflow", () => {
  it("lets store leaders report their own pending task as resolved, but not verify it", () => {
    expect(
      canTransitionImprovementTaskStatus({
        role: "leader",
        profileStoreId: "store-1",
        taskStoreId: "store-1",
        currentStatus: "pending",
        nextStatus: "resolved",
      }),
    ).toBe(true);

    expect(
      canTransitionImprovementTaskStatus({
        role: "leader",
        profileStoreId: "store-1",
        taskStoreId: "store-1",
        currentStatus: "resolved",
        nextStatus: "verified",
      }),
    ).toBe(false);
  });

  it("does not let store leaders update tasks from another store", () => {
    expect(
      canTransitionImprovementTaskStatus({
        role: "leader",
        profileStoreId: "store-1",
        taskStoreId: "store-2",
        currentStatus: "pending",
        nextStatus: "resolved",
      }),
    ).toBe(false);
  });

  it("lets managers move a resolved task back to pending or verify it", () => {
    expect(
      canTransitionImprovementTaskStatus({
        role: "manager",
        profileStoreId: null,
        taskStoreId: "store-1",
        currentStatus: "resolved",
        nextStatus: "pending",
      }),
    ).toBe(true);

    expect(
      canTransitionImprovementTaskStatus({
        role: "manager",
        profileStoreId: null,
        taskStoreId: "store-1",
        currentStatus: "resolved",
        nextStatus: "verified",
      }),
    ).toBe(true);
  });

  it("labels resolved tasks as waiting for manager verification", () => {
    expect(getImprovementStatusLabel("pending")).toBe("待改善");
    expect(getImprovementStatusLabel("resolved")).toBe("待區經理確認");
    expect(getImprovementStatusLabel("verified")).toBe("已確認");
  });
});

describe("Notion improvement task payload", () => {
  it("maps a pending store task to the 各店待辦事項檢核 database fields", () => {
    const properties = buildNotionImprovementTaskProperties({
      title: "【巡店改善】一店 - 冰箱溫度紀錄",
      status: "pending",
      storeName: "一店",
      typeName: "巡店調整",
      deadline: "2026-05-11",
      note: "巡店日期：2026-05-04\n分數：B\n改善說明：未填寫溫度紀錄",
    });

    expect(properties).toMatchObject({
      項目: { title: [{ text: { content: "【巡店改善】一店 - 冰箱溫度紀錄" } }] },
      狀態: { status: { name: "未開始" } },
      店別: { multi_select: [{ name: "一店" }] },
      類型: { multi_select: [{ name: "巡店調整" }] },
      deadline: { date: { start: "2026-05-11" } },
      備註: { rich_text: [{ text: { content: "巡店日期：2026-05-04\n分數：B\n改善說明：未填寫溫度紀錄" } }] },
      已勾選: { checkbox: false },
    });
  });

  it("keeps manager verification separate from store leader resolution in Notion", () => {
    expect(
      buildNotionImprovementTaskProperties({
        title: "【巡店改善】一店 - 冰箱溫度紀錄",
        status: "resolved",
        storeName: "一店",
        note: "店長已改善，等待區經理確認。",
      }).狀態,
    ).toEqual({ status: { name: "進行中" } });

    expect(
      buildNotionImprovementTaskProperties({
        title: "【巡店改善】一店 - 冰箱溫度紀錄",
        status: "verified",
        storeName: "一店",
        note: "區經理已確認。",
      }).已勾選,
    ).toEqual({ checkbox: true });
  });
});


describe("Notion improvement task sync input", () => {
  it("builds a stable title, deadline, and note from a Supabase improvement task", () => {
    expect(
      buildNotionImprovementTaskSyncInput({
        status: "resolved",
        storeName: "一店",
        itemName: "冰箱溫度紀錄",
        scoreValue: 2,
        scoreNote: "未填寫溫度紀錄",
        inspectionDate: "2026-05-04",
      }),
    ).toEqual({
      title: "【巡店改善】一店 - 冰箱溫度紀錄",
      status: "resolved",
      storeName: "一店",
      typeName: "巡店調整",
      deadline: "2026-05-11",
      note: "巡店日期：2026-05-04\n店別：一店\n檢查項目：冰箱溫度紀錄\n分數：B\n改善說明：未填寫溫度紀錄",
    });
  });
});
