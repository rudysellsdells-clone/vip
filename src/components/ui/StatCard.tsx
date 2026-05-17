import Link from "next/link";

type StatCardProps = {
  label: string;
  value: number | string;
  description?: string;
  href?: string;
};

export function StatCard({ label, value, description, href }: StatCardProps) {
  const content = (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-bold text-slate-950">{value}</p>
      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
