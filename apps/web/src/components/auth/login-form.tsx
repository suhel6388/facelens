"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { loginSchema } from "@app/validation";
import { Button, Input } from "@app/ui";
import { ApiClientError, authApi } from "@/lib/api-client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [fieldErrors, setFieldErrors] = React.useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const errs: { email?: string; password?: string } = {};
      for (const issue of parsed.error.issues) {
        if (issue.path[0] === "email") errs.email = issue.message;
        if (issue.path[0] === "password") errs.password = issue.message;
      }
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await authApi.login(parsed.data);
      toast.success("Signed in successfully");
      router.push(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Unable to sign in. Please try again.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Email address"
        type="email"
        autoComplete="email"
        placeholder="you@organization.example"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        required
      />

      <div className="flex flex-col gap-1">
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />
        <div className="text-right">
          <Link href="/forgot-password" className="text-xs text-secondary hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>

      {formError ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-[#FCA5A5]"
        >
          {formError}
        </p>
      ) : null}

      <Button type="submit" variant="primary" loading={loading} className="mt-1 w-full">
        Sign in
      </Button>
    </form>
  );
}
