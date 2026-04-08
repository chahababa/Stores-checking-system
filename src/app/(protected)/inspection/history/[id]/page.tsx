import Link from "next/link";
import { redirect } from "next/navigation";

import { SectionCard } from "@/components/section-card";
import { getCurrentUserProfile } from "@/lib/auth";
import {
  deleteInspection,
  deleteInspectionPhoto,
  getInspectionDetail,
  setInspectionEditable,
  setInspectionPhotoStandard,
} from "@/lib/inspection";

type PageParams = Promise<{ id: string }>;

function scoreTone(score: 1 | 2 | 3) {
  if (score === 3) return "bg-green-100 text-green-700";
  if (score === 2) return "bg-warm/15 text-warm";
  return "bg-danger/10 text-danger";
}

export default async function InspectionDetailPage({ params }: { params: PageParams }) {
  const { id } = await params;
  const profile = await getCurrentUserProfile();
  const detail = await getInspectionDetail(id);
  const canManagePhotos = profile?.role === "owner" || profile?.role === "manager";
  const canManageInspection = profile?.role === "owner" || profile?.role === "manager";
  const canDeleteInspection = profile?.role === "owner";

  async function toggleStandardAction(formData: FormData) {
    "use server";
    await setInspectionPhotoStandard(String(formData.get("photo_id")), String(formData.get("next_value")) === "true");
  }

  async function deletePhotoAction(formData: FormData) {
    "use server";
    await deleteInspectionPhoto(String(formData.get("photo_id")));
  }

  async function toggleEditableAction(formData: FormData) {
    "use server";
    await setInspectionEditable(String(formData.get("inspection_id")), String(formData.get("next_value")) === "true");
  }

  async function deleteInspectionAction(formData: FormData) {
    "use server";
    await deleteInspection(String(formData.get("inspection_id")));
    redirect("/inspection/history");
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col gap-4 rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Inspection Detail</p>
          <h1 className="mt-2 font-serifTc text-3xl font-semibold">
            {detail.store?.name ?? "Store"} · {detail.date}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-ink/70">
            <span>{detail.timeSlot}</span>
            <span>·</span>
            <span>{detail.busynessLevel} busyness</span>
            <span>·</span>
            <span>total score {detail.totalScore}</span>
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                detail.isEditable ? "bg-warm/15 text-warm" : "bg-ink/10 text-ink/70"
              }`}
            >
              {detail.isEditable ? "Editable" : "Locked"}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/inspection/history" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
            Back To History
          </Link>
          <Link href={`/api/reports/inspection/${id}`} className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
            Export CSV
          </Link>
          {canManageInspection && detail.isEditable && (
            <Link href={`/inspection/history/${id}/edit`} className="rounded-full bg-warm px-5 py-3 text-sm text-white">
              Edit Inspection
            </Link>
          )}
        </div>
      </div>

      {canManageInspection && (
        <SectionCard title="Record Control" description="Lock records to prevent further edits, or remove invalid records.">
          <div className="flex flex-wrap gap-3">
            <form action={toggleEditableAction}>
              <input type="hidden" name="inspection_id" value={id} />
              <input type="hidden" name="next_value" value={String(!detail.isEditable)} />
              <button type="submit" className="rounded-full bg-soft px-5 py-3 text-sm text-ink/75">
                {detail.isEditable ? "Lock Inspection" : "Unlock Inspection"}
              </button>
            </form>

            {canDeleteInspection && (
              <form action={deleteInspectionAction}>
                <input type="hidden" name="inspection_id" value={id} />
                <button type="submit" className="rounded-full bg-danger px-5 py-3 text-sm text-white">
                  Delete Inspection
                </button>
              </form>
            )}
          </div>
        </SectionCard>
      )}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.4fr]">
        <SectionCard title="Visit Summary" description="Core inspection context and participants.">
          <div className="grid gap-3 text-sm text-ink/75">
            <p>Store: {detail.store?.name ?? "-"}</p>
            <p>Inspector: {detail.inspector?.email ?? "-"}</p>
            <p>Date: {detail.date}</p>
            <p>Time Slot: {detail.timeSlot}</p>
            <p>Busyness: {detail.busynessLevel}</p>
            <p>Total Score: {detail.totalScore}</p>
          </div>
        </SectionCard>

        <SectionCard title="Shift Staff" description="People selected for this inspection visit.">
          <div className="grid gap-3 md:grid-cols-2">
            {detail.staff.map((member) => (
              <div key={member.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/75">
                <p className="font-medium text-ink">{member.name}</p>
                <p>
                  Position: {member.position} · Shift Role: {member.roleInShift}
                </p>
              </div>
            ))}
            {detail.staff.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                No staff were selected for this inspection.
              </div>
            )}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Scored Items" description="Each item keeps its score, note, photos, and linked improvement task.">
        <div className="grid gap-4">
          {detail.scores.map((row) => (
            <article key={row.id} className="rounded-[24px] border border-ink/10 bg-white p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-ink">{row.itemName}</p>
                    <span className="rounded-full bg-soft px-3 py-1 text-xs text-ink/70">{row.categoryName}</span>
                    {row.isFocusItem && (
                      <span className="rounded-full bg-warm px-3 py-1 text-xs text-white">Focus Item</span>
                    )}
                    {row.hasPrevIssue && (
                      <span className="rounded-full bg-danger/10 px-3 py-1 text-xs text-danger">
                        Previous issue · {row.consecutiveWeeks} week{row.consecutiveWeeks > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  {row.note && <p className="mt-3 text-sm leading-6 text-ink/75">{row.note}</p>}
                  {row.task && (
                    <p className="mt-2 text-xs text-ink/55">
                      Improvement task: {row.task.status} · created {row.task.createdAt.slice(0, 10)}
                    </p>
                  )}
                </div>
                <span className={`rounded-full px-4 py-2 text-sm font-medium ${scoreTone(row.score)}`}>Score {row.score}</span>
              </div>

              {row.photos.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {row.photos.map((photo) => (
                    <div key={photo.id} className="overflow-hidden rounded-2xl border border-ink/10 bg-soft/30">
                      <a href={photo.photoUrl} target="_blank" rel="noreferrer" className="group block">
                        <div
                          className="aspect-square w-full bg-cover bg-center transition group-hover:scale-[1.02]"
                          style={{ backgroundImage: `url(${photo.photoUrl})` }}
                        />
                      </a>
                      <div className="grid gap-2 px-3 py-3">
                        <div className="text-xs text-ink/70">{photo.isStandard ? "Standard Photo" : "Reference Photo"}</div>
                        {canManagePhotos && (
                          <div className="flex flex-wrap gap-2">
                            <form action={toggleStandardAction}>
                              <input type="hidden" name="photo_id" value={photo.id} />
                              <input type="hidden" name="next_value" value={String(!photo.isStandard)} />
                              <button type="submit" className="rounded-full bg-white px-3 py-2 text-xs text-ink/70">
                                {photo.isStandard ? "Unset Standard" : "Set Standard"}
                              </button>
                            </form>
                            <form action={deletePhotoAction}>
                              <input type="hidden" name="photo_id" value={photo.id} />
                              <button type="submit" className="rounded-full bg-danger/10 px-3 py-2 text-xs text-danger">
                                Delete Photo
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Food Quality Samples" description="Recorded dine-in and takeout samples for this visit.">
          <div className="grid gap-3">
            {detail.menuItems.map((item) => (
              <div key={item.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm text-ink/75">
                <p className="font-medium capitalize text-ink">{item.type.replace("_", " ")}</p>
                <p>Dish: {item.dishName ?? "-"}</p>
                <p>Weight: {item.portionWeight ?? "-"}</p>
              </div>
            ))}
            {detail.menuItems.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                No menu samples were recorded.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Legacy Notes" description="General notes that were not tied to a single item.">
          <div className="grid gap-3">
            {detail.legacyNotes.map((note) => (
              <div key={note.id} className="rounded-2xl border border-ink/10 bg-soft/40 px-4 py-3 text-sm leading-6 text-ink/75">
                <p>{note.content}</p>
                <p className="mt-2 text-xs text-ink/50">{note.createdAt.slice(0, 10)}</p>
              </div>
            ))}
            {detail.legacyNotes.length === 0 && (
              <div className="rounded-2xl border border-dashed border-ink/15 px-4 py-6 text-sm text-ink/60">
                No legacy notes were recorded.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
