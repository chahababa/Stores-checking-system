export type MonthlyInspectionReportSummary = {
  totalInspections: number;
  averageScore: string;
  lowScoreCount: number;
  storesCovered: number;
  pendingTasks: number;
  verifiedTasks: number;
};

export type ProblemItemStat = {
  itemId: string;
  itemName: string;
  occurrences: number;
  averageScore: string;
};

export type StoreBreakdownStat = {
  storeId: string;
  storeName: string;
  inspections: number;
  averageScore: string;
  lowScoreCount: number;
};

export function csvEscape(value: string | number | boolean) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export function getMonthRange(month: string) {
  const [yearValue, monthValue] = month.split("-").map(Number);
  const start = new Date(Date.UTC(yearValue, monthValue - 1, 1));
  const end = new Date(Date.UTC(yearValue, monthValue, 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export function getBarWidthPercent(value: number, max: number) {
  if (max <= 0) return "0%";
  return `${Math.max(8, Math.round((value / max) * 100))}%`;
}

export function buildMonthlyInspectionReportStats(input: {
  inspections: Array<{
    id: string;
    storeId: string;
    storeName: string;
    totalScore: number;
  }>;
  lowScores: Array<{
    itemId: string;
    itemName: string;
    score: number;
    inspectionId: string;
  }>;
  relatedTasks: Array<{
    status: "pending" | "resolved" | "verified" | "superseded";
  }>;
}) {
  const totalInspections = input.inspections.length;
  const averageScore =
    totalInspections > 0
      ? (input.inspections.reduce((sum, inspection) => sum + inspection.totalScore, 0) / totalInspections).toFixed(2)
      : "0.00";

  const itemStats = new Map<string, { itemId: string; itemName: string; occurrences: number; scoreSum: number }>();
  for (const row of input.lowScores) {
    const current = itemStats.get(row.itemId) ?? {
      itemId: row.itemId,
      itemName: row.itemName,
      occurrences: 0,
      scoreSum: 0,
    };
    current.occurrences += 1;
    current.scoreSum += row.score;
    itemStats.set(row.itemId, current);
  }

  const storeStats = new Map<
    string,
    { storeId: string; storeName: string; inspections: number; scoreSum: number; lowScoreCount: number }
  >();
  for (const inspection of input.inspections) {
    const current = storeStats.get(inspection.storeId) ?? {
      storeId: inspection.storeId,
      storeName: inspection.storeName,
      inspections: 0,
      scoreSum: 0,
      lowScoreCount: 0,
    };
    current.inspections += 1;
    current.scoreSum += inspection.totalScore;
    storeStats.set(inspection.storeId, current);
  }

  for (const row of input.lowScores) {
    const inspection = input.inspections.find((entry) => entry.id === row.inspectionId);
    if (!inspection) continue;
    const current = storeStats.get(inspection.storeId);
    if (!current) continue;
    current.lowScoreCount += 1;
  }

  const summary: MonthlyInspectionReportSummary = {
    totalInspections,
    averageScore,
    lowScoreCount: input.lowScores.length,
    storesCovered: new Set(input.inspections.map((inspection) => inspection.storeId)).size,
    pendingTasks: input.relatedTasks.filter((task) => task.status === "pending").length,
    verifiedTasks: input.relatedTasks.filter((task) => task.status === "verified").length,
  };

  const topProblemItems: ProblemItemStat[] = [...itemStats.values()]
    .sort((a, b) => b.occurrences - a.occurrences || a.itemName.localeCompare(b.itemName))
    .slice(0, 8)
    .map((item) => ({
      itemId: item.itemId,
      itemName: item.itemName,
      occurrences: item.occurrences,
      averageScore: (item.scoreSum / item.occurrences).toFixed(2),
    }));

  const storeBreakdown: StoreBreakdownStat[] = [...storeStats.values()]
    .sort((a, b) => a.storeName.localeCompare(b.storeName))
    .map((store) => ({
      storeId: store.storeId,
      storeName: store.storeName,
      inspections: store.inspections,
      averageScore: (store.scoreSum / Math.max(store.inspections, 1)).toFixed(2),
      lowScoreCount: store.lowScoreCount,
    }));

  return {
    summary,
    topProblemItems,
    storeBreakdown,
  };
}
