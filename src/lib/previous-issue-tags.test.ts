import { describe, expect, it } from "vitest";

import { buildPreviousIssueMap, getPreviousIssueLabel } from "@/lib/previous-issue-tags";

const inspection = (
  date: string,
  scores: Array<{ item_id: string; score: number | null }>,
) => ({
  id: `inspection-${date}`,
  date,
  inspection_scores: scores,
});

describe("buildPreviousIssueMap", () => {
  it("flags B/C items from the latest previous inspection as last-week failures", () => {
    const result = buildPreviousIssueMap(
      [
        inspection("2026-05-01", [
          { item_id: "item-a", score: 2 },
          { item_id: "item-b", score: 1 },
          { item_id: "item-c", score: 3 },
        ]),
      ],
      "2026-05-08",
    );

    expect(result.get("item-a")).toEqual({ consecutiveWeeks: 1 });
    expect(result.get("item-b")).toEqual({ consecutiveWeeks: 1 });
    expect(result.has("item-c")).toBe(false);
  });

  it("keeps counting consecutive low-score weekly inspections", () => {
    const result = buildPreviousIssueMap(
      [
        inspection("2026-05-08", [{ item_id: "item-a", score: 2 }]),
        inspection("2026-05-01", [{ item_id: "item-a", score: 1 }]),
        inspection("2026-04-24", [{ item_id: "item-a", score: 2 }]),
        inspection("2026-04-17", [{ item_id: "item-a", score: 3 }]),
      ],
      "2026-05-15",
    );

    expect(result.get("item-a")).toEqual({ consecutiveWeeks: 3 });
  });

  it("does not flag items when the latest previous inspection passed with A", () => {
    const result = buildPreviousIssueMap(
      [
        inspection("2026-05-08", [{ item_id: "item-a", score: 3 }]),
        inspection("2026-05-01", [{ item_id: "item-a", score: 1 }]),
      ],
      "2026-05-15",
    );

    expect(result.has("item-a")).toBe(false);
  });
});

describe("getPreviousIssueLabel", () => {
  it("uses the requested 上週未通過 wording for first follow-up week", () => {
    expect(getPreviousIssueLabel(1)).toBe("上週未通過");
  });

  it("adds consecutive week context after repeated low scores", () => {
    expect(getPreviousIssueLabel(3)).toBe("上週未通過 · 連續低分 3 週");
  });
});
