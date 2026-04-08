import Link from "next/link";

import { SectionCard } from "@/components/section-card";
import { getImprovementTasks, updateImprovementTaskStatus } from "@/lib/inspection";

function statusTone(status: "pending" | "resolved" | "verified" | "superseded") {
  if (status === "pending") return "bg-danger/10 text-danger";
  if (status === "resolved") return "bg-warm/15 text-warm";
  if (status === "verified") return "bg-green-100 text-green-700";
  return "bg-ink/10 text-ink/65";
}

export default async function ImprovementTasksPage() {
  const tasks = await getImprovementTasks();

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
        title="Improvement Tracking"
        description="Follow low-score items through pending, resolved, and verified states."
      >
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-danger/5 px-4 py-3 text-sm text-danger">
            Pending: {tasks.filter((task) => task.status === "pending").length}
          </div>
          <div className="rounded-2xl bg-warm/10 px-4 py-3 text-sm text-warm">
            Resolved: {tasks.filter((task) => task.status === "resolved").length}
          </div>
          <div className="rounded-2xl bg-green-100 px-4 py-3 text-sm text-green-700">
            Verified: {tasks.filter((task) => task.status === "verified").length}
          </div>
          <div className="rounded-2xl bg-soft px-4 py-3 text-sm text-ink/70">
            Superseded: {tasks.filter((task) => task.status === "superseded").length}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Open Task List"
        description="Owners and managers can move tasks forward as stores improve."
      >
        <div className="grid gap-3">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-[24px] border border-ink/10 bg-soft/40 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{task.item?.name ?? "Unknown item"}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusTone(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink/65">
                    {task.store?.name ?? "Unknown store"} · {task.score?.inspectionDate ?? "-"} · Score{" "}
                    {task.score?.value ?? "-"}
                  </p>
                  {task.score?.note && <p className="text-sm leading-6 text-ink/75">{task.score.note}</p>}
                  {task.score?.inspectionId && (
                    <Link
                      href={`/inspection/history/${task.score.inspectionId}`}
                      className="inline-flex text-sm text-warm underline-offset-4 hover:underline"
                    >
                      View inspection detail
                    </Link>
                  )}
                </div>

                <form action={updateStatusAction} className="flex flex-wrap gap-2">
                  <input type="hidden" name="id" value={task.id} />
                  <button
                    type="submit"
                    name="status"
                    value="pending"
                    className="rounded-full bg-white px-4 py-2 text-xs text-ink/70"
                  >
                    Mark Pending
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="resolved"
                    className="rounded-full bg-warm px-4 py-2 text-xs text-white"
                  >
                    Mark Resolved
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="verified"
                    className="rounded-full bg-green-600 px-4 py-2 text-xs text-white"
                  >
                    Mark Verified
                  </button>
                  <button
                    type="submit"
                    name="status"
                    value="superseded"
                    className="rounded-full bg-ink px-4 py-2 text-xs text-white"
                  >
                    Mark Superseded
                  </button>
                </form>
              </div>
            </div>
          ))}

          {tasks.length === 0 && (
            <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-8 text-center text-sm text-ink/60">
              No improvement tasks yet.
            </div>
          )}
        </div>
      </SectionCard>
    </div>
  );
}
