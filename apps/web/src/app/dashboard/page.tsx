"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AuthMeDto } from "@app/types";
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
import { ApiClientError, authApi } from "@/lib/api-client";

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = React.useState<AuthMeDto | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let active = true;
    authApi
      .me()
      .then((data) => {
        if (active) setMe(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiClientError && err.status === 401) {
          router.replace("/login?next=/dashboard");
          return;
        }
        toast.error("Unable to load workspace session");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  const primaryWorkspace = me?.workspaces[0];

  return (
    <AppShell
      title="Overview"
      workspaceName={primaryWorkspace?.name ?? "Loading workspace..."}
      userName={me?.user.name}
    >
      <div className="flex flex-col gap-6">
        {!loading && me && !me.user.emailVerifiedAt ? (
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

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Comparisons this month</CardDescription>
              <CardTitle className="text-2xl">0</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="type-support">Authorized private collections only</p>
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
              <CardDescription>Workspace role</CardDescription>
              <CardTitle className="text-2xl">{primaryWorkspace?.role ?? "—"}</CardTitle>
            </CardHeader>
            <CardContent>
              <StatusBadge
                status={me?.user.emailVerifiedAt ? "completed" : "queued"}
                label={me?.user.emailVerifiedAt ? "Verified" : "Unverified"}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {loading
                ? "Loading workspace..."
                : me
                  ? `Welcome, ${me.user.name}`
                  : "Workspace Overview"}
            </CardTitle>
            <CardDescription>
              Your session is protected with HttpOnly cookies and CSRF verification. Manage active
              sessions and account security below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="secondary" asChild>
              <Link href="/settings/security">Manage active sessions</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
