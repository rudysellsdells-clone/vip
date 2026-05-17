import type { ReactNode } from "react";
import Link from "next/link";

export function VipPageShell({ children }: { children: ReactNode }) {
  return <main className="vip-page space-y-8">{children}</main>;
}

export function VipHero({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
  children?: ReactNode;
}) {
  return (
    <section className="vip-surface relative overflow-hidden rounded-[2rem] p-6 md:p-8 lg:p-10">
      <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-sky-200/40 blur-3xl" />
      <div className="absolute -bottom-28 right-28 h-72 w-72 rounded-full bg-amber-200/35 blur-3xl" />
      <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-sky-500 via-amber-400 to-emerald-400" />

      <div className="relative">
        {eyebrow ? (
          <p className="text-sm font-black uppercase tracking-[0.22em] text-sky-700">
            {eyebrow}
          </p>
        ) : null}

        <div className="mt-3 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="max-w-5xl text-4xl font-black tracking-tight text-slate-950 md:text-5xl lg:text-6xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
                {description}
              </p>
            ) : null}
          </div>

          {(primaryAction || secondaryAction) ? (
            <div className="flex flex-wrap gap-3">
              {secondaryAction ? (
                <Link
                  href={secondaryAction.href}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {secondaryAction.label}
                </Link>
              ) : null}

              {primaryAction ? (
                <Link
                  href={primaryAction.href}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
                >
                  {primaryAction.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {children ? <div className="mt-7">{children}</div> : null}
      </div>
    </section>
  );
}
