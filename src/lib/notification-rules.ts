import { buildOverallInspectionGrade, type InspectionTagType } from "@/lib/grading";

export type NotificationLevel = "high" | "medium" | "low";

export type NotificationItem = {
  id: string;
  level: NotificationLevel;
  title: string;
  description: string;
  href?: string;
  date?: string | null;
  storeName?: string | null;
};

export type NotificationInspectionScore = {
  itemName: string;
  categoryName: string;
  score: 1 | 2 | 3;
  tagTypes: InspectionTagType[];
  consecutiveWeeks: number;
};

export type NotificationInspection = {
  id: string;
  date: string;
  timeSlot: string;
  storeName: string;
  scores: NotificationInspectionScore[];
};

function compareLevel(left: NotificationLevel, right: NotificationLevel) {
  const priority: Record<NotificationLevel, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return priority[left] - priority[right];
}

export function getNotificationLevelLabel(level: NotificationLevel) {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  return "低";
}

export function getNotificationTone(level: NotificationLevel) {
  if (level === "high") return "bg-danger/10 text-danger border-danger/20";
  if (level === "medium") return "bg-warm/10 text-warm border-warm/20";
  return "bg-soft text-ink/70 border-ink/10";
}

export function buildNotificationFeed(input: {
  inspections: NotificationInspection[];
  pendingTasks: number;
}) {
  const notifications: NotificationItem[] = [];
  const announcedStores = new Set<string>();

  for (const inspection of input.inspections) {
    const overallGrade = buildOverallInspectionGrade(
      inspection.scores.map((score) => ({
        categoryName: score.categoryName,
        score: score.score,
        tagTypes: score.tagTypes,
      })),
    );

    const criticalCs = inspection.scores.filter(
      (score) => score.score === 1 && score.tagTypes.includes("critical"),
    );
    if (criticalCs.length > 0) {
      notifications.push({
        id: `${inspection.id}-critical`,
        level: "high",
        title: "必查項目出現 C",
        description: `${inspection.storeName} 在 ${inspection.date} 的巡店中，有 ${criticalCs.length} 題必查項目落在 C。`,
        href: `/inspection/history/${inspection.id}`,
        date: inspection.date,
        storeName: inspection.storeName,
      });
    }

    const complaintCs = inspection.scores.filter(
      (score) => score.score === 1 && score.tagTypes.includes("complaint_watch"),
    );
    if (complaintCs.length > 0) {
      notifications.push({
        id: `${inspection.id}-complaint`,
        level: "high",
        title: "客訴項目出現 C",
        description: `${inspection.storeName} 在 ${inspection.date} 的巡店中，有 ${complaintCs.length} 題客訴項目落在 C。`,
        href: `/inspection/history/${inspection.id}`,
        date: inspection.date,
        storeName: inspection.storeName,
      });
    }

    if (overallGrade.finalGrade === "C") {
      notifications.push({
        id: `${inspection.id}-overall-c`,
        level: "high",
        title: "整體總評為 C",
        description: `${inspection.storeName} 在 ${inspection.date} 的巡店總評為 C，建議立即檢查低分原因與改善任務。`,
        href: `/inspection/history/${inspection.id}`,
        date: inspection.date,
        storeName: inspection.storeName,
      });
    }

    if (!announcedStores.has(inspection.storeName)) {
      announcedStores.add(inspection.storeName);
      notifications.push({
        id: `${inspection.id}-report`,
        level: overallGrade.finalGrade === "A" ? "low" : "medium",
        title: `${inspection.storeName} 的巡店報告已更新`,
        description: `${inspection.date} ${inspection.timeSlot} 的巡店結果已整理完成，目前總評為 ${overallGrade.finalGrade}，可以直接打開報告查看分類表現與待改善項目。`,
        href: `/inspection/history/${inspection.id}`,
        date: inspection.date,
        storeName: inspection.storeName,
      });
    }

    const monthlyAttentionIssues = inspection.scores.filter(
      (score) => score.score <= 2 && score.tagTypes.includes("monthly_attention"),
    );
    if (monthlyAttentionIssues.length > 0) {
      notifications.push({
        id: `${inspection.id}-monthly-attention`,
        level: "medium",
        title: "本月加強項目仍未達標",
        description: `${inspection.storeName} 在 ${inspection.date} 有 ${monthlyAttentionIssues.length} 題本月加強項目仍落在 B / C。`,
        href: `/inspection/history/${inspection.id}`,
        date: inspection.date,
        storeName: inspection.storeName,
      });
    }

    const consecutiveIssues = inspection.scores.filter((score) => score.consecutiveWeeks >= 2 && score.score <= 2);
    if (consecutiveIssues.length > 0) {
      notifications.push({
        id: `${inspection.id}-consecutive`,
        level: "medium",
        title: "連續低分題目需要追蹤",
        description: `${inspection.storeName} 在 ${inspection.date} 有 ${consecutiveIssues.length} 題已連續兩週以上落在 B / C。`,
        href: `/inspection/history/${inspection.id}`,
        date: inspection.date,
        storeName: inspection.storeName,
      });
    }
  }

  if (input.pendingTasks >= 3) {
    notifications.push({
      id: "pending-task-threshold",
      level: "medium",
      title: "待改善任務偏多",
      description: `目前仍有 ${input.pendingTasks} 項待改善任務，建議先檢查是否有長時間未結案的項目。`,
      href: "/inspection/improvements",
    });
  }

  if (input.inspections.length === 0) {
    notifications.push({
      id: "no-inspections",
      level: "low",
      title: "本月尚未有巡店資料",
      description: "目前還沒有本月巡店紀錄，建議先完成本月第一筆巡店。",
      href: "/inspection/new",
    });
  } else {
    notifications.push({
      id: "inspection-summary",
      level: "low",
      title: "本月巡店摘要",
      description: `本月已完成 ${input.inspections.length} 筆巡店，可持續追蹤最弱分類與待改善任務。`,
      href: "/inspection/history",
      date: input.inspections[0]?.date ?? null,
    });
  }

  notifications.sort((left, right) => {
    const levelCompare = compareLevel(left.level, right.level);
    if (levelCompare !== 0) return levelCompare;
    return (right.date ?? "").localeCompare(left.date ?? "");
  });

  return {
    items: notifications,
    counts: {
      high: notifications.filter((item) => item.level === "high").length,
      medium: notifications.filter((item) => item.level === "medium").length,
      low: notifications.filter((item) => item.level === "low").length,
    },
  };
}
