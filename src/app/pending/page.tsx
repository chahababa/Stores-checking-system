import Link from "next/link";

import { requireRole } from "@/lib/auth";

export default async function PendingPage() {
  const profile = await requireRole("leader");

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-2xl rounded-[28px] border border-ink/10 bg-white/85 p-8 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-warm">MVP Phase</p>
        <h1 className="mt-3 font-serifTc text-3xl font-semibold">Leader View Is Limited For Now</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          {profile.email} is signed in as a leader. In this MVP phase, leader accounts can review shared records and
          staff information, while the full inspection workflow is still being opened step by step.
        </p>
        <div className="mt-6">
          <Link href="/settings/staff" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            View Staff
          </Link>
        </div>
      </div>
    </main>
  );
}
