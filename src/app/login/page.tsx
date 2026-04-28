import { redirect } from "next/navigation";

import { LoginButton } from "@/app/login/login-button";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect("/");
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute left-6 top-6 hidden h-20 w-20 rotate-[-8deg] border-[3px] border-nb-ink bg-nb-yellow shadow-nb md:block" />
      <div className="absolute bottom-8 right-8 hidden h-24 w-24 rotate-[10deg] border-[3px] border-nb-ink bg-nb-blue shadow-nb md:block" />
      <div className="absolute right-[18%] top-[14%] hidden h-5 w-5 rounded-full border-[3px] border-nb-ink bg-nb-red lg:block" />

      <section className="nb-card relative w-full max-w-5xl overflow-hidden p-0">
        <div className="grid md:grid-cols-[1.05fr_0.95fr]">
          <div className="border-b-[3px] border-nb-ink bg-nb-yellow p-8 md:border-b-0 md:border-r-[3px] md:p-10">
            <span className="nb-stamp">Warm Morning Ops</span>
            <h1 className="nb-h1 mt-6 text-5xl md:text-6xl">門市巡檢營運系統</h1>
            <p className="mt-5 max-w-xl text-base font-bold leading-7 text-nb-ink/80">
              巡店紀錄、改善追蹤、報表分析與門市營運狀態，集中在同一個工作台。
            </p>

            <div className="mt-8 grid grid-cols-2 gap-3 text-sm font-bold">
              <div className="border-[2.5px] border-nb-ink bg-nb-paper p-4 shadow-nb-sm">
                <p className="nb-eyebrow">Check</p>
                <p className="mt-2 text-lg">巡店紀錄</p>
              </div>
              <div className="border-[2.5px] border-nb-ink bg-nb-paper p-4 shadow-nb-sm">
                <p className="nb-eyebrow">Follow</p>
                <p className="mt-2 text-lg">改善追蹤</p>
              </div>
            </div>
          </div>

          <div className="bg-nb-paper p-8 md:p-10">
            <div className="mb-8 flex items-center gap-3">
              <span className="inline-flex h-12 w-12 items-center justify-center border-[2.5px] border-nb-ink bg-nb-yellow shadow-nb-sm font-nbSerif text-2xl font-black">
                巡
              </span>
              <div>
                <p className="nb-eyebrow">Login</p>
                <h2 className="font-nbSerif text-3xl font-black text-nb-ink">登入工作台</h2>
              </div>
            </div>

            <div className="border-[2.5px] border-nb-ink bg-nb-bg2 p-5">
              <p className="text-sm font-bold leading-6 text-nb-ink/75">
                請先使用 Google 帳號登入。是否可進入系統，仍會由授權使用者名單進一步控管。
              </p>
            </div>

            <div className="mt-8">
              <LoginButton />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
