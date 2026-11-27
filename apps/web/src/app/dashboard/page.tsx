"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Input,
  StatusBadge,
} from "@app/ui";
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardPage() {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [collectionFilter, setCollectionFilter] = React.useState("");

  return (
    <AppShell title="Overview" workspaceName="Authorized Demo Workspace">
      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Comparisons this month</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="type-support">Ready for Phase 3–6 backend wiring</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active collections</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status="consent-required" label="Consent gated" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Enrolled images</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="type-support">Private object storage only</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Remaining plan usage</CardDescription>
              <CardTitle className="text-2xl">100%</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge status="completed" label="Active" />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Design System &amp; Interactive Controls Preview</CardTitle>
            <CardDescription>
              Verifying FaceLens dark theme tokens, accessible inputs, status badges, toast
              notifications, and confirmation dialogs.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="queued" />
              <StatusBadge status="processing" />
              <StatusBadge status="completed" />
              <StatusBadge status="failed" />
              <StatusBadge status="consent-required" />
              <StatusBadge status="archived" />
            </div>

            <div className="max-w-md">
              <Input
                label="Filter collections"
                placeholder="Search by collection name..."
                helperText="Only collections you are authorized to access appear here."
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="primary"
                onClick={() =>
                  toast.success("Notification system ready", {
                    description: "FaceLens dark-theme toast notifications are active.",
                  })
                }
              >
                Test toast notification
              </Button>
              <Button variant="destructive" onClick={() => setDialogOpen(true)}>
                Preview consent withdrawal dialog
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Withdraw consent and remove image?"
        description="This immediately disables the image from future comparisons in your workspace."
        affectedDataNotice="Affected data: original private image file, derived similarity representation, and queued jobs. This action cannot be undone."
        confirmLabel="Withdraw consent"
        destructive
        onConfirm={() => {
          setDialogOpen(false);
          toast.info("Consent withdrawal preview confirmed");
        }}
      />
    </AppShell>
  );
}
