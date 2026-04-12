import Link from "next/link";

import { SectionCard } from "@/components/section-card";
import { getNotificationFeed, getNotificationLevelLabel, getNotificationTone } from "@/lib/notifications";

function groupByLevel(feed: Awaited<ReturnType<typeof getNotificationFeed>>) {
  return {
    high: feed.items.filter((item) => item.level === "high"),
    medium: feed.items.filter((item) => item.level === "medium"),
    low: feed.items.filter((item) => item.level === "low"),
  };
}

export default async function NotificationsPage() {
  const feed = await getNotificationFeed();
  const grouped = groupByLevel(feed);
  const topPriority = grouped.high[0] ?? grouped.medium[0] ?? grouped.low[0] ?? null;

  return (
    <div data-testid="notifications-page" className="grid gap-6">
      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Notifications</p>
            <h1 className="mt-2 font-serifTc text-3xl font-semibold text-ink">通知中心</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-ink/70">
              先集中看高風險事件，再往下處理本月加強、連續低分與提醒型通知。這一版先提供站內通知，
              後續再接 Email / LINE。
            </p>
          </div>

          <div data-testid="notifications-summary" className="grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-[22px] border border-danger/15 bg-danger/5 px-4 py-4 text-center text-danger">
              <p className="text-xs uppercase tracking-[0.2em]">高</p>
              <p className="mt-2 font-serifTc text-3xl font-semibold">{feed.counts.high}</p>
            </div>
            <div className="rounded-[22px] border border-warm/15 bg-warm/5 px-4 py-4 text-center text-warm">
              <p className="text-xs uppercase tracking-[0.2em]">中</p>
              <p className="mt-2 font-serifTc text-3xl font-semibold">{feed.counts.medium}</p>
            </div>
            <div className="rounded-[22px] border border-ink/10 bg-soft px-4 py-4 text-center text-ink/75">
              <p className="text-xs uppercase tracking-[0.2em]">低</p>
              <p className="mt-2 font-serifTc text-3xl font-semibold">{feed.counts.low}</p>
            </div>
          </div>
        </div>
      </section>

      {topPriority ? (
        <SectionCard
          title="先處理這一則"
          description="這張卡片會優先顯示目前最高優先級、最值得先處理的提醒。"
        >
          <div className={`rounded-[24px] border px-5 py-5 ${getNotificationTone(topPriority.level)}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium">
                    {getNotificationLevelLabel(topPriority.level)} 優先
                  </span>
                  {topPriority.storeName ? (
                    <span className="text-xs opacity-80">{topPriority.storeName}</span>
                  ) : null}
                  {topPriority.date ? <span className="text-xs opacity-80">{topPriority.date}</span> : null}
                </div>
                <h2 className="mt-3 text-lg font-semibold">{topPriority.title}</h2>
                <p className="mt-2 text-sm leading-7 opacity-85">{topPriority.description}</p>
              </div>
              {topPriority.href ? (
                <Link
                  href={topPriority.href}
                  className="rounded-full bg-white/90 px-4 py-2 text-sm text-ink transition hover:bg-white"
                >
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
          description="通常代表必查項目、客訴項目或整體巡店結果已經落到需要立即處理的程度。"
        >
          <div data-testid="notifications-section-high" className="grid gap-3">
            {grouped.high.length > 0 ? (
              grouped.high.map((item) => (
                <NotificationCard key={item.id} item={item} />
              ))
            ) : (
              <EmptyState text="目前沒有高優先通知。" />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="中優先"
          description="適合排進本週追蹤，例如本月加強項目、連續低分，或待改善任務開始累積。"
        >
          <div data-testid="notifications-section-medium" className="grid gap-3">
            {grouped.medium.length > 0 ? (
              grouped.medium.map((item) => (
                <NotificationCard key={item.id} item={item} />
              ))
            ) : (
              <EmptyState text="目前沒有中優先通知。" />
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="提醒"
          description="這些通知比較偏摘要與節奏提醒，幫助店長或主管掌握本月是否有正常巡店。"
        >
          <div data-testid="notifications-section-low" className="grid gap-3">
            {grouped.low.length > 0 ? (
              grouped.low.map((item) => (
                <NotificationCard key={item.id} item={item} />
              ))
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
    <div className={`rounded-[22px] border px-4 py-4 ${getNotificationTone(item.level)}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium">
            {getNotificationLevelLabel(item.level)}
          </span>
          {item.storeName ? <span className="text-xs opacity-80">{item.storeName}</span> : null}
          {item.date ? <span className="text-xs opacity-80">{item.date}</span> : null}
        </div>
        <div>
          <p className="font-medium">{item.title}</p>
          <p className="mt-2 text-sm leading-6 opacity-85">{item.description}</p>
        </div>
        {item.href ? (
          <div>
            <Link
              href={item.href}
              className="inline-flex rounded-full bg-white/90 px-4 py-2 text-sm text-ink transition hover:bg-white"
            >
              前往處理
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-[22px] border border-dashed border-ink/15 bg-white/60 px-4 py-8 text-sm text-ink/60">
      {text}
    </div>
  );
}
