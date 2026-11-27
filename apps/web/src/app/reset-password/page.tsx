import * as React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: `Set New Password — ${BRAND_NAME}`,
  description: "Set a new password for your FaceLens account.",
};

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set a new password"
      description="Choose a strong password of at least 12 characters."
      footer={
        <p className="text-xs text-muted">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Return to sign in
          </Link>
        </p>
      }
    >
      <React.Suspense fallback={<div className="h-36 animate-pulse rounded-lg bg-surface" />}>
        <ResetPasswordForm />
      </React.Suspense>
    </AuthCard>
  );
}
