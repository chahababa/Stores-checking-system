import { redirect } from "next/navigation";

import { PageToast } from "@/components/page-toast";
import { SectionCard } from "@/components/section-card";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

type SearchParams = Promise<{ success?: string }>;

type ReleaseAnnouncementRecord = {
  id: string;
  title: string;
  summary: string;
  audience: "all" | "owner_manager" | "leader";
  published_on: string;
  is_active: boolean;
  updated_at: string;
};

const AUDIENCE_OPTIONS = [
  { value: "all", label: "所有人" },
  { value: "owner_manager", label: "老闆 / 區經理" },
  { value: "leader", label: "店長" },
] as const;

function getSuccessMessage(success?: string) {
  if (success === "created") return "系統更新通知已新增，會出現在通知中心。";
  if (success === "updated") return "系統更新通知已更新。";
  return null;
}

function getAudienceLabel(audience: ReleaseAnnouncementRecord["audience"]) {
  return AUDIENCE_OPTIONS.find((option) => option.value === audience)?.label ?? "所有人";
}

export default async function ReleaseAnnouncementsSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireRole("owner", "manager");
  const params = await searchParams;
  const successMessage = getSuccessMessage(params.success);
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("release_announcements")
    .select("id, title, summary, audience, published_on, is_active, updated_at")
    .order("published_on", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(20);
  const announcements = (data ?? []) as ReleaseAnnouncementRecord[];

  async function createAction(formData: FormData) {
    "use server";
    const { createReleaseAnnouncement } = await import("@/lib/settings");
    await createReleaseAnnouncement({
      title: String(formData.get("title") || ""),
      summary: String(formData.get("summary") || ""),
      audience: String(formData.get("audience") || "all") as "all" | "owner_manager" | "leader",
      publishedOn: String(formData.get("published_on") || ""),
      isActive: String(formData.get("is_active") || "false") === "true",
    });
    redirect("/settings/release-announcements?success=created");
  }

  async function updateAction(formData: FormData) {
    "use server";
    const { updateReleaseAnnouncement } = await import("@/lib/settings");
    await updateReleaseAnnouncement({
      id: String(formData.get("id") || ""),
      title: String(formData.get("title") || ""),
      summary: String(formData.get("summary") || ""),
      audience: String(formData.get("audience") || "all") as "all" | "owner_manager" | "leader",
      publishedOn: String(formData.get("published_on") || ""),
      isActive: String(formData.get("is_active") || "false") === "true",
    });
    redirect("/settings/release-announcements?success=updated");
  }

  return (
    <div className="grid gap-6" data-testid="release-announcements-settings-page">
      {successMessage ? <PageToast message={successMessage} /> : null}

      <section className="nb-card p-6">
        <div className="space-y-2">
          <p className="nb-eyebrow">Release Notes</p>
          <h1 className="font-nbSerif text-4xl font-black text-nb-ink">系統更新通知</h1>
          <p className="max-w-3xl text-sm leading-7 text-nb-ink/75 font-bold">
            每次巡檢系統介面或流程有更新時，可以先在這裡新增一則公告；發布後會出現在首頁的通知摘要與通知中心，讓店長、區經理知道今天或明天改了哪些功能。
          </p>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="xl:sticky xl:top-24 xl:self-start">
          <SectionCard
            title="新增更新通知"
            eyebrow="Create"
            description="建議用一句話寫功能名稱，再用摘要說明對店長或區經理有什麼影響。"
          >
            <form action={createAction} className="grid gap-4" data-testid="release-announcement-create-form">
              <div>
                <label className="nb-label">更新標題</label>
                <input className="nb-input" name="title" placeholder="例如：巡店表單新增上週未通過標籤" required />
              </div>
              <div>
                <label className="nb-label">通知內容</label>
                <textarea
                  className="nb-input min-h-28"
                  name="summary"
                  placeholder="簡短說明這次更新會出現在哪裡、使用者要怎麼操作。"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="nb-label">公告日期</label>
                  <input className="nb-input" name="published_on" type="date" defaultValue={today} required />
                </div>
                <div>
                  <label className="nb-label">通知對象</label>
                  <select className="nb-input" name="audience" defaultValue="all">
                    {AUDIENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-bold">
                <input name="is_active" type="checkbox" value="true" defaultChecked />
                立即發布到通知中心
              </label>
              <button className="nb-btn-primary" type="submit">
                新增通知
              </button>
            </form>
          </SectionCard>
        </div>

        <SectionCard
          title="最近更新通知"
          eyebrow="Published Updates"
          description="可先建立草稿，等功能正式上線時再勾選發布。未發布的通知不會出現在通知中心。"
        >
          <div className="grid gap-4">
            {announcements.length > 0 ? (
              announcements.map((announcement) => (
                <form key={announcement.id} action={updateAction} className="nb-card-flat p-4 grid gap-3">
                  <input type="hidden" name="id" value={announcement.id} />
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="nb-chip bg-nb-bg2">{announcement.published_on}</span>
                    <span className="nb-chip bg-white">{getAudienceLabel(announcement.audience)}</span>
                    <span className={announcement.is_active ? "nb-chip bg-nb-green" : "nb-chip bg-nb-amber"}>
                      {announcement.is_active ? "已發布" : "草稿"}
                    </span>
                  </div>
                  <div>
                    <label className="nb-label">更新標題</label>
                    <input className="nb-input" name="title" defaultValue={announcement.title} required />
                  </div>
                  <div>
                    <label className="nb-label">通知內容</label>
                    <textarea className="nb-input min-h-24" name="summary" defaultValue={announcement.summary} required />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="nb-label">公告日期</label>
                      <input className="nb-input" name="published_on" type="date" defaultValue={announcement.published_on} required />
                    </div>
                    <div>
                      <label className="nb-label">通知對象</label>
                      <select className="nb-input" name="audience" defaultValue={announcement.audience}>
                        {AUDIENCE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-sm font-bold">
                    <input name="is_active" type="checkbox" value="true" defaultChecked={announcement.is_active} />
                    發布到通知中心
                  </label>
                  <div>
                    <button className="nb-btn" type="submit">
                      儲存通知
                    </button>
                  </div>
                </form>
              ))
            ) : (
              <div className="nb-empty">目前還沒有系統更新通知。</div>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
