import Link from "next/link";

export function AssetTitleLink({
  assetId,
  title,
  className,
}: {
  assetId: string;
  title: string | null | undefined;
  className?: string;
}) {
  return (
    <Link
      href={`/assets/${assetId}`}
      className={
        className ??
        "text-slate-950 underline-offset-4 transition hover:text-[#0b4a7a] hover:underline"
      }
    >
      {title ?? "Untitled asset"}
    </Link>
  );
}
