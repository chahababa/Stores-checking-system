import Link from "next/link";

import { SectionCard } from "@/components/section-card";
import { getNotificationFeed, getNotificationLevelLabel } from "@/lib/notifications";

function groupByLevel(feed: Awaited<ReturnType<typeof getNotificationFeed>>) {
  return {
    high: feed.items.filter((item) => item.level === "high"),
    medium: feed.items.filter((item) => item.level === "medium"),
    low: feed.items.filter((item) => item.level === "low"),
  };
}

function levelCardClass(level: "high" | "medium" | "low") {
  if (level === "high") return "nb-card-flat bg-nb-red text-white";
  if (level === "medium") return "nb-card-flat bg-nb-amber";
  return "nb-card-flat bg-white";
}

function levelChipClass(level: "high" | "medium" | "low") {
  if (level === "high") return "nb-chip bg-white text-nb-ink";
  if (level === "medium") return "nb-chip bg-white text-nb-ink";
  return "nb-chip bg-nb-bg2";
}

export default async function NotificationsPage() {
  const feed = await getNotificationFeed();
  const grouped = groupByLevel(feed);
  const topPriority = grouped.high[0] ?? grouped.medium[0] ?? grouped.low[0] ?? null;

  return (
    <div data-testid="notifications-page" className="grid gap-6">
      <section className="nb-card p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="nb-eyebrow">Notifications</p>
            <h1 className="mt-2 font-nbSerif text-4xl font-black text-nb-ink">通知中心</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-nb-ink/75 font-bold">
              先集中看高風險事件，再往下處理本月加強、連續低分與提醒型通知。這一版先提供站內通知，
              後續再接 Email / LINE。
            </p>
          </div>

          <div data-testid="notifications-summary" className="grid grid-cols-3 gap-3">
            <div className="nb-stat bg-nb-red text-white">
              <p className="nb-stat-eyebrow text-white/90">高</p>
              <p className="nb-stat-value">{feed.counts.high}</p>
            </div>
            <div className="nb-stat bg-nb-amber">
              <p className="nb-stat-eyebrow">中</p>
              <p className="nb-stat-value">{feed.counts.medium}</p>
            </div>
            <div className="nb-stat bg-nb-bg2">
              <p className="nb-stat-eyebrow">低</p>
              <p className="nb-stat-value">{feed.counts.low}</p>
            </div>
          </div>
        </div>
      </section>

      {topPriority ? (
        <SectionCard
          title="先處理這一則"
          eyebrow="Top Priority"
          description="這張卡片會優先顯示目前最高優先級、最值得先處理的提醒。"
        >
          <div className={`${levelCardClass(topPriority.level)} p-5`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={levelChipClass(topPriority.level)}>
                    {getNotificationLevelLabel(topPriority.level)} 優先
                  </span>
                  {topPriority.storeName ? (
                    <span className="text-xs font-bold font-nbMono opacity-85">{topPriority.storeName}</span>
                  ) : null}
                  {topPriority.date ? (
                    <span className="text-xs font-bold font-nbMono opacity-85">{topPriority.date}</span>
                  ) : null}
                </div>
                <h2 className="mt-3 font-nbSerif text-2xl font-black">{topPriority.title}</h2>
                <p className="mt-2 text-sm leading-7 font-bold opacity-90">{topPriority.description}</p>
              </div>
              {topPriority.href ? (
                <Link href={topPriority.href} className="nb-btn-xs bg-white text-nb-ink shrink-0">
                  查看詳情
                </Link>
              ) : null}
            </div>
          </div>
        </SectionCard>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-3">
        <SectionCard
          title="高優先"
          eyebrow="High"
          description="通常代表必查項目、客訴項目或整體巡店結果已經落到需要立即處理的程度。"
        >
          <div data-testid="notifications-section-high" className="grid gap-3">
            {grouped.high.length > 0 ? (
              grouped.high.map((item) => <NotificationCard key={item.id} item={item} />)
            ) : (
              <EmptyState text="目前沒有高優先通知。" />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="中優先"
          eyebrow="Medium"
          description="適合排進本週追蹤，例如本月加強項目、連續低分，或待改善任務開始累積。"
        >
          <div data-testid="notifications-section-medium" className="grid gap-3">
            {grouped.medium.length > 0 ? (
              grouped.medium.map((item) => <NotificationCard key={item.id} item={item} />)
            ) : (
              <EmptyState text="目前沒有中優先通知。" />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="提醒"
          eyebrow="Low"
          description="這些通知比較偏摘要與節奏提醒，幫助店長或主管掌握本月是否有正常巡店。"
        >
          <div data-testid="notifications-section-low" className="grid gap-3">
            {grouped.low.length > 0 ? (
              grouped.low.map((item) => <NotificationCard key={item.id} item={item} />)
            ) : (
              <EmptyState text="目前沒有提醒型通知。" />
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function NotificationCard({
  item,
}: {
  item: Awaited<ReturnType<typeof getNotificationFeed>>["items"][number];
}) {
  return (
    <div className={`${levelCardClass(item.level)} p-4`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className={levelChipClass(item.level)}>{getNotificationLevelLabel(item.level)}</span>
          {item.storeName ? (
            <span className="text-xs font-bold font-nbMono opacity-85">{item.storeName}</span>
          ) : null}
          {item.date ? <span className="text-xs font-bold font-nbMono opacity-85">{item.date}</span> : null}
        </div>
        <div>
          <p className="font-nbSerif text-lg font-black">{item.title}</p>
          <p className="mt-2 text-sm leading-6 font-bold opacity-90">{item.description}</p>
        </div>
        {item.href ? (
          <div>
            <Link href={item.href} className="nb-btn-xs bg-white text-nb-ink">
              前往處理
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="nb-empty">{text}</div>;
}
