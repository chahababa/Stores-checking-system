import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getInspectionMonthlyReport } from "@/lib/inspection";
import { formatMonthValue } from "@/lib/utils";

function csvEscape(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}

export async function GET(request: NextRequest) {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const month = formatMonthValue(searchParams.get("month"));
  const store = searchParams.get("store") || undefined;
  const report = await getInspectionMonthlyReport({ month, storeId: store });

  const lines = [
    "Summary",
    "metric,value",
    `month,${csvEscape(report.month)}`,
    `total_inspections,${csvEscape(report.summary.totalInspections)}`,
    `average_score,${csvEscape(report.summary.averageScore)}`,
    `low_score_items,${csvEscape(report.summary.lowScoreCount)}`,
    `stores_covered,${csvEscape(report.summary.storesCovered)}`,
    `pending_tasks,${csvEscape(report.summary.pendingTasks)}`,
    `verified_tasks,${csvEscape(report.summary.verifiedTasks)}`,
    "",
    "Store Breakdown",
    "store,inspections,average_score,low_score_items",
    ...report.storeBreakdown.map(
      (storeRow) =>
        `${csvEscape(storeRow.storeName)},${csvEscape(storeRow.inspections)},${csvEscape(storeRow.averageScore)},${csvEscape(storeRow.lowScoreCount)}`,
    ),
    "",
    "Top Problem Items",
    "item,occurrences,average_score",
    ...report.topProblemItems.map(
      (item) => `${csvEscape(item.itemName)},${csvEscape(item.occurrences)},${csvEscape(item.averageScore)}`,
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspection-report-${report.month}.csv"`,
    },
  });
}
