import Link from "next/link";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  secondaryAction?: {
    label: string;
    href: string;
  };
};

export function PageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
}: PageHeaderProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      {eyebrow ? (
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          {eyebrow}
        </p>
      ) : null}

      <div className="mt-2 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
              {description}
            </p>
          ) : null}
        </div>

        {(primaryAction || secondaryAction) ? (
          <div className="flex flex-wrap gap-3">
            {secondaryAction ? (
              <Link
                href={secondaryAction.href}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
              >
                {secondaryAction.label}
              </Link>
            ) : null}
            {primaryAction ? (
              <Link
                href={primaryAction.href}
                className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {primaryAction.label}
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
