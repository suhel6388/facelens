"use client";

import * as React from "react";
import type { SearchDto } from "@app/types";

export interface UsageChartProps {
  searches: SearchDto[];
}

interface DayBucket {
  label: string;
  count: number;
}

function buildLast7DaysBuckets(searches: SearchDto[]): DayBucket[] {
  const now = new Date();
  const buckets: DayBucket[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(now);
    day.setDate(now.getDate() - offset);
    const key = day.toISOString().slice(0, 10);
    const label = day.toLocaleDateString("en-US", { weekday: "short" });
    const count = searches.filter((s) => s.createdAt.slice(0, 10) === key).length;
    buckets.push({ label, count });
  }

  return buckets;
}

export function UsageChart({ searches }: UsageChartProps) {
  const buckets = React.useMemo(() => buildLast7DaysBuckets(searches), [searches]);
  const maxCount = Math.max(1, ...buckets.map((b) => b.count));

  return (
    <div className="flex flex-col gap-3">
      <div
        className="flex h-36 items-end justify-between gap-2 rounded-lg border border-border bg-surface/60 px-4 pb-3 pt-4"
        role="img"
        aria-label="7-day search activity bar chart"
      >
        {buckets.map((bucket) => {
          const heightPercent = Math.max(8, Math.round((bucket.count / maxCount) * 100));
          return (
            <div key={bucket.label} className="flex flex-1 flex-col items-center gap-2">
              <span className="text-xs tabular-nums text-muted">{bucket.count}</span>
              <div className="flex h-20 w-full items-end justify-center">
                <div
                  className="w-full max-w-[28px] rounded-t-md bg-gradient-to-t from-secondary to-primary transition-all duration-300"
                  style={{ height: `${heightPercent}%` }}
                  title={`${bucket.label}: ${bucket.count} searches`}
                />
              </div>
              <span className="text-[11px] font-medium text-muted">{bucket.label}</span>
            </div>
          );
        })}
      </div>
      <p className="type-support">
        Daily comparison requests over the past 7 days within your active workspace.
      </p>
    </div>
  );
}
