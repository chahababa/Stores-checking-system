import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getInspectionDetail } from "@/lib/inspection";

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const detail = await getInspectionDetail(id);

  const lines = [
    "Inspection Summary",
    "field,value",
    `store,${csvEscape(detail.store?.name ?? "-")}`,
    `date,${csvEscape(detail.date)}`,
    `time_slot,${csvEscape(detail.timeSlot)}`,
    `busyness,${csvEscape(detail.busynessLevel)}`,
    `total_score,${csvEscape(detail.totalScore)}`,
    `inspector,${csvEscape(detail.inspector?.email ?? "-")}`,
    "",
    "Scores",
    "category,item,score,is_focus_item,has_prev_issue,consecutive_weeks,note",
    ...detail.scores.map(
      (row) =>
        `${csvEscape(row.categoryName)},${csvEscape(row.itemName)},${csvEscape(row.score)},${csvEscape(row.isFocusItem)},${csvEscape(row.hasPrevIssue)},${csvEscape(row.consecutiveWeeks)},${csvEscape(row.note ?? "")}`,
    ),
    "",
    "Staff",
    "name,position,role_in_shift",
    ...detail.staff.map(
      (member) => `${csvEscape(member.name)},${csvEscape(member.position)},${csvEscape(member.roleInShift)}`,
    ),
    "",
    "Menu Items",
    "type,dish_name,portion_weight",
    ...detail.menuItems.map(
      (item) => `${csvEscape(item.type)},${csvEscape(item.dishName ?? "")},${csvEscape(item.portionWeight ?? "")}`,
    ),
    "",
    "Legacy Notes",
    "content",
    ...detail.legacyNotes.map((note) => csvEscape(note.content)),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspection-${detail.date}.csv"`,
    },
  });
}
