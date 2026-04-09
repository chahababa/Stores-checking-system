import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded-[28px] border border-danger/20 bg-white/85 p-8 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-danger">禁止存取</p>
        <h1 className="mt-3 font-serifTc text-3xl font-semibold">這個帳號尚未被授權</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">
          你的 Google 帳號已成功登入，但這個 Email 目前還不在系統授權名單中。請先請系統擁有者替你開通權限。
        </p>
        <div className="mt-6">
          <Link href="/login" className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            返回登入頁
          </Link>
        </div>
      </div>
    </main>
  );
}
