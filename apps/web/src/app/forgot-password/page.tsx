import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: `Forgot Password — ${BRAND_NAME}`,
  description: "Request a password reset link for your FaceLens account.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthCard
      title="Reset your password"
      description="Enter your account email and we will send reset instructions if an account exists."
      footer={
        <p className="text-xs text-muted">
          Remembered your password?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
