"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { AdminOverviewDto, AuditLogDto, UserDto } from "@app/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusBadge,
  cn,
} from "@app/ui";
import { AppShell } from "@/components/layout/app-shell";
import { useWorkspaceSession } from "@/hooks/use-workspace-session";
import {
  ApiClientError,
  adminApi,
  type AdminAnalyticsDto,
  type AdminDeletionRequestDto,
  type AdminPaymentSummaryDto,
  type AdminSubscriptionSummaryDto,
  type AdminSystemHealthDto,
  type AdminWorkspaceSummaryDto,
} from "@/lib/api-client";

export type AdminSection =
  | "overview"
  | "users"
  | "workspaces"
  | "subscriptions"
  | "payments"
  | "analytics"
  | "audit-logs"
  | "system-health"
  | "deletion-requests";

const ADMIN_TABS: { id: AdminSection; label: string; href: string }[] = [
  { id: "overview", label: "Overview", href: "/admin" },
  { id: "users", label: "Users", href: "/admin/users" },
  { id: "workspaces", label: "Workspaces", href: "/admin/workspaces" },
  { id: "subscriptions", label: "Subscriptions", href: "/admin/subscriptions" },
  { id: "payments", label: "Payments", href: "/admin/payments" },
  { id: "analytics", label: "Analytics", href: "/admin/analytics" },
  { id: "audit-logs", label: "Audit logs", href: "/admin/audit-logs" },
  { id: "system-health", label: "System health", href: "/admin/system-health" },
  { id: "deletion-requests", label: "Deletion requests", href: "/admin/deletion-requests" },
];

