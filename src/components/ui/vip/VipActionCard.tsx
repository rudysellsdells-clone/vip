import Link from "next/link";

type VipActionCardProps = {
  title: string;
  description: string;
  href: string;
  cta: string;
  tone?: "dark" | "light";
};

export function VipActionCard({
  title,
  description,
  href,
  cta,
  tone = "light",
}: VipActionCardProps) {
  const dark = tone === "dark";

  return (
    <Link
      href={href}
      className={[
        "block rounded-[1.5rem] border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
        dark
          ? "border-slate-700 bg-slate-900 text-white"
          : "border-slate-200 bg-white text-slate-950",
      ].join(" ")}
    >
      <h3 className="font-black">{title}</h3>
      <p
        className={[
          "mt-2 text-sm leading-6",
          dark ? "text-slate-300" : "text-slate-600",
        ].join(" ")}
      >
        {description}
      </p>
      <p
        className={[
          "mt-4 text-sm font-black",
          dark ? "text-white" : "text-slate-950",
        ].join(" ")}
      >
        {cta} →
      </p>
    </Link>
  );
}
