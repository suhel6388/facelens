import * as React from "react";
import Link from "next/link";
import { BrandLogo, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@app/ui";

export interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function AuthCard({ title, description, children, footer }: AuthCardProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="mb-8">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <BrandLogo />
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
          {footer ? <div className="mt-6 border-t border-border pt-4 text-center">{footer}</div> : null}
        </CardContent>
      </Card>

      <p className="mt-6 max-w-md text-center text-xs text-muted">
        Authorized private collections only. Similarity estimates never establish identity.
      </p>
    </div>
  );
}
