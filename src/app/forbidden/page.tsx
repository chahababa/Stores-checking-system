import Link from "next/link";

type SearchParams = Promise<{ reason?: string }>;

export default async function ForbiddenPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const reason = params.reason ?? "unauthorized";

  const content =
    reason === "role"
      ? {
          eyebrow: "權限不足",
          title: "你目前無法存取這個頁面",
          description: "你目前的角色沒有這個頁面的操作權限。如有需要，請聯絡系統擁有者調整權限。",
          href: "/",
          actionLabel: "返回首頁",
        }
      : reason === "oauth"
        ? {
            eyebrow: "登入失敗",
            title: "這次登入流程沒有完成",
            description: "Google 登入流程發生問題，請重新登入一次；若仍持續發生，請再通知系統擁有者協助處理。",
            href: "/login",
            actionLabel: "返回登入頁",
          }
        : {
            eyebrow: "禁止存取",
            title: "這個帳號尚未被授權",
            description:
              "你的 Google 帳號已成功登入，但這個 Email 目前還不在系統授權名單中。請先請系統擁有者替你開通權限。",
            href: "/login",
            actionLabel: "返回登入頁",
          };

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-lg rounded-[28px] border border-danger/20 bg-white/85 p-8 shadow-card">
        <p className="font-lora text-sm uppercase tracking-[0.25em] text-danger">{content.eyebrow}</p>
        <h1 className="mt-3 font-serifTc text-3xl font-semibold">{content.title}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/75">{content.description}</p>
        <div className="mt-6">
          <Link href={content.href} className="rounded-full bg-warm px-5 py-3 text-sm text-white">
            {content.actionLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
