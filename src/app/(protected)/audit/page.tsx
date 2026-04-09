import { getAuditLogs } from "@/lib/inspection";
import { getAuditActionLabel, getAuditEntityLabel } from "@/lib/ui-labels";

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">操作紀錄</p>
            <h1 className="mt-2 font-serifTc text-3xl font-semibold">操作紀錄</h1>
            <p className="mt-3 text-sm text-ink/70">
              查看近期的重要操作，包括權限、巡店紀錄、照片，以及改善任務狀態的變更。
            </p>
          </div>
          <a href="/api/reports/audit" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            匯出 CSV
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-ink/10 bg-white/85 shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-soft/40 text-ink/70">
            <tr>
              <th className="px-4 py-3">時間</th>
              <th className="px-4 py-3">操作者</th>
              <th className="px-4 py-3">動作</th>
              <th className="px-4 py-3">對象</th>
              <th className="px-4 py-3">內容</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-ink/10 align-top">
                <td className="px-4 py-3 whitespace-nowrap">{log.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td className="px-4 py-3">{log.actorEmail ?? "-"}</td>
                <td className="px-4 py-3">{getAuditActionLabel(log.action)}</td>
                <td className="px-4 py-3">
                  {getAuditEntityLabel(log.entityType)} / {log.entityId}
                </td>
                <td className="px-4 py-3 text-ink/65">{JSON.stringify(log.details)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-ink/60" colSpan={5}>
                  目前還沒有操作紀錄。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
