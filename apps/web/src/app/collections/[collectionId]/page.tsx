"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CollectionDto, CollectionImageDto, ConsentRecordDto } from "@app/types";
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
import { ImageUploadDropzone } from "@/components/uploads/image-upload-dropzone";
import { useWorkspaceSession } from "@/hooks/use-workspace-session";
import { ApiClientError, collectionsApi, consentApi, uploadsApi } from "@/lib/api-client";

export default function CollectionDetailPage() {
  const params = useParams<{ collectionId: string }>();
  const router = useRouter();
  const collectionId = params.collectionId;
  const { me, workspace } = useWorkspaceSession();

  const [collection, setCollection] = React.useState<CollectionDto | null>(null);
  const [images, setImages] = React.useState<CollectionImageDto[]>([]);
  const [consents, setConsents] = React.useState<ConsentRecordDto[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Edit form
  const [name, setName] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState<"ACTIVE" | "ARCHIVED">("ACTIVE");
  const [saving, setSaving] = React.useState(false);

  // Confirmations
  const [deleteCollectionOpen, setDeleteCollectionOpen] = React.useState(false);
  const [imageToDelete, setImageToDelete] = React.useState<string | null>(null);
  const [withdrawReason, setWithdrawReason] = React.useState(
    "Subject requested removal from private collection.",
  );

  const loadAll = React.useCallback(async () => {
    if (!workspace?.id || !collectionId) return;
    setLoading(true);
    try {
      const [col, imgs, recs] = await Promise.all([
        collectionsApi.getById(workspace.id, collectionId),
        uploadsApi.listImages(workspace.id, collectionId),
        consentApi.listByCollection(workspace.id, collectionId),
      ]);
      setCollection(col);
      setName(col.name);
      setPurpose(col.purpose);
      setDescription(col.description ?? "");
      setStatus(col.status === "ARCHIVED" ? "ARCHIVED" : "ACTIVE");
      setImages(imgs);
      setConsents(recs);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Collection not found");
      router.replace("/collections");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, collectionId, router]);

  React.useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const canWrite = workspace?.role === "OWNER" || workspace?.role === "MEMBER";

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id || !collectionId) return;
    setSaving(true);
    try {
      const updated = await collectionsApi.update(workspace.id, collectionId, {
        name,
        purpose,
        description: description.trim() ? description.trim() : null,
        status,
      });
      setCollection(updated);
      toast.success("Collection updated");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to update collection");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!workspace?.id || !collectionId) return;
    try {
      await collectionsApi.remove(workspace.id, collectionId);
      toast.success("Collection deleted");
      router.push("/collections");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to delete collection");
    }
  };

  const handleDeleteImage = async () => {
    if (!workspace?.id || !imageToDelete) return;
    try {
      await uploadsApi.deleteImage(workspace.id, imageToDelete);
      toast.success("Image deleted from private storage");
      setImageToDelete(null);
      await loadAll();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to delete image");
    }
  };

  const handleWithdrawConsent = async (imageId: string) => {
    if (!workspace?.id) return;
    if (withdrawReason.trim().length < 5) {
      toast.error("Please enter a withdrawal reason (at least 5 characters).");
      return;
    }
    try {
      await consentApi.withdraw(workspace.id, imageId, withdrawReason.trim());
      toast.success("Consent withdrawn");
      await loadAll();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to withdraw consent");
    }
  };

  return (
    <AppShell
      title={collection?.name ?? "Collection Details"}
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/collections">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Collections
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <StatusBadge status="completed" label={`Role: ${workspace?.role ?? "—"}`} />
            <Link href="/settings" className="text-xs font-medium text-secondary hover:underline">
              Member permissions
            </Link>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Collection Settings</CardTitle>
              <CardDescription>
                Update collection metadata, authorized purpose, or archive status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted">Loading collection...</p>
              ) : (
                <form onSubmit={handleUpdate} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="detail-name" className="text-sm font-medium text-white">
                      Name
                    </label>
                    <Input
                      id="detail-name"
                      required
                      minLength={2}
                      disabled={!canWrite}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="detail-purpose" className="text-sm font-medium text-white">
                      Authorized Purpose
                    </label>
                    <Input
                      id="detail-purpose"
                      required
                      minLength={10}
                      disabled={!canWrite}
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="detail-desc" className="text-sm font-medium text-white">
                      Description
                    </label>
                    <Input
                      id="detail-desc"
                      disabled={!canWrite}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="detail-status" className="text-sm font-medium text-white">
                      Status
                    </label>
                    <select
                      id="detail-status"
                      disabled={!canWrite}
                      value={status}
                      onChange={(e) => setStatus(e.target.value as "ACTIVE" | "ARCHIVED")}
                      className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                    >
                      <option value="ACTIVE">ACTIVE</option>
                      <option value="ARCHIVED">ARCHIVED</option>
                    </select>
                  </div>

                  {canWrite ? (
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => setDeleteCollectionOpen(true)}
                      >
                        Delete collection
                      </Button>
                      <Button type="submit" loading={saving}>
                        Save changes
                      </Button>
                    </div>
                  ) : null}
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enroll Authorized Image</CardTitle>
              <CardDescription>
                Upload directly to private storage with magic-byte checks and metadata stripping.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {workspace?.id && collectionId ? (
                <ImageUploadDropzone
                  workspaceId={workspace.id}
                  collectionId={collectionId}
                  disabled={!canWrite || status !== "ACTIVE"}
                  onUploaded={loadAll}
                />
              ) : null}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Enrolled Images ({images.length})</CardTitle>
              <CardDescription>
                Private images with consent tracking and instant deletion.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="withdraw-reason" className="text-xs text-muted">
                Withdrawal reason:
              </label>
              <Input
                id="withdraw-reason"
                className="h-8 w-64 text-xs"
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent>
            {images.length === 0 ? (
              <p className="text-sm text-muted">No images enrolled in this collection yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {images.map((img) => (
                  <div
                    key={img.id}
                    className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-3.5"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-white">{img.id.slice(0, 8)}</span>
                        <StatusBadge
                          status={img.consentStatus === "GRANTED" ? "completed" : "failed"}
                          label={img.consentStatus}
                        />
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        {img.mimeType} &middot; {img.width}&times;{img.height}px &middot;{" "}
                        {(img.sizeBytes / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    {canWrite ? (
                      <div className="flex items-center justify-between gap-2 pt-1">
                        {img.consentStatus === "GRANTED" ? (
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleWithdrawConsent(img.id)}
                          >
                            Withdraw consent
                          </Button>
                        ) : (
                          <span className="text-xs text-muted">Consent withdrawn</span>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Delete image"
                          onClick={() => setImageToDelete(img.id)}
                        >
                          <Trash2 className="h-4 w-4 text-danger" aria-hidden="true" />
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Authorization &amp; Consent Records ({consents.length})</CardTitle>
            <CardDescription>
              Immutable audit trail of documented permissions and consent withdrawals.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {consents.length === 0 ? (
              <p className="text-sm text-muted">No authorization records yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted">
                      <th className="py-2 pr-4 font-medium">Image ID</th>
                      <th className="py-2 pr-4 font-medium">Authorization Basis</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Recorded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {consents.map((rec) => (
                      <tr key={rec.id}>
                        <td className="py-2.5 pr-4 font-mono text-xs text-white">
                          {rec.collectionImageId.slice(0, 8)}
                        </td>
                        <td className="py-2.5 pr-4 text-muted">{rec.authorizationBasis}</td>
                        <td className="py-2.5 pr-4">
                          <StatusBadge
                            status={rec.status === "GRANTED" ? "completed" : "failed"}
                            label={rec.status}
                          />
                        </td>
                        <td className="py-2.5 text-muted">
                          {new Date(rec.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmDialog
          open={deleteCollectionOpen}
          onOpenChange={setDeleteCollectionOpen}
          title="Delete this collection?"
          description="This marks the collection as deleted and prevents future searches against it."
          affectedDataNotice="All enrolled images and consent associations in this collection will no longer be searchable."
          confirmLabel="Delete collection"
          destructive
          onConfirm={() => void handleDeleteCollection()}
        />

        <ConfirmDialog
          open={Boolean(imageToDelete)}
          onOpenChange={(open) => {
            if (!open) setImageToDelete(null);
          }}
          title="Delete enrolled image?"
          description="The image binary will be removed from private storage immediately."
          affectedDataNotice="Stored image data and future similarity matching for this image will be permanently removed."
          confirmLabel="Delete image"
          destructive
          onConfirm={() => void handleDeleteImage()}
        />
      </div>
    </AppShell>
  );
}
