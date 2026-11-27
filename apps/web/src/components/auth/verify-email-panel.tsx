"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { verifyEmailSchema } from "@app/validation";
import { Button, Input, StatusBadge } from "@app/ui";
import { ApiClientError, authApi } from "@/lib/api-client";

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";

  const [token, setToken] = React.useState(initialToken);
  const [status, setStatus] = React.useState<"idle" | "loading" | "verified" | "error">("idle");
  const [error, setError] = React.useState<string | null>(null);

  const verify = React.useCallback(async (rawToken: string) => {
    const parsed = verifyEmailSchema.safeParse({ token: rawToken });
    if (!parsed.success) {
      setStatus("error");
      setError(parsed.error.issues[0]?.message ?? "Verification token is invalid.");
      return;
    }

    setStatus("loading");
    setError(null);
    try {
      await authApi.verifyEmail(parsed.data);
      setStatus("verified");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiClientError ? err.message : "Unable to verify email.");
    }
  }, []);

  React.useEffect(() => {
    if (initialToken) {
      void verify(initialToken);
    }
  }, [initialToken, verify]);

  if (status === "verified") {
    return (
      <div className="flex flex-col gap-4">
        <StatusBadge status="completed" label="Email verified" />
        <p className="text-sm text-muted">
          Your email address has been verified. You can now access all workspace features.
        </p>
        <Button variant="primary" asChild className="w-full">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void verify(token);
      }}
      className="flex flex-col gap-4"
    >
      <Input
        label="Verification token"
        placeholder="Paste your verification token"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        error={error ?? undefined}
        required
      />
      <Button type="submit" variant="primary" loading={status === "loading"} className="w-full">
        Verify email
      </Button>
    </form>
  );
}
