import Link from "next/link";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-xl font-black text-slate-500">
        VIP
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {description}
      </p>

      {action ? (
        <Link
          href={action.href}
          className="mt-5 inline-flex rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
