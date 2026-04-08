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
        <p className="font-lora text-sm uppercase tracking-[0.35em] text-warm">Warm Morning Ops</p>
        <h1 className="mt-3 font-serifTc text-3xl font-semibold">Store Inspection System</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          Sign in with your Google account first. Access is still controlled by the authorized user list inside the
          MVP system.
        </p>
        <div className="mt-8">
          <LoginButton />
        </div>
      </div>
    </main>
  );
}
