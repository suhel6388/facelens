import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: `Sign In — ${BRAND_NAME}`,
  description: "Sign in to your FaceLens workspace.",
};

export default function LoginPage() {
  return (
    <AuthCard
      title="Sign in to FaceLens"
      description="Access your authorized private collections and search history."
      footer={
        <p className="text-xs text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </p>
      }
    >
      <React.Suspense fallback={<div className="h-48 animate-pulse rounded-lg bg-surface" />}>
        <LoginForm />
      </React.Suspense>
    </AuthCard>
  );
}
