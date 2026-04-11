import { describe, expect, it } from "vitest";

import { buildNotificationFeed } from "@/lib/notification-rules";

describe("buildNotificationFeed", () => {
  it("creates high and medium priority notifications from tagged low scores", () => {
    const feed = buildNotificationFeed({
      inspections: [
        {
          id: "inspection-1",
          date: "2026-04-12",
          timeSlot: "午班",
          storeName: "1店",
          scores: [
            {
              itemName: "炸油管理",
              categoryName: "內場作業環境",
              score: 1,
              tagTypes: ["critical"],
              consecutiveWeeks: 0,
            },
            {
              itemName: "客訴回應",
              categoryName: "服務品質",
              score: 1,
              tagTypes: ["complaint_watch"],
              consecutiveWeeks: 2,
            },
            {
              itemName: "本月加強項",
              categoryName: "人員管理",
              score: 2,
              tagTypes: ["monthly_attention"],
              consecutiveWeeks: 0,
            },
          ],
        },
      ],
      pendingTasks: 4,
    });

    expect(feed.counts.high).toBeGreaterThanOrEqual(2);
    expect(feed.counts.medium).toBeGreaterThanOrEqual(2);
    expect(feed.items[0]?.level).toBe("high");
  });
});
