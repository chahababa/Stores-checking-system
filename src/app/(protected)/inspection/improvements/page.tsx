import Link from "next/link";

import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { getImprovementTasks, updateImprovementTaskStatus } from "@/lib/inspection";
import { getImprovementStatusLabel } from "@/lib/ui-labels";

function statusTone(status: "pending" | "resolved" | "verified" | "superseded") {
  if (status === "pending") return "bg-danger/10 text-danger";
  if (status === "resolved") return "bg-warm/15 text-warm";
  if (status === "verified") return "bg-green-100 text-green-700";
  return "bg-ink/10 text-ink/65";
}

export default async function ImprovementTasksPage() {
  const profile = await requireRole("owner", "manager", "leader");
  const tasks = await getImprovementTasks();
  const canManageStatus = profile.role === "owner" || profile.role === "manager";

  async function updateStatusAction(formData: FormData) {
    "use server";
    await updateImprovementTaskStatus({
      id: String(formData.get("id")),
      status: String(formData.get("status")) as "pending" | "resolved" | "verified" | "superseded",
    });
  }

  return (
    <div className="grid gap-6">
      <SectionCard
        title="改善追蹤"
        description="追蹤低分題目的改善進度。店長可以查看本店任務，主管與系統擁有者可以調整任務狀態。"
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-danger/5 px-4 py-3 text-sm text-danger">
            待處理：{tasks.filter((task) => task.status === "pending").length}
          </div>
          <div className="rounded-2xl bg-warm/10 px-4 py-3 text-sm text-warm">
            已改善：{tasks.filter((task) => task.status === "resolved").length}
          </div>
          <div className="rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">
            已確認：{tasks.filter((task) => task.status === "verified").length}
          </div>
          <div className="rounded-2xl bg-soft px-4 py-3 text-sm text-ink/70">
            已替代：{tasks.filter((task) => task.status === "superseded").length}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="任務清單"
        description={
          canManageStatus
            ? "你可以依改善進度推進任務狀態，並從明細頁回看原始巡店內容。"
            : "你可以查看本店待改善任務與原始巡店內容；若需要變更任務狀態，請由主管或系統擁有者操作。"
        }
      >
        <div className="grid gap-3">
          {tasks.map((task) => (
            <div key={task.id} data-testid={`improvement-task-${task.id}`} className="rounded-[24px] border border-ink/10 bg-soft/40 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{task.item?.name ?? "未命名題目"}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(task.status)}`}>
                      {getImprovementStatusLabel(task.status)}
                    </span>
                  </div>
                  <p className="text-sm text-ink/65">
                    {task.store?.name ?? "未指定店別"} / {task.score?.inspectionDate ?? "-"} / 分數{" "}
                    {task.score?.value ?? "-"}
                  </p>
                  {task.score?.note ? <p className="text-sm leading-6 text-ink/75">{task.score.note}</p> : null}
                  {task.score?.inspectionId ? (
                    <Link
                      href={`/inspection/history/${task.score.inspectionId}`}
                      className="inline-flex text-sm text-warm underline-offset-4 hover:underline"
                    >
                      查看巡店明細
                    </Link>
                  ) : null}
                </div>

                {canManageStatus ? (
                  <form action={updateStatusAction} className="flex flex-wrap gap-2">
                    <input type="hidden" name="id" value={task.id} />
                    <button
                      type="submit"
                      name="status"
                      value="pending"
                      data-testid={`improvement-task-status-pending-${task.id}`}
                      className="rounded-full bg-white px-4 py-2 text-xs text-ink/70"
                    >
                      設為待處理
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="resolved"
                      data-testid={`improvement-task-status-resolved-${task.id}`}
                      className="rounded-full bg-warm px-4 py-2 text-xs text-white"
                    >
                      設為已改善
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="verified"
                      data-testid={`improvement-task-status-verified-${task.id}`}
                      className="rounded-full bg-green-600 px-4 py-2 text-xs text-white"
                    >
                      設為已確認
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="superseded"
                      data-testid={`improvement-task-status-superseded-${task.id}`}
                      className="rounded-full bg-ink px-4 py-2 text-xs text-white"
                    >
                      設為已替代
                    </button>
                  </form>
                ) : (
                  <div className="rounded-2xl bg-white px-4 py-3 text-xs leading-5 text-ink/60">
                    這個角色可查看任務內容，但不能直接更新狀態。
                  </div>
                )}
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/60">
              目前沒有待追蹤的改善任務。
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
