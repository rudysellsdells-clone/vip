import Link from "next/link";

type VipMetricCardProps = {
  label: string;
  value: number | string;
  description?: string;
  href?: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "purple";
};

const toneClasses = {
  neutral: "from-slate-50 to-white border-slate-200",
  success: "from-emerald-50 to-white border-emerald-100",
  warning: "from-amber-50 to-white border-amber-100",
  danger: "from-rose-50 to-white border-rose-100",
  info: "from-sky-50 to-white border-sky-100",
  purple: "from-violet-50 to-white border-violet-100",
};

const dotClasses = {
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
}: VipMetricCardProps) {
  const card = (
    <div
      className={[
        "group rounded-[1.5rem] border bg-gradient-to-br p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        toneClasses[tone],
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-slate-600">{label}</p>
        <span className={["h-2.5 w-2.5 rounded-full", dotClasses[tone]].join(" ")} />
      </div>

      <p className="mt-4 text-4xl font-black tracking-tight text-slate-950">
        {value}
      </p>

      {description ? (
        <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {card}
      </Link>
    );
  }

  return card;
}
