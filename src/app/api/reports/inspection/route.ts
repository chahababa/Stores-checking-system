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
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const month = formatMonthValue(searchParams.get("month"));
  const store = searchParams.get("store") || undefined;
  const report = await getInspectionMonthlyReport({ month, storeId: store });

  const lines = [
    "摘要",
    "欄位,值",
    `月份,${csvEscape(report.month)}`,
    `巡店次數,${csvEscape(report.summary.totalInspections)}`,
    `平均分數,${csvEscape(report.summary.averageScore)}`,
    `低分項目數,${csvEscape(report.summary.lowScoreCount)}`,
    `涵蓋店數,${csvEscape(report.summary.storesCovered)}`,
    `待處理任務,${csvEscape(report.summary.pendingTasks)}`,
    `已確認任務,${csvEscape(report.summary.verifiedTasks)}`,
    "",
    "各店拆解",
    "店別,巡店次數,平均分數,低分項目數",
    ...report.storeBreakdown.map(
      (storeRow) =>
        `${csvEscape(storeRow.storeName)},${csvEscape(storeRow.inspections)},${csvEscape(storeRow.averageScore)},${csvEscape(storeRow.lowScoreCount)}`,
    ),
    "",
    "常見低分題目",
    "題目,出現次數,平均分數",
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
