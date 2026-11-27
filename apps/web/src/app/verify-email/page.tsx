import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";

export const metadata: Metadata = {
  title: `Verify Email — ${BRAND_NAME}`,
  description: "Verify your FaceLens account email address.",
};

export default function VerifyEmailPage() {
  return (
    <AuthCard
      title="Verify your email address"
      description="Confirm your email to activate collection enrollment and comparisons."
      footer={
        <p className="text-xs text-muted">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <React.Suspense fallback={<div className="h-32 animate-pulse rounded-lg bg-surface" />}>
        <VerifyEmailPanel />
      </React.Suspense>
    </AuthCard>
  );
}
