type StatusBadgeProps = {
  status: string | null | undefined;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const label = status
    ? status
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Unknown";

  return (
    <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
      {label}
    </span>
  );
}
