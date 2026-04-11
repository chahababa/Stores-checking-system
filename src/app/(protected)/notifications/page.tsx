import Link from "next/link";

import { getNotificationFeed, getNotificationLevelLabel, getNotificationTone } from "@/lib/notifications";

export default async function NotificationsPage() {
  const feed = await getNotificationFeed();

  return (
    <div className="grid gap-6">
      <section className="rounded-[28px] border border-ink/10 bg-white/85 p-6 shadow-card">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">Notifications</p>
            <h1 className="mt-2 font-serifTc text-3xl font-semibold">通知中心</h1>
            <p className="mt-3 text-sm text-ink/70">
              第一版先提供站內通知，讓店長、主管與系統擁有者可以先看到哪些事情需要立刻處理，之後再往 Email / LINE 延伸。
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm text-ink/70">
            <span className="rounded-full bg-danger/10 px-3 py-2 text-danger">高 {feed.counts.high}</span>
            <span className="rounded-full bg-warm/10 px-3 py-2 text-warm">中 {feed.counts.medium}</span>
            <span className="rounded-full bg-soft px-3 py-2 text-ink/70">低 {feed.counts.low}</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        {feed.items.map((item) => (
          <div key={item.id} className={`rounded-[24px] border px-5 py-4 shadow-card ${getNotificationTone(item.level)}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-medium">
                    {getNotificationLevelLabel(item.level)} 優先級
                  </span>
                  {item.storeName ? <span className="text-xs opacity-80">{item.storeName}</span> : null}
                  {item.date ? <span className="text-xs opacity-80">{item.date}</span> : null}
                </div>
                <h2 className="mt-3 font-medium">{item.title}</h2>
                <p className="mt-2 text-sm leading-6 opacity-85">{item.description}</p>
              </div>
              {item.href ? (
                <Link href={item.href} className="rounded-full bg-white/90 px-4 py-2 text-sm text-ink transition hover:bg-white">
                  前往查看
                </Link>
              ) : null}
            </div>
          </div>
        ))}
        {feed.items.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-ink/15 bg-white/70 px-5 py-10 text-center text-sm text-ink/60">
            目前沒有需要顯示的通知。
          </div>
        ) : null}
      </section>
    </div>
  );
}

