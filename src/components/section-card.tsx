import { PropsWithChildren } from "react";

export function SectionCard({
  title,
  description,
  children,
}: PropsWithChildren<{ title: string; description?: string }>) {
  return (
    <section className="rounded-[24px] border border-ink/10 bg-white/80 p-5 shadow-card">
      <div className="mb-4">
        <h2 className="font-serifTc text-xl font-semibold">{title}</h2>
        {description ? <p className="mt-1 text-sm text-ink/70">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}
