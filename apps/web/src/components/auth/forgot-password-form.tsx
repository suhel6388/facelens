"use client";

import * as React from "react";
import { forgotPasswordSchema } from "@app/validation";
import { Button, Input } from "@app/ui";
import { ApiClientError, authApi } from "@/lib/api-client";

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [error, setError] = React.useState<string | undefined>();
  const [submittedMessage, setSubmittedMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please enter a valid email.");
      return;
    }

    setError(undefined);
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(parsed.data);
      setSubmittedMessage(res.message);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Unable to process request.");
    } finally {
      setLoading(false);
    }
  };

  if (submittedMessage) {
    return (
      <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-[#86EFAC]">
        {submittedMessage}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@organization.example"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        required
      />
      <Button type="submit" variant="primary" loading={loading} className="w-full">
        Send reset instructions
      </Button>
    </form>
  );
}
