"use client";

import * as React from "react";
import { toast } from "sonner";
import type { BillingOverviewDto, InvoiceDto } from "@app/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  StatusBadge,
} from "@app/ui";
import { AppShell } from "@/components/layout/app-shell";
import { useWorkspaceSession } from "@/hooks/use-workspace-session";
import { ApiClientError, billingApi } from "@/lib/api-client";

const PLANS = [
  { code: "FREE", name: "Free", price: "$0/mo", limit: "25 searches / month" },
  { code: "PRO", name: "Pro", price: "$99/mo", limit: "2,000 searches / month" },
  { code: "BUSINESS", name: "Business", price: "$299/mo", limit: "15,000 searches / month" },
] as const;

export default function BillingPage() {
  const { me, workspace } = useWorkspaceSession();
  const [overview, setOverview] = React.useState<BillingOverviewDto | null>(null);
  const [invoices, setInvoices] = React.useState<InvoiceDto[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [updatingPlan, setUpdatingPlan] = React.useState<string | null>(null);

  const loadBilling = React.useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const [data, invs] = await Promise.all([
        billingApi.getOverview(workspace.id),
        billingApi.listInvoices(workspace.id),
      ]);
      setOverview(data);
      setInvoices(invs);
    } catch {
      toast.error("Unable to load billing information");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  React.useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const handleSelectPlan = async (planCode: "FREE" | "PRO" | "BUSINESS") => {
    if (!workspace?.id) return;
    setUpdatingPlan(planCode);
    try {
      await billingApi.updateSubscription(workspace.id, { planCode });
      if (planCode !== "FREE") {
        await billingApi.createCheckout(workspace.id, { planCode, currency: "USD" });
      }
      toast.success(`Workspace plan updated to ${planCode}`);
      await loadBilling();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to update subscription");
    } finally {
      setUpdatingPlan(null);
    }
  };

  const currentPlan = overview?.subscription?.planCode ?? "FREE";
  const limit = overview?.subscription?.monthlySearchLimit ?? 25;
  const used = overview?.monthlySearchesUsed ?? 0;

  return (
    <AppShell
      title="Billing"
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Status</CardTitle>
              <CardDescription>Active workspace plan and renewal cycle</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold text-white">{currentPlan}</p>
                <p className="mt-1 text-xs text-muted">
                  {overview?.subscription?.currentPeriodEnd
                    ? `Renews ${new Date(overview.subscription.currentPeriodEnd).toLocaleDateString()}`
                    : "Standard workspace tier"}
                </p>
              </div>
              <StatusBadge
                status={overview?.subscription?.status === "PAST_DUE" ? "failed" : "completed"}
                label={overview?.subscription?.status ?? "ACTIVE"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Monthly Quota</CardTitle>
              <CardDescription>Backend-enforced similarity searches this period</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-2xl font-semibold text-white">
                {loading ? "—" : `${used} / ${limit}`}
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-secondary to-primary"
                  style={{
                    width: `${Math.min(100, Math.round((used / Math.max(1, limit)) * 100))}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>
              Choose Free, Pro, or Business tier for your workspace. Checkout integrates with
              Razorpay payment verification.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((plan) => {
              const isCurrent = currentPlan === plan.code;
              return (
                <div
                  key={plan.code}
                  className="flex flex-col justify-between gap-4 rounded-xl border border-border bg-surface p-4"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-white">{plan.name}</h3>
                      {isCurrent ? <StatusBadge status="completed" label="Current" /> : null}
                    </div>
                    <p className="mt-2 text-2xl font-bold text-white">{plan.price}</p>
                    <p className="mt-1 text-xs text-muted">{plan.limit}</p>
                  </div>
                  <Button
                    variant={isCurrent ? "secondary" : "primary"}
                    size="sm"
                    disabled={isCurrent}
                    loading={updatingPlan === plan.code}
                    onClick={() => void handleSelectPlan(plan.code)}
                  >
                    {isCurrent ? "Active plan" : `Switch to ${plan.name}`}
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>Issued invoices and Razorpay payment records</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <p className="text-sm text-muted">No invoices issued yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted">
                      <th className="py-2 pr-4 font-medium">Invoice #</th>
                      <th className="py-2 pr-4 font-medium">Amount</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="py-2.5 pr-4 font-mono text-xs text-white">
                          {inv.invoiceNumber}
                        </td>
                        <td className="py-2.5 pr-4 text-white">
                          ${(inv.amountCents / 100).toFixed(2)} {inv.currency}
                        </td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge
                            status={inv.status === "SUCCEEDED" ? "completed" : "queued"}
                            label={inv.status}
                          />
                        </td>
                        <td className="py-2.5 text-muted">
                          {new Date(inv.issuedAt).toLocaleDateString()}
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
