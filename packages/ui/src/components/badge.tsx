import * as React from "react";
import { AlertTriangle, Archive, CheckCircle2, Clock, Loader2, XCircle } from "lucide-react";
import { cn } from "../utils";

export type BadgeStatus =
  "queued" | "processing" | "completed" | "failed" | "consent-required" | "archived";

const STATUS_MAP: Record<
  BadgeStatus,
  { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
> = {
  queued: {
    label: "Queued",
    classes: "border-[#6575FF]/30 bg-[#6575FF]/15 text-[#A5B4FC]",
    Icon: Clock,
  },
  processing: {
    label: "Processing",
    classes: "border-[#6575FF]/40 bg-[#6575FF]/20 text-white",
    Icon: Loader2,
  },
  completed: {
    label: "Completed",
    classes: "border-[#22C55E]/30 bg-[#22C55E]/15 text-[#86EFAC]",
    Icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    classes: "border-[#EF4444]/35 bg-[#EF4444]/15 text-[#FCA5A5]",
    Icon: XCircle,
  },
  "consent-required": {
    label: "Consent required",
    classes: "border-[#F59E0B]/35 bg-[#F59E0B]/15 text-[#FCD34D]",
    Icon: AlertTriangle,
  },
  archived: {
    label: "Archived",
    classes: "border-[#252A35] bg-[#1B202B] text-[#9CA3AF]",
    Icon: Archive,
  },
};

export interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
  className?: string;
}

/**
 * Status badge that always pairs color with text and an icon.
 */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const config = STATUS_MAP[status];
  const Icon = config.Icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        config.classes,
        className,
      )}
    >
      <Icon
        className={cn("h-3.5 w-3.5 shrink-0", status === "processing" && "animate-spin")}
        aria-hidden="true"
      />
      <span>{label ?? config.label}</span>
    </span>
  );
}
