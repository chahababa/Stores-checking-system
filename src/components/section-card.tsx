import { PropsWithChildren } from "react";

export function SectionCard({
  title,
  description,
  children,
  eyebrow,
}: PropsWithChildren<{ title: string; description?: string; eyebrow?: string }>) {
  return (
    <section className="nb-card p-6">
      <div className="pb-4 border-b-[3px] border-nb-ink">
        {eyebrow ? <p className="nb-eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 font-nbSerif text-2xl font-black">{title}</h2>
        {description ? <p className="mt-2 text-sm text-nb-ink/70 leading-6">{description}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
