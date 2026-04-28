import type { ImprovementTaskListItem } from "@/lib/inspection";

export type ImprovementTaskStoreGroup = {
  storeId: string;
  storeName: string;
  total: number;
  counts: Record<ImprovementTaskListItem["status"], number>;
  tasks: ImprovementTaskListItem[];
};

const EMPTY_COUNTS: Record<ImprovementTaskListItem["status"], number> = {
  pending: 0,
  resolved: 0,
  verified: 0,
  superseded: 0,
};

export function groupImprovementTasksByStore(tasks: ImprovementTaskListItem[]): ImprovementTaskStoreGroup[] {
  const groups = new Map<string, ImprovementTaskStoreGroup>();

  for (const task of tasks) {
    const storeId = task.store?.id ?? "unassigned";
    const storeName = task.store?.name ?? "未指定店別";

    const existing = groups.get(storeId);
    const group =
      existing ??
      {
        storeId,
        storeName,
        total: 0,
        counts: { ...EMPTY_COUNTS },
        tasks: [],
      };

    group.total += 1;
    group.counts[task.status] += 1;
    group.tasks.push(task);
    groups.set(storeId, group);
  }

  return Array.from(groups.values()).sort((a, b) => {
    if (a.storeId === "unassigned") return 1;
    if (b.storeId === "unassigned") return -1;
    return a.storeName.localeCompare(b.storeName, "zh-Hant-u-kn-true");
  });
}
