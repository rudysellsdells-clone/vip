import { formatVipStatus, getVipStatusClasses } from "@/lib/ui/vip-status";

export function VipStatusBadge({
  status,
  size = "sm",
}: {
  status: string | null | undefined;
  size?: "xs" | "sm";
}) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-extrabold shadow-sm",
        size === "xs" ? "px-2.5 py-0.5 text-[11px]" : "px-3 py-1 text-xs",
        getVipStatusClasses(status),
      ].join(" ")}
    >
      {formatVipStatus(status)}
    </span>
  );
}
