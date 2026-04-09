import Link from "next/link";

import { requireRole } from "@/lib/auth";

export default async function PendingPage() {
  const profile = await requireRole("leader");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-2xl rounded-[28px] border border-ink/10 bg-white/85 p-8 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">功能尚未開放</p>
        <h1 className="mt-3 font-serifTc text-3xl font-semibold">店長頁面目前仍有限制</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          {profile.email} 目前以店長身分登入。現階段 MVP 先開放查閱共用紀錄與組員資訊，完整的巡店流程會再逐步開放。
        </p>
        <div className="mt-6">
          <Link href="/settings/staff" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            查看組員資料
          </Link>
        </div>
      </div>
    </main>
  );
}
