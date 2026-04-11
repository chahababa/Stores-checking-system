import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getInspectionDetail } from "@/lib/inspection";
import { getBusynessLabel, getShiftRoleLabel } from "@/lib/ui-labels";

function csvEscape(value: string | number | boolean) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

type RouteParams = Promise<{ id: string }>;

export async function GET(_: Request, context: { params: RouteParams }) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "尚未登入" }, { status: 401 });
  }

  const { id } = await context.params;
  const detail = await getInspectionDetail(id);

  const lines = [
    "巡店明細",
    "欄位,值",
    `店別,${csvEscape(detail.store?.name ?? "-")}`,
    `日期,${csvEscape(detail.date)}`,
    `時段,${csvEscape(detail.timeSlot)}`,
    `忙碌程度,${csvEscape(getBusynessLabel(detail.busynessLevel))}`,
    `平均分數,${csvEscape(detail.totalScore)}`,
    `巡店人,${csvEscape(detail.inspector?.name ?? detail.inspector?.email ?? "-")}`,
    "",
    "評分項目",
    "分類,題目,分數,是否重點,是否延續問題,連續低分週數,備註",
    ...detail.scores.map(
      (row) =>
        `${csvEscape(row.categoryName)},${csvEscape(row.itemName)},${csvEscape(row.score)},${csvEscape(row.isFocusItem)},${csvEscape(row.hasPrevIssue)},${csvEscape(row.consecutiveWeeks)},${csvEscape(row.note ?? "")}`,
    ),
    "",
    "當班人員",
    "姓名,當班工作站,區域分類",
    ...detail.staff.map(
      (member) =>
        `${csvEscape(member.name)},${csvEscape(member.workstationName)},${csvEscape(getShiftRoleLabel(member.workstationArea))}`,
    ),
    "",
    "餐點抽查",
    "類型,品項,重量",
    ...detail.menuItems.map(
      (item) =>
        `${csvEscape(item.type === "dine_in" ? "內用" : "外帶")},${csvEscape(item.dishName ?? "")},${csvEscape(item.portionWeight ?? "")}`,
    ),
    "",
    "備註紀錄",
    "內容",
    ...detail.legacyNotes.map((note) => csvEscape(note.content)),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspection-${detail.date}.csv"`,
    },
  });
}
