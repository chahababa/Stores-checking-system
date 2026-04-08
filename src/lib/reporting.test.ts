import { describe, expect, it } from "vitest";

import { buildMonthlyInspectionReportStats, csvEscape, getBarWidthPercent, getMonthRange } from "@/lib/reporting";
import { formatMonthValue } from "@/lib/utils";

describe("reporting helpers", () => {
  it("escapes csv fields with commas, quotes, and new lines", () => {
    expect(csvEscape("simple")).toBe("simple");
    expect(csvEscape('a,"b"')).toBe('"a,""b"""');
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
  });

  it("builds month boundaries", () => {
    expect(getMonthRange("2026-04")).toEqual({
      start: "2026-04-01",
      end: "2026-05-01",
    });
  });

  it("returns stable bar widths", () => {
    expect(getBarWidthPercent(0, 0)).toBe("0%");
    expect(getBarWidthPercent(1, 10)).toBe("10%");
    expect(getBarWidthPercent(1, 50)).toBe("8%");
  });

  it("formats month fallback", () => {
    expect(formatMonthValue("2026-04")).toBe("2026-04");
    expect(formatMonthValue(null)).toMatch(/^\d{4}-\d{2}$/);
  });

  it("aggregates monthly report stats", () => {
    const stats = buildMonthlyInspectionReportStats({
      inspections: [
        { id: "i1", storeId: "s1", storeName: "Store A", totalScore: 2.1 },
        { id: "i2", storeId: "s1", storeName: "Store A", totalScore: 2.8 },
        { id: "i3", storeId: "s2", storeName: "Store B", totalScore: 3.0 },
      ],
      lowScores: [
        { itemId: "item-1", itemName: "Clean Counter", score: 1, inspectionId: "i1" },
        { itemId: "item-1", itemName: "Clean Counter", score: 2, inspectionId: "i2" },
        { itemId: "item-2", itemName: "Oil Check", score: 2, inspectionId: "i1" },
      ],
      relatedTasks: [{ status: "pending" }, { status: "verified" }, { status: "pending" }],
    });

    expect(stats.summary).toEqual({
      totalInspections: 3,
      averageScore: "2.63",
      lowScoreCount: 3,
      storesCovered: 2,
      pendingTasks: 2,
      verifiedTasks: 1,
    });
    expect(stats.topProblemItems[0]).toEqual({
      itemId: "item-1",
      itemName: "Clean Counter",
      occurrences: 2,
      averageScore: "1.50",
    });
    expect(stats.storeBreakdown).toEqual([
      {
        storeId: "s1",
        storeName: "Store A",
        inspections: 2,
        averageScore: "2.45",
        lowScoreCount: 3,
      },
      {
        storeId: "s2",
        storeName: "Store B",
        inspections: 1,
        averageScore: "3.00",
        lowScoreCount: 0,
      },
    ]);
  });
});
