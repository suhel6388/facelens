"use client";

import * as React from "react";
import Link from "next/link";
import { ImagePlus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import type { CollectionDto, SearchDto } from "@app/types";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@app/validation";
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
import { ApiClientError, collectionsApi, searchesApi } from "@/lib/api-client";

export default function NewSearchPage() {
  const { me, workspace } = useWorkspaceSession();
  const [collections, setCollections] = React.useState<CollectionDto[]>([]);
  const [collectionId, setCollectionId] = React.useState("");
  const [purposeConfirmed, setPurposeConfirmed] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [createdSearch, setCreatedSearch] = React.useState<SearchDto | null>(null);

  React.useEffect(() => {
    if (!workspace?.id) return;
    collectionsApi
      .list(workspace.id)
      .then((items) => {
        const active = items.filter((c) => c.status === "ACTIVE");
        setCollections(active);
        if (active[0] && !collectionId) {
          setCollectionId(active[0].id);
        }
      })
      .catch(() => {
        toast.error("Unable to load collections");
      });
  }, [workspace?.id, collectionId]);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleFileChange = (file: File | undefined) => {
    if (!file) return;
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      toast.error("Only JPEG, PNG, or WebP images are accepted.");
      return;
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error("Image exceeds the 10 MB maximum size.");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspace?.id) return;
    if (!collectionId) {
      toast.error("Please select an authorized collection.");
      return;
    }
    if (!selectedFile) {
      toast.error("Please select a query image.");
      return;
    }
    if (!purposeConfirmed) {
      toast.error("You must confirm the permitted purpose before searching.");
      return;
    }

    setSubmitting(true);
    try {
      const search = await searchesApi.create(workspace.id, {
        collectionId,
        purposeConfirmed: true,
      });
      setCreatedSearch(search);
      toast.success("Similarity search queued");
    } catch (err) {
      const message = err instanceof ApiClientError ? err.message : "Failed to queue search.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell
      title="New Search"
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <Card className="border-secondary/30 bg-secondary/5">
          <CardContent className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-secondary" aria-hidden="true" />
            <div className="text-sm text-muted">
              <p className="font-medium text-white">Authorized Private Collection Search Only</p>
              <p className="mt-1">
                FaceLens never searches public websites or social platforms. Comparisons run only
                against your selected private collection and return visual similarity estimates, not
                identity determinations.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Run a Visual Similarity Comparison</CardTitle>
            <CardDescription>
              Select an authorized collection, choose a query image, and confirm permitted purpose.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="collection-select" className="text-sm font-medium text-white">
                  Target Collection
                </label>
                {collections.length === 0 ? (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-muted">
                    <span>No active collections available.</span>
                    <Link
                      href="/collections"
                      className="font-medium text-secondary hover:underline"
                    >
                      Create one first
                    </Link>
                  </div>
                ) : (
                  <select
                    id="collection-select"
                    value={collectionId}
                    onChange={(e) => setCollectionId(e.target.value)}
                    className="h-10 rounded-lg border border-border bg-surface px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    {collections.map((col) => (
                      <option key={col.id} value={col.id}>
                        {col.name} ({col.imageCount} images)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="query-image-input" className="text-sm font-medium text-white">
                  Query Image (JPEG, PNG, WebP &middot; max 10 MB)
                </label>
                <label
                  htmlFor="query-image-input"
                  className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface/60 px-6 py-8 text-center transition-colors hover:border-secondary/60"
                >
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Query image preview"
                      className="max-h-48 rounded-lg border border-border object-contain"
                    />
                  ) : (
                    <ImagePlus className="h-8 w-8 text-muted" aria-hidden="true" />
                  )}
                  <div className="text-sm">
                    <span className="font-medium text-white">
                      {selectedFile ? selectedFile.name : "Click to select an image"}
                    </span>
                    <p className="mt-1 text-xs text-muted">
                      Images are retained according to your workspace retention policy.
                    </p>
                  </div>
                  <input
                    id="query-image-input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-lg border border-border bg-surface p-3.5 text-sm">
                <input
                  type="checkbox"
                  checked={purposeConfirmed}
                  onChange={(e) => setPurposeConfirmed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                />
                <span className="text-muted">
                  I confirm this comparison is authorized under my workspace&apos;s documented
                  purpose and that the query image does not depict minors.
                </span>
              </label>

              <div className="flex items-center justify-end gap-3">
                <Button type="submit" loading={submitting} disabled={collections.length === 0}>
                  Queue similarity search
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {createdSearch ? (
          <Card className="border-success/40 bg-success/5">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Search Queued</CardTitle>
                <CardDescription className="font-mono text-xs">{createdSearch.id}</CardDescription>
              </div>
              <StatusBadge status="queued" label={createdSearch.status} />
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4">
              <p className="text-sm text-muted">
                Retention expires {new Date(createdSearch.retentionExpiresAt).toLocaleDateString()}.
              </p>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/history">View in Search History</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
