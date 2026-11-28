"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { BillingOverviewDto, CollectionDto, SearchDto } from "@app/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "@app/ui";
import { UsageChart } from "@/components/dashboard/usage-chart";
import { AppShell } from "@/components/layout/app-shell";
import { useWorkspaceSession } from "@/hooks/use-workspace-session";
import { billingApi, collectionsApi, searchesApi } from "@/lib/api-client";

export default function DashboardPage() {
  const { me, workspace, loading: sessionLoading } = useWorkspaceSession();
  const [collections, setCollections] = React.useState<CollectionDto[]>([]);
  const [searches, setSearches] = React.useState<SearchDto[]>([]);
  const [totalSearches, setTotalSearches] = React.useState(0);
  const [billing, setBilling] = React.useState<BillingOverviewDto | null>(null);
  const [widgetsLoading, setWidgetsLoading] = React.useState(false);

  React.useEffect(() => {
    if (!workspace?.id) return;
    let active = true;
    setWidgetsLoading(true);

    Promise.all([
      collectionsApi.list(workspace.id),
      searchesApi.list(workspace.id, 1, 20),
      billingApi.getOverview(workspace.id),
    ])
      .then(([cols, searchRes, billingRes]) => {
        if (!active) return;
        setCollections(cols);
        setSearches(searchRes.items);
        setTotalSearches(searchRes.meta.total);
        setBilling(billingRes);
      })
      .catch(() => {
        if (active) toast.error("Unable to load some workspace metrics");
      })
      .finally(() => {
        if (active) setWidgetsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [workspace?.id]);

  const activeCollections = collections.filter((c) => c.status === "ACTIVE");
  const totalEnrolledImages = collections.reduce((sum, c) => sum + c.imageCount, 0);
  const completedSearches = searches.filter((s) => s.status === "COMPLETED").length;
  const planCode = billing?.subscription?.planCode ?? "FREE";
  const monthlyLimit = billing?.subscription?.monthlySearchLimit ?? 25;
  const monthlyUsed = billing?.monthlySearchesUsed ?? 0;
  const usagePct = Math.min(100, Math.round((monthlyUsed / Math.max(1, monthlyLimit)) * 100));

  return (
    <AppShell
      title="Overview"
      workspaceName={workspace?.name ?? "Loading workspace..."}
      userName={me?.user.name}
    >
      <div className="flex flex-col gap-6">
        {!sessionLoading && me && !me.user.emailVerifiedAt ? (
          <Card className="border-warning/40 bg-warning/10">
            <CardContent className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <StatusBadge status="consent-required" label="Email verification pending" />
                <p className="text-sm text-white">
                  Verify your email address to enable collection enrollment and comparisons.
                </p>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/verify-email">Verify email</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {/* Top KPI Row: Search statistics, Active collections, Monthly usage, Subscription status */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Search statistics</CardDescription>
              <CardTitle className="text-2xl">{widgetsLoading ? "—" : totalSearches}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="type-support">
                {completedSearches} completed &middot; private collections only
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active collections</CardDescription>
              <CardTitle className="text-2xl">
                {widgetsLoading ? "—" : activeCollections.length}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="type-support">{totalEnrolledImages} enrolled images</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Monthly usage</CardDescription>
              <CardTitle className="text-2xl">
                {widgetsLoading ? "—" : `${monthlyUsed} / ${monthlyLimit}`}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all"
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              <p className="type-support">{usagePct}% of monthly search quota</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Subscription status</CardDescription>
              <CardTitle className="text-2xl">{planCode}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <StatusBadge
                status={billing?.subscription?.status === "PAST_DUE" ? "failed" : "completed"}
                label={billing?.subscription?.status ?? "ACTIVE"}
              />
              <Link href="/billing" className="text-xs font-medium text-secondary hover:underline">
                Manage plan
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Middle Row: Usage Chart + Active Collections */}
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Usage chart</CardTitle>
                <CardDescription>Daily comparison requests across your workspace</CardDescription>
              </div>
              <Button size="sm" asChild>
                <Link href="/search/new">New search</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <UsageChart searches={searches} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <div>
                <CardTitle>Active collections</CardTitle>
                <CardDescription>Consent-gated private galleries</CardDescription>
              </div>
              <Link
                href="/collections"
                className="text-xs font-medium text-secondary hover:underline"
              >
                View all
              </Link>
            </CardHeader>
            <CardContent>
              {activeCollections.length === 0 ? (
                <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-4 text-center">
                  <p className="text-sm text-muted">No active collections yet.</p>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href="/collections">Create collection</Link>
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {activeCollections.slice(0, 4).map((col) => (
                    <li
                      key={col.id}
                      className="flex items-center justify-between rounded-lg border border-border bg-surface px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">{col.name}</p>
                        <p className="truncate text-xs text-muted">
                          {col.imageCount} images &middot; {col.purpose}
                        </p>
                      </div>
                      <StatusBadge status="completed" label="Active" />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row: Recent Activity */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Recent activity</CardTitle>
              <CardDescription>Latest similarity comparison jobs in this workspace</CardDescription>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/history">Search history</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {searches.length === 0 ? (
              <p className="text-sm text-muted">
                No searches have been run yet. Start a comparison from New Search.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted">
                      <th className="py-2 pr-4 font-medium">Search ID</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Results</th>
                      <th className="py-2 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {searches.slice(0, 5).map((s) => (
                      <tr key={s.id}>
                        <td className="py-2.5 pr-4 font-mono text-xs text-white">
                          {s.id.slice(0, 8)}...
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge
                            status={
                              s.status === "COMPLETED"
                                ? "completed"
                                : s.status === "FAILED"
                                  ? "failed"
                                  : "queued"
                            }
                            label={s.status}
                          />
                        </td>
                        <td className="py-2.5 pr-4 text-muted">{s.resultCount}</td>
                        <td className="py-2.5 text-muted">
                          {new Date(s.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
