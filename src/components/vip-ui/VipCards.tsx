import type { ReactNode } from "react";
import Link from "next/link";

const metricToneClasses = {
  neutral: "from-slate-50 to-white border-slate-200",
  success: "from-emerald-50 to-white border-emerald-100",
  warning: "from-amber-50 to-white border-amber-100",
  danger: "from-rose-50 to-white border-rose-100",
  info: "from-sky-50 to-white border-sky-100",
  purple: "from-violet-50 to-white border-violet-100",
};

const metricDotClasses = {
  neutral: "bg-slate-400",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-rose-500",
  info: "bg-sky-500",
  purple: "bg-violet-500",
};

export function VipMetricCard({
  label,
  value,
  description,
  href,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  description?: string;
  href?: string;
  tone?: keyof typeof metricToneClasses;
}) {
  const card = (
    <div
      className={[
        "vip-card-hover rounded-[1.5rem] border bg-gradient-to-br p-5 shadow-sm",
        metricToneClasses[tone],
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-black text-slate-600">{label}</p>
        <span className={["h-2.5 w-2.5 rounded-full", metricDotClasses[tone]].join(" ")} />
      </div>
      <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">{value}</p>
      {description ? <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p> : null}
    </div>
  );

  return href ? <Link href={href} className="block">{card}</Link> : card;
}

export function VipSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="vip-card rounded-[1.75rem] p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-slate-950">{title}</h2>
          {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
        </div>
        {action ? <div>{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function VipActionCard({
  title,
  description,
  href,
  cta,
  dark = false,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
  dark?: boolean;
}) {
  return (
    <Link
      href={href}
      className={[
        "block rounded-[1.5rem] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        dark ? "border-white/10 bg-white/10 text-white" : "border-slate-200 bg-white text-slate-950",
      ].join(" ")}
    >
      <h3 className="font-black">{title}</h3>
      <p className={["mt-2 text-sm leading-6", dark ? "text-slate-300" : "text-slate-600"].join(" ")}>
        {description}
      </p>
      <p className={["mt-4 text-sm font-black", dark ? "text-white" : "text-slate-950"].join(" ")}>
        {cta} →
      </p>
    </Link>
  );
}

export function VipEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white/90 p-10 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-sky-100 to-amber-100 text-sm font-black text-slate-950">
        VIP
      </div>
      <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">{description}</p>
      {action ? (
        <Link
          href={action.href}
          className="mt-6 inline-flex rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
