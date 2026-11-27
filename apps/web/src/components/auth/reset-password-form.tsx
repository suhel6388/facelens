"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { resetPasswordSchema } from "@app/validation";
import { Button, Input } from "@app/ui";
import { ApiClientError, authApi } from "@/lib/api-client";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialToken = searchParams.get("token") ?? "";

  const [token, setToken] = React.useState(initialToken);
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ token, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input.");
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(parsed.data);
      toast.success("Password updated", {
        description: "All previous sessions have been revoked. Please sign in.",
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {!initialToken ? (
        <Input
          label="Reset token"
          placeholder="Paste your reset token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
      ) : null}

      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 12 characters"
        helperText="Changing your password revokes all active sessions."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-[#FCA5A5]"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" loading={loading} className="w-full">
        Update password
      </Button>
    </form>
  );
}
