"use client";

import * as React from "react";
import { toast } from "sonner";
import type { CollectionDto, CollectionImageDto } from "@app/types";
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
import { ApiClientError, collectionsApi, consentApi, uploadsApi } from "@/lib/api-client";

export default function CollectionsPage() {
  const { me, workspace } = useWorkspaceSession();
  const [collections, setCollections] = React.useState<CollectionDto[]>([]);
  const [loading, setLoading] = React.useState(false);

  // Create collection state
  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [purpose, setPurpose] = React.useState("");
  const [authorityConfirmed, setAuthorityConfirmed] = React.useState(false);
  const [creating, setCreating] = React.useState(false);

  // Selected collection images
  const [selectedCollection, setSelectedCollection] = React.useState<CollectionDto | null>(null);
  const [images, setImages] = React.useState<CollectionImageDto[]>([]);

  const loadCollections = React.useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const items = await collectionsApi.list(workspace.id);
      setCollections(items);
    } catch {
      toast.error("Unable to load collections");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id]);

  React.useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    if (!authorityConfirmed) {
      toast.error("You must confirm documented authority to manage this collection.");
      return;
    }

    setCreating(true);
    try {
      await collectionsApi.create(workspace.id, {
        name,
        description: description.trim() ? description.trim() : undefined,
        purpose,
        authorityConfirmed: true,
      });
      toast.success("Authorized collection created");
      setName("");
      setDescription("");
      setPurpose("");
      setAuthorityConfirmed(false);
      await loadCollections();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to create collection");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (collectionId: string) => {
    if (!workspace?.id) return;
    try {
      await collectionsApi.remove(workspace.id, collectionId);
      toast.success("Collection deleted");
      if (selectedCollection?.id === collectionId) {
        setSelectedCollection(null);
        setImages([]);
      }
      await loadCollections();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to delete collection");
    }
  };

  const handleInspectImages = async (col: CollectionDto) => {
    if (!workspace?.id) return;
    setSelectedCollection(col);
    try {
      const imgs = await uploadsApi.listImages(workspace.id, col.id);
      setImages(imgs);
    } catch {
      toast.error("Unable to load collection images");
    }
  };

  const handleWithdrawConsent = async (imageId: string) => {
    if (!workspace?.id || !selectedCollection) return;
    try {
      await consentApi.withdraw(workspace.id, imageId, "Withdrawn by workspace administrator.");
      toast.success("Consent withdrawn");
      await handleInspectImages(selectedCollection);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to withdraw consent");
    }
  };

  return (
    <AppShell
      title="Collections"
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Create Collection</CardTitle>
            <CardDescription>
              All collections require a documented purpose and explicit authority confirmation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="col-name" className="text-sm font-medium text-white">
                  Collection Name
                </label>
                <Input
                  id="col-name"
                  required
                  minLength={2}
                  placeholder="e.g. Facility Badge Directory"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="col-purpose" className="text-sm font-medium text-white">
                  Authorized Purpose
                </label>
                <Input
                  id="col-purpose"
                  required
                  minLength={10}
                  placeholder="Internal access verification with signed consent"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="col-desc" className="text-sm font-medium text-white">
                  Description (optional)
                </label>
                <Input
                  id="col-desc"
                  placeholder="Notes on scope or retention"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <label className="flex items-start gap-2.5 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={authorityConfirmed}
                  onChange={(e) => setAuthorityConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <span>
                  I confirm documented legal authority and subject consent to manage this private
                  collection.
                </span>
              </label>

              <Button type="submit" loading={creating}>
                Create authorized collection
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Authorized Collections</CardTitle>
              <CardDescription>
                Private image galleries isolated to {workspace?.name ?? "your workspace"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-sm text-muted">Loading collections...</p>
              ) : collections.length === 0 ? (
                <p className="text-sm text-muted">
                  No collections found. Create your first authorized collection on the left.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {collections.map((col) => (
                    <div
                      key={col.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-medium text-white">{col.name}</h3>
                          <StatusBadge
                            status={col.status === "ACTIVE" ? "completed" : "queued"}
                            label={col.status}
                          />
                        </div>
                        <p className="mt-1 text-xs text-muted">{col.purpose}</p>
                        <p className="mt-1 text-xs text-muted">
                          {col.imageCount} enrolled images &middot; Updated{" "}
                          {new Date(col.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => void handleInspectImages(col)}
                        >
                          Images
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => void handleDelete(col.id)}>
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selectedCollection ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Enrolled Images &middot; {selectedCollection.name}</CardTitle>
                  <CardDescription>Consent-tracked media in this collection</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedCollection(null)}>
                  Close
                </Button>
              </CardHeader>
              <CardContent>
                {images.length === 0 ? (
                  <p className="text-sm text-muted">No images enrolled in this collection yet.</p>
                ) : (
                  <ul className="flex flex-col gap-2.5">
                    {images.map((img) => (
                      <li
                        key={img.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm"
                      >
                        <div>
                          <p className="font-mono text-xs text-white">{img.id}</p>
                          <p className="text-xs text-muted">
                            {img.mimeType} &middot; {img.width}x{img.height}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge
                            status={img.consentStatus === "GRANTED" ? "completed" : "failed"}
                            label={img.consentStatus}
                          />
                          {img.consentStatus === "GRANTED" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleWithdrawConsent(img.id)}
                            >
                              Withdraw consent
                            </Button>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
