import Link from "next/link";

type VipPageHeaderProps = {
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
  children?: React.ReactNode;
};

export function VipPageHeader({
  eyebrow,
  title,
  description,
  primaryAction,
  secondaryAction,
  children,
}: VipPageHeaderProps) {
  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-sky-100 blur-3xl" />
      <div className="absolute bottom-0 right-20 h-32 w-32 rounded-full bg-amber-100 blur-3xl" />

      <div className="relative">
        {eyebrow ? (
          <p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-700">
            {eyebrow}
          </p>
        ) : null}

        <div className="mt-3 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="max-w-4xl text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              {title}
            </h1>

            {description ? (
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                {description}
              </p>
            ) : null}
          </div>

          {(primaryAction || secondaryAction) ? (
            <div className="flex flex-wrap gap-3">
              {secondaryAction ? (
                <Link
                  href={secondaryAction.href}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {secondaryAction.label}
                </Link>
              ) : null}

              {primaryAction ? (
                <Link
                  href={primaryAction.href}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-md"
                >
                  {primaryAction.label}
                </Link>
              ) : null}
            </div>
          ) : null}
        </div>

        {children ? <div className="mt-6">{children}</div> : null}
      </div>
    </section>
  );
}
