"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { WorkspaceDetailDto, WorkspaceMemberDto } from "@app/types";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  StatusBadge,
} from "@app/ui";
import { AppShell } from "@/components/layout/app-shell";
import { useWorkspaceSession } from "@/hooks/use-workspace-session";
import { ApiClientError, workspacesApi } from "@/lib/api-client";

export default function SettingsPage() {
  const { me, workspace, refresh } = useWorkspaceSession();
  const [detail, setDetail] = React.useState<WorkspaceDetailDto | null>(null);
  const [members, setMembers] = React.useState<WorkspaceMemberDto[]>([]);
  const [wsName, setWsName] = React.useState("");
  const [retentionDays, setRetentionDays] = React.useState(30);
  const [savingWs, setSavingWs] = React.useState(false);

  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"MEMBER" | "VIEWER" | "OWNER">("MEMBER");
  const [inviting, setInviting] = React.useState(false);

  const loadSettings = React.useCallback(async () => {
    if (!workspace?.id) return;
    try {
      const [wsDetail, wsMembers] = await Promise.all([
        workspacesApi.getDetail(workspace.id),
        workspacesApi.listMembers(workspace.id),
      ]);
      setDetail(wsDetail);
      setWsName(wsDetail.name);
      setRetentionDays(wsDetail.retentionDays);
      setMembers(wsMembers);
    } catch {
      toast.error("Unable to load workspace settings");
    }
  }, [workspace?.id]);

  React.useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    setSavingWs(true);
    try {
      const updated = await workspacesApi.update(workspace.id, {
        name: wsName,
        retentionDays: Number(retentionDays),
      });
      setDetail(updated);
      await refresh();
      toast.success("Workspace settings saved");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to update workspace");
    } finally {
      setSavingWs(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    setInviting(true);
    try {
      await workspacesApi.addMember(workspace.id, { email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      toast.success("Member added to workspace");
      await loadSettings();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to add member");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!workspace?.id) return;
    try {
      await workspacesApi.removeMember(workspace.id, memberId);
      toast.success("Member removed");
      await loadSettings();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to remove member");
    }
  };

  const isOwner = detail?.role === "OWNER" || workspace?.role === "OWNER";

  return (
    <AppShell
      title="Settings"
      workspaceName={detail?.name ?? workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Workspace Configuration</CardTitle>
              <CardDescription>
                Manage workspace identity and automated search retention policy.
              </CardDescription>
            </div>
            <Button variant="secondary" size="sm" asChild>
              <Link href="/settings/security">Security &amp; Sessions</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveWorkspace} className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="ws-name" className="text-sm font-medium text-white">
                  Workspace Name
                </label>
                <Input
                  id="ws-name"
                  required
                  minLength={2}
                  value={wsName}
                  disabled={!isOwner}
                  onChange={(e) => setWsName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="ws-retention" className="text-sm font-medium text-white">
                  Search Retention (days)
                </label>
                <Input
                  id="ws-retention"
                  type="number"
                  min={1}
                  max={365}
                  value={retentionDays}
                  disabled={!isOwner}
                  onChange={(e) => setRetentionDays(Number(e.target.value))}
                />
              </div>

              {isOwner ? (
                <div className="sm:col-span-2 flex justify-end">
                  <Button type="submit" loading={savingWs}>
                    Save workspace settings
                  </Button>
                </div>
              ) : null}
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Members</CardTitle>
            <CardDescription>
              Control role-based access to private collections and similarity searches.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            {isOwner ? (
              <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as "MEMBER" | "VIEWER" | "OWNER")}
                  aria-label="Member role"
                  className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                >
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                  <option value="OWNER">Owner</option>
                </select>
                <Button type="submit" loading={inviting} className="shrink-0">
                  Add member
                </Button>
              </form>
            ) : null}

            <ul className="divide-y divide-border/60">
              {members.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-white">{m.name}</p>
                    <p className="text-xs text-muted">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status="completed" label={m.role} />
                    {isOwner && m.userId !== me?.user.id ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRemoveMember(m.id)}
                      >
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
