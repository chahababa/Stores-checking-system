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

  it("aggregates monthly report stats with grades", () => {
    const stats = buildMonthlyInspectionReportStats({
      inspections: [
        {
          id: "i1",
          storeId: "s1",
          storeName: "Store A",
          totalScore: 2.1,
          scores: [
            { categoryName: "People", score: 3 },
            { categoryName: "Kitchen", score: 2, tagTypes: ["critical"] },
            { categoryName: "Kitchen", score: 1, tagTypes: ["complaint_watch"] },
          ],
        },
        {
          id: "i2",
          storeId: "s1",
          storeName: "Store A",
          totalScore: 2.8,
          scores: [
            { categoryName: "People", score: 3 },
            { categoryName: "Kitchen", score: 2, tagTypes: ["monthly_attention"] },
            { categoryName: "Service", score: 3 },
          ],
        },
        {
          id: "i3",
          storeId: "s2",
          storeName: "Store B",
          totalScore: 3.0,
          scores: [
            { categoryName: "People", score: 3 },
            { categoryName: "Kitchen", score: 3 },
          ],
        },
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
      overallGrade: "B",
      gradeCounts: { a: 5, b: 2, c: 1 },
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
      averageGrade: "B",
    });
    expect(stats.categoryBreakdown).toEqual([
      {
        categoryName: "Kitchen",
        averageScore: "2.00",
        grade: "B",
        itemCount: 4,
        attentionCount: 3,
        counts: { a: 1, b: 2, c: 1 },
      },
      {
        categoryName: "People",
        averageScore: "3.00",
        grade: "A",
        itemCount: 3,
        attentionCount: 0,
        counts: { a: 3, b: 0, c: 0 },
      },
      {
        categoryName: "Service",
        averageScore: "3.00",
        grade: "A",
        itemCount: 1,
        attentionCount: 0,
        counts: { a: 1, b: 0, c: 0 },
      },
    ]);
    expect(stats.storeBreakdown).toEqual([
      {
        storeId: "s1",
        storeName: "Store A",
        inspections: 2,
        averageScore: "2.45",
        overallGrade: "C",
        lowScoreCount: 3,
      },
      {
        storeId: "s2",
        storeName: "Store B",
        inspections: 1,
        averageScore: "3.00",
        overallGrade: "A",
        lowScoreCount: 0,
      },
    ]);
  });
});
