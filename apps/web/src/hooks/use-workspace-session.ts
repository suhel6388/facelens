"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import type { AuthMeDto, WorkspaceDto } from "@app/types";
import { ApiClientError, authApi } from "@/lib/api-client";

export interface UseWorkspaceSessionResult {
  me: AuthMeDto | null;
  workspace: WorkspaceDto | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useWorkspaceSession(): UseWorkspaceSessionResult {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = React.useState<AuthMeDto | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await authApi.me();
      setMe(data);
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        router.replace(`/login?next=${encodeURIComponent(pathname || "/dashboard")}`);
        return;
      }
      toast.error("Unable to load workspace session");
    } finally {
      setLoading(false);
    }
  }, [pathname, router]);

  React.useEffect(() => {
    void load();
  }, [load]);

  return {
    me,
    workspace: me?.workspaces[0] ?? null,
    loading,
    refresh: load,
  };
}
