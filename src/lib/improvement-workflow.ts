import type { UserRole } from "@/lib/auth";

export type ImprovementStatus = "pending" | "resolved" | "verified" | "superseded";

export type NotionRichText = {
  text: {
    content: string;
  };
};

export type NotionImprovementTaskProperties = {
  項目: { title: NotionRichText[] };
  狀態: { status: { name: string } };
  店別?: { multi_select: Array<{ name: string }> };
  類型?: { multi_select: Array<{ name: string }> };
  deadline?: { date: { start: string } };
  備註?: { rich_text: NotionRichText[] };
  已勾選: { checkbox: boolean };
};

export type NotionImprovementTaskSyncInput = {
  title: string;
  status: ImprovementStatus;
  storeName: string;
  typeName: string;
  deadline: string;
  note: string;
};

export function getImprovementStatusLabel(status: ImprovementStatus) {
  if (status === "pending") return "待改善";
  if (status === "resolved") return "待區經理確認";
  if (status === "verified") return "已確認";
  return "已替代";
}

export function getNotionImprovementStatusName(status: ImprovementStatus) {
  if (status === "pending") return process.env.NOTION_IMPROVEMENT_STATUS_PENDING || "未開始";
  if (status === "resolved") return process.env.NOTION_IMPROVEMENT_STATUS_RESOLVED || "進行中";
  if (status === "verified") return process.env.NOTION_IMPROVEMENT_STATUS_VERIFIED || "完成";
  return process.env.NOTION_IMPROVEMENT_STATUS_SUPERSEDED || "完成";
}

export function canTransitionImprovementTaskStatus(params: {
  role: UserRole;
  profileStoreId: string | null;
  taskStoreId: string | null;
  currentStatus: ImprovementStatus;
  nextStatus: ImprovementStatus;
}) {
  const { role, profileStoreId, taskStoreId, currentStatus, nextStatus } = params;

  if (role === "owner" || role === "manager") {
    return true;
  }

  if (role !== "leader") {
    return false;
  }

  return Boolean(
    profileStoreId &&
      taskStoreId &&
      profileStoreId === taskStoreId &&
      currentStatus === "pending" &&
      nextStatus === "resolved",
  );
}

function richText(content: string): NotionRichText[] {
  const trimmed = content.trim();
  return trimmed ? [{ text: { content: trimmed } }] : [];
}


function scoreLabel(scoreValue: 1 | 2 | 3) {
  if (scoreValue === 3) return "A";
  if (scoreValue === 2) return "B";
  return "C";
}

function addDays(dateText: string, days: number) {
  const date = new Date(`${dateText}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    return dateText;
  }
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function buildNotionImprovementTaskSyncInput(input: {
  status: ImprovementStatus;
  storeName: string;
  itemName: string;
  scoreValue: 1 | 2 | 3;
  scoreNote?: string | null;
  inspectionDate: string;
}): NotionImprovementTaskSyncInput {
  const noteLines = [
    `巡店日期：${input.inspectionDate}`,
    `店別：${input.storeName}`,
    `檢查項目：${input.itemName}`,
    `分數：${scoreLabel(input.scoreValue)}`,
  ];

  const scoreNote = input.scoreNote?.trim();
  if (scoreNote) {
    noteLines.push(`改善說明：${scoreNote}`);
  }

  return {
    title: `【巡店改善】${input.storeName} - ${input.itemName}`,
    status: input.status,
    storeName: input.storeName,
    typeName: "巡店調整",
    deadline: addDays(input.inspectionDate, 7),
    note: noteLines.join("\n"),
  };
}

export function buildNotionImprovementTaskProperties(input: {
  title: string;
  status: ImprovementStatus;
  storeName?: string | null;
  typeName?: string | null;
  deadline?: string | null;
  note?: string | null;
}): NotionImprovementTaskProperties {
  const properties: NotionImprovementTaskProperties = {
    項目: { title: [{ text: { content: input.title } }] },
    狀態: { status: { name: getNotionImprovementStatusName(input.status) } },
    已勾選: { checkbox: input.status === "verified" },
  };

  if (input.storeName?.trim()) {
    properties.店別 = { multi_select: [{ name: input.storeName.trim() }] };
  }

  const typeName = input.typeName?.trim() || "巡店調整";
  properties.類型 = { multi_select: [{ name: typeName }] };

  if (input.deadline?.trim()) {
    properties.deadline = { date: { start: input.deadline.trim() } };
  }

  const note = richText(input.note ?? "");
  if (note.length > 0) {
    properties.備註 = { rich_text: note };
  }

  return properties;
}