export function AdminPortalView({ section }: { section: AdminSection }) {
  const { me, workspace } = useWorkspaceSession();
  const [forbidden, setForbidden] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  const [overview, setOverview] = React.useState<AdminOverviewDto | null>(null);
  const [users, setUsers] = React.useState<UserDto[]>([]);
  const [workspaces, setWorkspaces] = React.useState<AdminWorkspaceSummaryDto[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<AdminSubscriptionSummaryDto[]>([]);
  const [payments, setPayments] = React.useState<AdminPaymentSummaryDto[]>([]);
  const [analytics, setAnalytics] = React.useState<AdminAnalyticsDto | null>(null);
  const [auditLogs, setAuditLogs] = React.useState<AuditLogDto[]>([]);
  const [health, setHealth] = React.useState<AdminSystemHealthDto | null>(null);
  const [deletions, setDeletions] = React.useState<AdminDeletionRequestDto[]>([]);

  const loadSection = React.useCallback(async () => {
    setLoading(true);
    try {
      if (section === "overview") setOverview(await adminApi.getOverview());
      else if (section === "users") setUsers(await adminApi.listUsers());
      else if (section === "workspaces") setWorkspaces(await adminApi.listWorkspaces());
      else if (section === "subscriptions") setSubscriptions(await adminApi.listSubscriptions());
      else if (section === "payments") setPayments(await adminApi.listPayments());
      else if (section === "analytics") setAnalytics(await adminApi.getAnalytics());
      else if (section === "audit-logs") setAuditLogs(await adminApi.listAuditLogs());
      else if (section === "system-health") setHealth(await adminApi.getSystemHealth());
      else if (section === "deletion-requests") setDeletions(await adminApi.listDeletionRequests());
      setForbidden(false);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 403) {
        setForbidden(true);
      } else {
        toast.error("Unable to load admin data");
      }
    } finally {
      setLoading(false);
    }
  }, [section]);

  React.useEffect(() => {
    void loadSection();
  }, [loadSection]);

  const handlePurge = async (imageId: string) => {
    try {
      await adminApi.purgeDeletionRequest(imageId);
      toast.success("Derived and stored image data purged");
      await loadSection();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to purge image");
    }
  };

  return (
    <AppShell
      title="Platform Admin"
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="flex flex-col gap-6">
        <nav aria-label="Admin sections" className="flex flex-wrap gap-2">
          {ADMIN_TABS.map((tab) => {
            const active = tab.id === section;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "border-primary bg-primary/15 text-white"
                    : "border-border bg-surface text-muted hover:text-white",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>

        {forbidden ? (
          <Card className="border-danger/40">
            <CardHeader>
              <CardTitle className="text-danger">Administrator Access Required</CardTitle>
              <CardDescription>
                Your account does not have the platform ADMIN role required to view administration
                controls.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : loading ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted">Loading {section}...</CardContent>
          </Card>
        ) : (
          <>
            {section === "overview" && overview ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Users</CardDescription>
                    <CardTitle className="text-2xl">{overview.totalUsers}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Workspaces</CardDescription>
                    <CardTitle className="text-2xl">{overview.totalWorkspaces}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Active Collections</CardDescription>
                    <CardTitle className="text-2xl">{overview.totalCollections}</CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Total Searches</CardDescription>
                    <CardTitle className="text-2xl">{overview.totalSearches}</CardTitle>
                  </CardHeader>
                </Card>
              </div>
            ) : null}

            {section === "users" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Users ({users.length})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-muted">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Email</th>
                        <th className="py-2 pr-4">Role</th>
                        <th className="py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {users.map((u) => (
                        <tr key={u.id}>
                          <td className="py-2.5 pr-4 text-white">{u.name}</td>
                          <td className="py-2.5 pr-4 text-muted">{u.email}</td>
                          <td className="py-2.5 pr-4">
                            <StatusBadge status="completed" label={u.role} />
                          </td>
                          <td className="py-2.5 text-muted">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}

            {section === "workspaces" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Workspaces ({workspaces.length})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-muted">
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Retention</th>
                        <th className="py-2 pr-4">Members</th>
                        <th className="py-2">Collections</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {workspaces.map((w) => (
                        <tr key={w.id}>
                          <td className="py-2.5 pr-4 text-white">{w.name}</td>
                          <td className="py-2.5 pr-4 text-muted">{w.retentionDays}d</td>
                          <td className="py-2.5 pr-4 text-muted">{w.memberCount}</td>
                          <td className="py-2.5 text-muted">{w.collectionCount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}

            {section === "subscriptions" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Subscriptions ({subscriptions.length})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-muted">
                        <th className="py-2 pr-4">Workspace</th>
                        <th className="py-2 pr-4">Plan</th>
                        <th className="py-2 pr-4">Limit</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {subscriptions.map((s) => (
                        <tr key={s.id}>
                          <td className="py-2.5 pr-4 text-white">{s.workspaceName}</td>
                          <td className="py-2.5 pr-4 text-muted">{s.planCode}</td>
                          <td className="py-2.5 pr-4 text-muted">{s.monthlySearchLimit}/mo</td>
                          <td className="py-2.5">
                            <StatusBadge status="completed" label={s.status} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}

            {section === "payments" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Payments ({payments.length})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-muted">
                        <th className="py-2 pr-4">Workspace</th>
                        <th className="py-2 pr-4">Amount</th>
                        <th className="py-2 pr-4">Status</th>
                        <th className="py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="py-2.5 pr-4 text-white">{p.workspaceName}</td>
                          <td className="py-2.5 pr-4 text-muted">
                            ${(p.amountCents / 100).toFixed(2)} {p.currency}
                          </td>
                          <td className="py-2.5 pr-4">
                            <StatusBadge
                              status={p.status === "SUCCEEDED" ? "completed" : "queued"}
                              label={p.status}
                            />
                          </td>
                          <td className="py-2.5 text-muted">
                            {new Date(p.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}

            {section === "analytics" && analytics ? (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle>Total Enrolled Images</CardTitle>
                    <CardDescription className="text-2xl text-white">
                      {analytics.totalEnrolledImages}
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Searches by Status</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5 text-sm">
                    {Object.entries(analytics.searchesByStatus).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted">{k}</span>
                        <span className="font-medium text-white">{v}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Consent Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-1.5 text-sm">
                    {Object.entries(analytics.consentsByStatus).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-muted">{k}</span>
                        <span className="font-medium text-white">{v}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            ) : null}

            {section === "audit-logs" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Audit Logs ({auditLogs.length})</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-xs uppercase text-muted">
                        <th className="py-2 pr-4">Action</th>
                        <th className="py-2 pr-4">Resource</th>
                        <th className="py-2 pr-4">Actor</th>
                        <th className="py-2">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {auditLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="py-2.5 pr-4 font-mono text-xs text-white">{log.action}</td>
                          <td className="py-2.5 pr-4 text-muted">
                            {log.resourceType} {log.resourceId?.slice(0, 8)}
                          </td>
                          <td className="py-2.5 pr-4 font-mono text-xs text-muted">
                            {log.actorId?.slice(0, 8) ?? "system"}
                          </td>
                          <td className="py-2.5 text-muted">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            ) : null}

            {section === "system-health" && health ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Express API</CardDescription>
                    <CardTitle className="text-lg">
                      <StatusBadge status="completed" label={health.apiStatus} />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xs text-muted">
                    Uptime: {health.uptimeSeconds}s &middot; RSS: {health.memoryRssMb} MB
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>PostgreSQL</CardDescription>
                    <CardTitle className="text-lg">
                      <StatusBadge
                        status={health.databaseStatus === "ok" ? "completed" : "failed"}
                        label={health.databaseStatus}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>AI Microservice</CardDescription>
                    <CardTitle className="text-lg">
                      <StatusBadge
                        status={health.aiServiceStatus === "ok" ? "completed" : "failed"}
                        label={health.aiServiceStatus}
                      />
                    </CardTitle>
                  </CardHeader>
                </Card>
              </div>
            ) : null}

            {section === "deletion-requests" ? (
              <Card>
                <CardHeader>
                  <CardTitle>Deletion &amp; Withdrawal Queue ({deletions.length})</CardTitle>
                  <CardDescription>
                    Images marked as WITHDRAWN or PENDING_DELETION awaiting physical storage purge.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {deletions.length === 0 ? (
                    <p className="text-sm text-muted">No pending deletion requests.</p>
                  ) : (
                    <ul className="flex flex-col gap-3">
                      {deletions.map((d) => (
                        <li
                          key={d.imageId}
                          className="flex items-center justify-between rounded-lg border border-border bg-surface p-3 text-sm"
                        >
                          <div>
                            <p className="font-mono text-xs text-white">{d.imageId}</p>
                            <p className="text-xs text-muted">
                              Status: {d.consentStatus} &middot; Key: {d.storageKey}
                            </p>
                          </div>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => void handlePurge(d.imageId)}
                          >
                            Purge data
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  );
}
