import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded-[28px] border border-danger/20 bg-white/85 p-8 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-danger">Access Blocked</p>
        <h1 className="mt-3 font-serifTc text-3xl font-semibold">This Account Is Not Authorized</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          Your Google account signed in successfully, but this email is not in the authorized user list yet. Please ask
          an owner account to grant access first.
        </p>
        <div className="mt-6">
          <Link href="/login" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            Back To Login
          </Link>
        </div>
      </div>
    </main>
  );
}
