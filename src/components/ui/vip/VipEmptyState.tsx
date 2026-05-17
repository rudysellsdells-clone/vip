import Link from "next/link";

export function VipEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}) {
  return (
    <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-sky-100 to-amber-100 text-sm font-black text-slate-950">
        VIP
      </div>

      <h3 className="mt-5 text-xl font-black text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-500">
        {description}
      </p>

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
