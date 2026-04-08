import { getAuditLogs } from "@/lib/inspection";

export default async function AuditPage() {
  const logs = await getAuditLogs();

  return (
    <div className="grid gap-6">
      <div className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Audit</p>
            <h1 className="mt-2 font-serifTc text-3xl font-semibold">Activity Log</h1>
            <p className="mt-3 text-sm text-ink/70">
              Review recent high-impact operations across access, inspection records, photos, and task status updates.
            </p>
          </div>
          <a href="/api/reports/audit" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            Export CSV
          </a>
        </div>
      </div>

      <div className="overflow-hidden rounded-[28px] border border-ink/10 bg-white/85 shadow-card">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-soft/40 text-ink/70">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-ink/10 align-top">
                <td className="px-4 py-3 whitespace-nowrap">{log.createdAt.slice(0, 19).replace("T", " ")}</td>
                <td className="px-4 py-3">{log.actorEmail ?? "-"}</td>
                <td className="px-4 py-3">{log.action}</td>
                <td className="px-4 py-3">
                  {log.entityType} / {log.entityId}
                </td>
                <td className="px-4 py-3 text-ink/65">{JSON.stringify(log.details)}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-ink/60" colSpan={5}>
                  No audit logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
