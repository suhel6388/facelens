import type { Metadata } from "next";
import Link from "next/link";
import { BRAND_NAME } from "@app/types";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: `Create Account — ${BRAND_NAME}`,
  description: "Create a FaceLens account and private workspace.",
};

export default function RegisterPage() {
  return (
    <AuthCard
      title="Create your FaceLens account"
      description="Start with a private workspace for authorized collection comparisons."
      footer={
        <p className="text-xs text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
