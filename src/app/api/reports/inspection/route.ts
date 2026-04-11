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
    return NextResponse.json({ error: "未登入" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const month = formatMonthValue(searchParams.get("month"));
  const store = searchParams.get("store") || undefined;
  const report = await getInspectionMonthlyReport({ month, storeId: store });

  const lines = [
    "Summary",
    "欄位,值",
    `月份,${csvEscape(report.month)}`,
    `巡店次數,${csvEscape(report.summary.totalInspections)}`,
    `平均分數,${csvEscape(report.summary.averageScore)}`,
    `整體評級,${csvEscape(report.summary.overallGrade ?? "-")}`,
    `A 巡店數,${csvEscape(report.summary.gradeCounts.a)}`,
    `B 巡店數,${csvEscape(report.summary.gradeCounts.b)}`,
    `C 巡店數,${csvEscape(report.summary.gradeCounts.c)}`,
    `必查異常,${csvEscape(report.summary.tagIssueCounts.critical)}`,
    `本月加強異常,${csvEscape(report.summary.tagIssueCounts.monthlyAttention)}`,
    `客訴項目異常,${csvEscape(report.summary.tagIssueCounts.complaintWatch)}`,
    `低分題數,${csvEscape(report.summary.lowScoreCount)}`,
    `涵蓋店數,${csvEscape(report.summary.storesCovered)}`,
    `待改善任務,${csvEscape(report.summary.pendingTasks)}`,
    `已確認任務,${csvEscape(report.summary.verifiedTasks)}`,
    "",
    "Category Breakdown",
    "分類,平均分數,評級,題數,需關注題數,A 數,B 數,C 數",
    ...report.categoryBreakdown.map(
      (category) =>
        `${csvEscape(category.categoryName)},${csvEscape(category.averageScore)},${csvEscape(category.grade)},${csvEscape(category.itemCount)},${csvEscape(category.attentionCount)},${csvEscape(category.counts.a)},${csvEscape(category.counts.b)},${csvEscape(category.counts.c)}`,
    ),
    "",
    "Store Breakdown",
    "店別,巡店次數,平均分數,總評,低分題數",
    ...report.storeBreakdown.map(
      (storeRow) =>
        `${csvEscape(storeRow.storeName)},${csvEscape(storeRow.inspections)},${csvEscape(storeRow.averageScore)},${csvEscape(storeRow.overallGrade)},${csvEscape(storeRow.lowScoreCount)}`,
    ),
    "",
    "Top Problem Items",
    "題目,出現次數,平均分數,平均評級",
    ...report.topProblemItems.map(
      (item) =>
        `${csvEscape(item.itemName)},${csvEscape(item.occurrences)},${csvEscape(item.averageScore)},${csvEscape(item.averageGrade)}`,
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inspection-report-${report.month}.csv"`,
    },
  });
}
