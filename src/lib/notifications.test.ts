import { describe, expect, it } from "vitest";

import { buildNotificationFeed } from "@/lib/notification-rules";

describe("buildNotificationFeed", () => {
  it("adds active interface update announcements to the notification feed", () => {
    const feed = buildNotificationFeed({
      inspections: [],
      pendingTasks: 0,
      releaseAnnouncements: [
        {
          id: "release-1",
          title: "巡店表單新增上週未通過標籤",
          summary: "店長打開巡店表單時，會看到上一筆巡店 B / C 的項目。",
          publishedOn: "2026-05-04",
          audience: "all",
          isActive: true,
        },
        {
          id: "release-2",
          title: "草稿公告不顯示",
          summary: "這則還沒發布。",
          publishedOn: "2026-05-05",
          audience: "all",
          isActive: false,
        },
      ],
    });

    const releaseItem = feed.items.find((item) => item.id === "release-release-1");

    expect(releaseItem).toMatchObject({
      level: "low",
      title: "系統更新：巡店表單新增上週未通過標籤",
      description: "店長打開巡店表單時，會看到上一筆巡店 B / C 的項目。",
      date: "2026-05-04",
      href: "/notifications#release-release-1",
    });
    expect(feed.items.some((item) => item.id === "release-release-2")).toBe(false);
  });

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
    expect(feed.items.some((item) => item.id === "inspection-1-report")).toBe(true);
  });
});
