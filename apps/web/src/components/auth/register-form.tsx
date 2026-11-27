"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { registerSchema } from "@app/validation";
import { Button, Input } from "@app/ui";
import { ApiClientError, authApi } from "@/lib/api-client";

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [acceptedTerms, setAcceptedTerms] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string;
    email?: string;
    password?: string;
    acceptedTerms?: string;
  }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse({
      name,
      email,
      password,
      acceptedTerms,
    });

    if (!parsed.success) {
      const errs: typeof fieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "name" || key === "email" || key === "password" || key === "acceptedTerms") {
          errs[key] = issue.message;
        }
      }
      setFieldErrors(errs);
      return;
    }

    setFieldErrors({});
    setLoading(true);
    try {
      await authApi.register(parsed.data);
      toast.success("Account created", {
        description: "Please verify your email address from your inbox.",
      });
      router.push("/dashboard");
    } catch (err) {
      const msg =
        err instanceof ApiClientError ? err.message : "Unable to create account. Please try again.";
      setFormError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <Input
        label="Full name"
        autoComplete="name"
        placeholder="Alex Rivera"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={fieldErrors.name}
        required
      />

      <Input
        label="Work email"
        type="email"
        autoComplete="email"
        placeholder="alex@organization.example"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        required
      />

      <Input
        label="Password"
        type="password"
        autoComplete="new-password"
        placeholder="At least 12 characters"
        helperText="Use at least 12 characters."
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        required
      />

      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-2.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-border bg-surface accent-primary"
          />
          <span>
            I accept the{" "}
            <Link href="/terms" className="text-secondary hover:underline">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-secondary hover:underline">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {fieldErrors.acceptedTerms ? (
          <p role="alert" className="text-xs text-[#FCA5A5]">
            {fieldErrors.acceptedTerms}
          </p>
        ) : null}
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
        Create account
      </Button>
    </form>
  );
}
