"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import type { SessionDto } from "@app/types";
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

export default function SecuritySettingsPage() {
  const router = useRouter();
  const [sessions, setSessions] = React.useState<SessionDto[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  const loadSessions = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await authApi.listSessions();
      setSessions(list);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace("/login?next=/settings/security");
        return;
      }
      toast.error("Unable to load active sessions");
    } finally {
      setLoading(false);
    }
  }, [router]);

  React.useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const handleRevoke = async (sessionId: string) => {
    setRevokingId(sessionId);
    try {
      await authApi.revokeSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success("Session revoked");
    } catch {
      toast.error("Failed to revoke session");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <AppShell title="Security & Sessions">
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Review and revoke active sessions across devices. Revoking a session immediately
            invalidates its refresh token.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-28 animate-pulse rounded-xl bg-surface" />
          ) : sessions.length === 0 ? (
            <p className="text-sm text-muted">No active sessions found.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {session.userAgent ?? "Browser session"}
                      </p>
                      {session.current ? <StatusBadge status="completed" label="Current" /> : null}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      IP: {session.ipAddress ?? "Unknown"} &bull; Created{" "}
                      {new Date(session.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    loading={revokingId === session.id}
                    onClick={() => handleRevoke(session.id)}
                  >
                    Revoke
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppShell>
  );
}
