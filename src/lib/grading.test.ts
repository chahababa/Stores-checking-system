import { describe, expect, it } from "vitest";

import {
  buildCategoryGrades,
  buildOverallInspectionGrade,
  buildTagIssueCounts,
  downgradeGrade,
  getAverageGrade,
  getScoreGrade,
} from "@/lib/grading";

describe("grading helpers", () => {
  it("maps single scores to grades", () => {
    expect(getScoreGrade(3)).toBe("A");
    expect(getScoreGrade(2)).toBe("B");
    expect(getScoreGrade(1)).toBe("C");
  });

  it("maps average values to grades", () => {
    expect(getAverageGrade(2.7)).toBe("A");
    expect(getAverageGrade(1.8)).toBe("B");
    expect(getAverageGrade(1.2)).toBe("C");
  });

  it("builds category grade summaries", () => {
    const categories = buildCategoryGrades([
      { categoryName: "人員管理", score: 3 },
      { categoryName: "人員管理", score: 2 },
      { categoryName: "內場作業", score: 1 },
    ]);

    expect(categories).toEqual([
      {
        categoryName: "人員管理",
        averageScore: 2.5,
        grade: "A",
        itemCount: 2,
        counts: { a: 1, b: 1, c: 0 },
      },
      {
        categoryName: "內場作業",
        averageScore: 1,
        grade: "C",
        itemCount: 1,
        counts: { a: 0, b: 0, c: 1 },
      },
    ]);
  });

  it("downgrades grades safely", () => {
    expect(downgradeGrade("A")).toBe("B");
    expect(downgradeGrade("A", 2)).toBe("C");
    expect(downgradeGrade("C")).toBe("C");
  });

  it("counts low-score issues by tag type", () => {
    const result = buildTagIssueCounts([
      { categoryName: "人員管理", score: 3, tagTypes: ["critical"] },
      { categoryName: "人員管理", score: 2, tagTypes: ["critical", "monthly_attention"] },
      { categoryName: "服務品質", score: 1, tagTypes: ["complaint_watch"] },
      { categoryName: "服務品質", score: 2, tagTypes: ["complaint_watch", "monthly_attention"] },
    ]);

    expect(result).toEqual({
      critical: 1,
      monthlyAttention: 2,
      complaintWatch: 2,
    });
  });

  it("applies tag-based overall grade adjustments", () => {
    const result = buildOverallInspectionGrade([
      { categoryName: "人員管理", score: 3, tagTypes: ["critical"] },
      { categoryName: "內場作業", score: 1, tagTypes: ["critical"] },
      { categoryName: "服務品質", score: 2, tagTypes: ["complaint_watch"] },
      { categoryName: "外場作業", score: 3, tagTypes: [] },
    ]);

    expect(result.baseGrade).toBe("B");
    expect(result.finalGrade).toBe("C");
    expect(result.adjustments.length).toBeGreaterThan(0);
  });
});
