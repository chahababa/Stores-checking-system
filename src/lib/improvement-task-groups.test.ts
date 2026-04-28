import { describe, expect, it } from "vitest";

import { groupImprovementTasksByStore } from "@/lib/improvement-task-groups";
import type { ImprovementTaskListItem } from "@/lib/inspection";

function task(overrides: Partial<ImprovementTaskListItem> & Pick<ImprovementTaskListItem, "id" | "status">): ImprovementTaskListItem {
  return {
    id: overrides.id,
    status: overrides.status,
    createdAt: overrides.createdAt ?? "2026-04-28T00:00:00.000Z",
    resolvedAt: overrides.resolvedAt ?? null,
    verifiedAt: overrides.verifiedAt ?? null,
    store: overrides.store ?? null,
    item: overrides.item ?? { id: `item-${overrides.id}`, name: `題目 ${overrides.id}` },
    score:
      overrides.score ??
      {
        id: `score-${overrides.id}`,
        value: 2,
        note: null,
        isFocusItem: false,
        tagTypes: [],
        inspectionId: `inspection-${overrides.id}`,
        inspectionDate: "2026-04-28",
      },
  };
}

describe("groupImprovementTasksByStore", () => {
  it("groups improvement tasks by store and keeps store groups sorted by store name", () => {
    const groups = groupImprovementTasksByStore([
      task({ id: "task-2", status: "resolved", store: { id: "store-b", name: "2 店" } }),
      task({ id: "task-1", status: "pending", store: { id: "store-a", name: "1 店" } }),
      task({ id: "task-3", status: "verified", store: { id: "store-a", name: "1 店" } }),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.storeName)).toEqual(["1 店", "2 店"]);
    expect(groups[0].tasks.map((entry) => entry.id)).toEqual(["task-1", "task-3"]);
    expect(groups[1].tasks.map((entry) => entry.id)).toEqual(["task-2"]);
  });

  it("summarizes status counts for each store group and keeps missing stores in a fallback group", () => {
    const groups = groupImprovementTasksByStore([
      task({ id: "task-1", status: "pending", store: { id: "store-a", name: "1 店" } }),
      task({ id: "task-2", status: "pending", store: { id: "store-a", name: "1 店" } }),
      task({ id: "task-3", status: "resolved", store: { id: "store-a", name: "1 店" } }),
      task({ id: "task-4", status: "superseded", store: null }),
    ]);

    expect(groups[0]).toMatchObject({
      storeId: "store-a",
      storeName: "1 店",
      total: 3,
      counts: {
        pending: 2,
        resolved: 1,
        verified: 0,
        superseded: 0,
      },
    });
    expect(groups[1]).toMatchObject({
      storeId: "unassigned",
      storeName: "未指定店別",
      total: 1,
      counts: {
        pending: 0,
        resolved: 0,
        verified: 0,
        superseded: 1,
      },
    });
  });
});
