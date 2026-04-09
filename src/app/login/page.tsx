import { redirect } from "next/navigation";

import { LoginButton } from "@/app/login/login-button";
import { getCurrentUserProfile } from "@/lib/auth";

export default async function LoginPage() {
  const profile = await getCurrentUserProfile();

  if (profile) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-[32px] border border-ink/10 bg-white/85 p-8 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.35em] text-warm">門市巡檢作業</p>
        <h1 className="mt-3 font-serifTc text-3xl font-semibold">門市巡檢系統</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          請先使用 Google 帳號登入。是否可進入系統，仍會由授權使用者名單進一步控管。
        </p>
        <div className="mt-8">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
