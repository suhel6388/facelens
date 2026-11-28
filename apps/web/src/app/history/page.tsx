"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { SearchDto } from "@app/types";
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
import { ApiClientError, searchesApi, type SearchWithResultsDto } from "@/lib/api-client";

export default function SearchHistoryPage() {
  const { me, workspace } = useWorkspaceSession();
  const [searches, setSearches] = React.useState<SearchDto[]>([]);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [selectedDetail, setSelectedDetail] = React.useState<SearchWithResultsDto | null>(null);

  const loadHistory = React.useCallback(async () => {
    if (!workspace?.id) return;
    setLoading(true);
    try {
      const res = await searchesApi.list(workspace.id, page, 10);
      setSearches(res.items);
      setTotalPages(res.meta.totalPages);
    } catch {
      toast.error("Unable to load search history");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, page]);

  React.useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const handleInspect = async (searchId: string) => {
    if (!workspace?.id) return;
    try {
      const detail = await searchesApi.getById(workspace.id, searchId);
      setSelectedDetail(detail);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to load search details");
    }
  };

  const handleCancel = async (searchId: string) => {
    if (!workspace?.id) return;
    try {
      await searchesApi.cancel(workspace.id, searchId);
      toast.success("Search cancelled");
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to cancel search");
    }
  };

  const handleDelete = async (searchId: string) => {
    if (!workspace?.id) return;
    try {
      await searchesApi.remove(workspace.id, searchId);
      toast.success("Search deleted");
      if (selectedDetail?.search.id === searchId) setSelectedDetail(null);
      await loadHistory();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to delete search");
    }
  };

  return (
    <AppShell
      title="Search History"
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle>Comparison Jobs</CardTitle>
              <CardDescription>
                Audit-logged similarity searches scoped to your workspace collections.
              </CardDescription>
            </div>
            <Button size="sm" asChild>
              <Link href="/search/new">New search</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted">Loading search history...</p>
            ) : searches.length === 0 ? (
              <p className="text-sm text-muted">No searches recorded in this workspace yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs uppercase text-muted">
                      <th className="py-2 pr-4 font-medium">Search ID</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 pr-4 font-medium">Results</th>
                      <th className="py-2 pr-4 font-medium">Expires</th>
                      <th className="py-2 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {searches.map((s) => (
                      <tr key={s.id}>
                        <td className="py-3 pr-4 font-mono text-xs text-white">{s.id}</td>
                        <td className="py-3 pr-4">
                          <StatusBadge
                            status={
                              s.status === "COMPLETED"
                                ? "completed"
                                : s.status === "FAILED"
                                  ? "failed"
                                  : "queued"
                            }
                            label={s.status}
                          />
                        </td>
                        <td className="py-3 pr-4 text-muted">{s.resultCount}</td>
                        <td className="py-3 pr-4 text-muted">
                          {new Date(s.retentionExpiresAt).toLocaleDateString()}
                        </td>
                        <td className="flex justify-end gap-2 py-3">
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => void handleInspect(s.id)}
                          >
                            Details
                          </Button>
                          {s.status === "QUEUED" || s.status === "PROCESSING" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleCancel(s.id)}
                            >
                              Cancel
                            </Button>
                          ) : null}
                          <Button variant="ghost" size="sm" onClick={() => void handleDelete(s.id)}>
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-xs text-muted">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {selectedDetail ? (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  Search Results &middot; {selectedDetail.search.id.slice(0, 8)}
                </CardTitle>
                <CardDescription>
                  Visual similarity estimates are probabilistic and do not establish identity.
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedDetail(null)}>
                Close
              </Button>
            </CardHeader>
            <CardContent>
              {selectedDetail.results.length === 0 ? (
                <p className="text-sm text-muted">
                  No similarity matches recorded for this search job yet.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {selectedDetail.results.map((r) => (
                    <li
                      key={r.id}
                      className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-3"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-white">
                          Rank #{r.rank} &middot; Image {r.collectionImageId.slice(0, 8)}
                        </span>
                        <span className="font-mono text-primary">
                          {Math.round(r.similarityEstimate * 100)}% similarity estimate
                        </span>
                      </div>
                      <p className="text-xs text-muted">{r.disclaimer}</p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
