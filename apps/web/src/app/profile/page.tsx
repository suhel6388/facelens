"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { useWorkspaceSession } from "@/hooks/use-workspace-session";
import { ApiClientError, usersApi } from "@/lib/api-client";

export default function ProfilePage() {
  const router = useRouter();
  const { me, workspace, refresh } = useWorkspaceSession();
  const [name, setName] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = React.useState(false);

  React.useEffect(() => {
    if (me?.user.name) {
      setName(me.user.name);
    }
  }, [me?.user.name]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await usersApi.updateMe({ name });
      await refresh();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await usersApi.deleteMe();
      toast.success("Account deleted");
      router.push("/login");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to delete account");
    } finally {
      setDeleting(false);
      setConfirmDeleteOpen(false);
    }
  };

  return (
    <AppShell
      title="Profile"
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Personal Details</CardTitle>
            <CardDescription>
              Manage your account identity and email verification status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="profile-name" className="text-sm font-medium text-white">
                  Display Name
                </label>
                <Input
                  id="profile-name"
                  required
                  minLength={2}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-sm font-medium text-white">Email Address</span>
                <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm">
                  <span className="text-muted">{me?.user.email ?? "—"}</span>
                  <StatusBadge
                    status={me?.user.emailVerifiedAt ? "completed" : "consent-required"}
                    label={me?.user.emailVerifiedAt ? "Verified" : "Unverified"}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Button variant="secondary" size="sm" asChild>
                  <Link href="/settings/security">Manage password &amp; sessions</Link>
                </Button>
                <Button type="submit" loading={saving}>
                  Save profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle className="text-danger">Danger Zone</CardTitle>
            <CardDescription>
              Permanently delete your account, active sessions, and personal access.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between gap-4">
            <p className="text-sm text-muted">
              This action is irreversible and immediately revokes all active sessions.
            </p>
            <Button variant="destructive" onClick={() => setConfirmDeleteOpen(true)}>
              Delete account
            </Button>
          </CardContent>
        </Card>

        <ConfirmDialog
          open={confirmDeleteOpen}
          onOpenChange={setConfirmDeleteOpen}
          title="Delete your account?"
          description="Your user account and all active sessions will be permanently removed. This cannot be undone."
          affectedDataNotice="All personal credentials, active sessions, and individual access tokens will be permanently deleted."
          confirmLabel={deleting ? "Deleting..." : "Delete account"}
          destructive
          onConfirm={() => void handleDeleteAccount()}
        />
      </div>
    </AppShell>
  );
}
