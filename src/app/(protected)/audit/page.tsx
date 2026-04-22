import { getAuditLogs } from "@/lib/inspection";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAuditDetails, getAuditActionLabel, getAuditEntityLabel } from "@/lib/ui-labels";

export default async function AuditPage() {
  const [logs, { data: stores }] = await Promise.all([
    getAuditLogs(),
    createAdminClient().from("stores").select("id, name"),
  ]);

  const storeNamesById = Object.fromEntries((stores ?? []).map((store) => [store.id, store.name]));

  return (
    <div className="grid gap-6">
      <section className="nb-card p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="nb-eyebrow">Audit Trail</p>
            <h1 className="mt-2 font-nbSerif text-4xl font-black text-nb-ink">操作紀錄</h1>
            <p className="mt-3 text-sm leading-7 text-nb-ink/75 font-bold">
              這裡會記錄帳號、組員、巡店、題目標籤等重要操作，方便日後追查與回顧。
            </p>
          </div>
          <a href="/api/reports/audit" className="nb-btn-primary">
            匯出 CSV
          </a>
        </div>
      </section>

      <section className="nb-card overflow-hidden p-0">
        <div className="nb-table-wrap">
          <table className="nb-table">
            <thead>
              <tr>
                <th>時間</th>
                <th>操作人</th>
                <th>動作</th>
                <th>對象</th>
                <th>內容</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="align-top">
                  <td className="whitespace-nowrap font-nbMono">
                    {log.createdAt.slice(0, 19).replace("T", " ")}
                  </td>
                  <td className="font-nbMono">{log.actorEmail ?? "-"}</td>
                  <td>
                    <span className="nb-chip">{getAuditActionLabel(log.action)}</span>
                  </td>
                  <td>{getAuditEntityLabel(log.entityType)}</td>
                  <td className="text-nb-ink/70 font-bold">
                    {formatAuditDetails(log.action, log.details, { storeNamesById })}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-nb-ink/60 font-bold" colSpan={5}>
                    目前沒有可顯示的操作紀錄。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
