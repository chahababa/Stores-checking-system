import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getAuditLogs } from "@/lib/inspection";
import { csvEscape } from "@/lib/reporting";
import { getAuditActionLabel, getAuditEntityLabel } from "@/lib/ui-labels";

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile || (profile.role !== "owner" && profile.role !== "manager")) {
    return NextResponse.json({ error: "未授權" }, { status: 401 });
  }

  const logs = await getAuditLogs();
  const lines = [
    "時間,操作者,動作,對象類型,對象編號,內容",
    ...logs.map(
      (log) =>
        `${csvEscape(log.createdAt)},${csvEscape(log.actorEmail ?? "-")},${csvEscape(getAuditActionLabel(log.action))},${csvEscape(getAuditEntityLabel(log.entityType))},${csvEscape(log.entityId)},${csvEscape(JSON.stringify(log.details))}`,
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
    },
  });
}
