import { formatVipStatus, getVipStatusClasses } from "@/lib/ui/vip-status";

export function VipStatusBadge({
  status,
  subtle = false,
}: {
  status: string | null | undefined;
  subtle?: boolean;
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        getVipStatusClasses(status),
        subtle ? "shadow-none" : "shadow-sm",
      ].join(" ")}
    >
      {formatVipStatus(status)}
    </span>
  );
}
