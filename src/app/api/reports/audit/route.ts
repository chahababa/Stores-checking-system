import { NextResponse } from "next/server";

import { getCurrentUserProfile } from "@/lib/auth";
import { getAuditLogs } from "@/lib/inspection";
import { csvEscape } from "@/lib/reporting";

export async function GET() {
  const profile = await getCurrentUserProfile();
  if (!profile || (profile.role !== "owner" && profile.role !== "manager")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await getAuditLogs();
  const lines = [
    "time,actor,action,entity_type,entity_id,details",
    ...logs.map(
      (log) =>
        `${csvEscape(log.createdAt)},${csvEscape(log.actorEmail ?? "-")},${csvEscape(log.action)},${csvEscape(log.entityType)},${csvEscape(log.entityId)},${csvEscape(JSON.stringify(log.details))}`,
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="audit-log.csv"',
    },
  });
}
