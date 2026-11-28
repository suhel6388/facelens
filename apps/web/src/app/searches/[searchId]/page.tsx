"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  StatusBadge,
} from "@app/ui";
import { AppShell } from "@/components/layout/app-shell";
import { useWorkspaceSession } from "@/hooks/use-workspace-session";
import { ApiClientError, searchesApi, type SearchWithResultsDto } from "@/lib/api-client";

const PROGRESS_STEPS = ["QUEUED", "VALIDATING", "PROCESSING", "COMPLETED"] as const;
const RESULTS_PER_PAGE = 6;

export default function SearchResultDetailPage() {
  const params = useParams<{ searchId: string }>();
  const router = useRouter();
  const searchId = params.searchId;
  const { me, workspace } = useWorkspaceSession();

  const [detail, setDetail] = React.useState<SearchWithResultsDto | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [sortBy, setSortBy] = React.useState<"rank" | "sim-desc" | "sim-asc">("rank");
  const [page, setPage] = React.useState(1);
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const loadSearch = React.useCallback(async () => {
    if (!workspace?.id || !searchId) return;
    try {
      const data = await searchesApi.getById(workspace.id, searchId);
      setDetail(data);
      setErrorMsg(null);
    } catch (err) {
      setErrorMsg(err instanceof ApiClientError ? err.message : "Unable to load search results.");
    } finally {
      setLoading(false);
    }
  }, [workspace?.id, searchId]);

  React.useEffect(() => {
    void loadSearch();
  }, [loadSearch]);

  // Poll while job is in an active state
  React.useEffect(() => {
    const status = detail?.search.status;
    if (!status || !["QUEUED", "VALIDATING", "PROCESSING"].includes(status)) return;
    const timer = setInterval(() => {
      void loadSearch();
    }, 2000);
    return () => clearInterval(timer);
  }, [detail?.search.status, loadSearch]);

  const sortedResults = React.useMemo(() => {
    const list = [...(detail?.results ?? [])];
    if (sortBy === "sim-desc") {
      list.sort((a, b) => b.similarityEstimate - a.similarityEstimate);
    } else if (sortBy === "sim-asc") {
      list.sort((a, b) => a.similarityEstimate - b.similarityEstimate);
    } else {
      list.sort((a, b) => a.rank - b.rank);
    }
    return list;
  }, [detail?.results, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedResults.length / RESULTS_PER_PAGE));
  const pagedResults = sortedResults.slice((page - 1) * RESULTS_PER_PAGE, page * RESULTS_PER_PAGE);

  const handleCancel = async () => {
    if (!workspace?.id || !searchId) return;
    try {
      await searchesApi.cancel(workspace.id, searchId);
      toast.success("Search cancelled");
      await loadSearch();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to cancel search");
    }
  };

  const handleDelete = async () => {
    if (!workspace?.id || !searchId) return;
    try {
      await searchesApi.remove(workspace.id, searchId);
      toast.success("Search deleted");
      router.push("/history");
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Unable to delete search");
    }
  };

  const currentStatus = detail?.search.status ?? "QUEUED";
  const activeStepIndex = PROGRESS_STEPS.indexOf(currentStatus as (typeof PROGRESS_STEPS)[number]);

  return (
    <AppShell
      title="Search Results"
      workspaceName={workspace?.name ?? "Workspace"}
      userName={me?.user.name}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/history">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back to Search History
            </Link>
          </Button>
          {detail ? (
            <div className="flex items-center gap-2">
              {["QUEUED", "VALIDATING", "PROCESSING"].includes(currentStatus) ? (
                <Button variant="secondary" size="sm" onClick={() => void handleCancel()}>
                  Cancel search
                </Button>
              ) : null}
              <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete search
              </Button>
            </div>
          ) : null}
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted">
              Loading search status and results...
            </CardContent>
          </Card>
        ) : errorMsg || !detail ? (
          <Card className="border-danger/40">
            <CardHeader>
              <CardTitle className="text-danger">Unable to load search</CardTitle>
              <CardDescription>{errorMsg ?? "Search job not found."}</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="font-mono text-base">{detail.search.id}</CardTitle>
                  <CardDescription>
                    Collection: {detail.search.collectionId} &middot; Expires{" "}
                    {new Date(detail.search.retentionExpiresAt).toLocaleDateString()}
                  </CardDescription>
                </div>
                <StatusBadge
                  status={
                    currentStatus === "COMPLETED"
                      ? "completed"
                      : currentStatus === "FAILED" || currentStatus === "CANCELLED"
                        ? "failed"
                        : "queued"
                  }
                  label={currentStatus}
                />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-2">
                  {PROGRESS_STEPS.map((step, idx) => {
                    const reached = activeStepIndex >= idx;
                    return (
                      <div key={step} className="flex flex-col gap-1.5">
                        <div
                          className={`h-2 rounded-full ${
                            reached ? "bg-gradient-to-r from-secondary to-primary" : "bg-elevated"
                          }`}
                        />
                        <span
                          className={`text-[11px] font-medium ${
                            reached ? "text-white" : "text-muted"
                          }`}
                        >
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Results ({sortedResults.length})</CardTitle>
                  <CardDescription>
                    Ranked by visual similarity estimate within your authorized private collection.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="sort-results" className="text-xs text-muted">
                    Sort by:
                  </label>
                  <select
                    id="sort-results"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as "rank" | "sim-desc" | "sim-asc");
                      setPage(1);
                    }}
                    className="h-9 rounded-lg border border-border bg-surface px-2.5 text-xs text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                  >
                    <option value="rank">Rank (Default)</option>
                    <option value="sim-desc">Similarity estimate: High to Low</option>
                    <option value="sim-asc">Similarity estimate: Low to High</option>
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                {pagedResults.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">
                    {currentStatus === "COMPLETED"
                      ? "No matching candidates found in this authorized collection."
                      : "Results will appear here once processing completes."}
                  </p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {pagedResults.map((r) => {
                      const pct = Math.round(r.similarityEstimate * 100);
                      return (
                        <div
                          key={r.id}
                          className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-surface p-4"
                        >
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-muted">Rank #{r.rank}</span>
                              <StatusBadge
                                status="completed"
                                label={`${pct}% Similarity estimate`}
                              />
                            </div>
                            <p className="font-mono text-xs text-white">
                              Image {r.collectionImageId.slice(0, 12)}
                            </p>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-secondary to-primary"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted">{r.disclaimer}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {totalPages > 1 ? (
                  <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
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
          </>
        )}

        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete this search?"
          description="This permanently removes the search job and its similarity results."
          affectedDataNotice="Query metadata and ranked similarity results will no longer be accessible."
          confirmLabel="Delete search"
          destructive
          onConfirm={() => void handleDelete()}
        />
      </div>
    </AppShell>
  );
}
