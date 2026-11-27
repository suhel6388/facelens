import * as React from "react";
import { MarketingNavbar } from "@/components/layout/marketing-navbar";
import { MarketingFooter } from "./marketing-footer";

export interface MarketingLayoutProps {
  children: React.ReactNode;
}

export function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <MarketingNavbar />
      <main className="mx-auto w-full max-w-shell flex-1 px-4 sm:px-6 lg:px-8">{children}</main>
      <MarketingFooter />
    </div>
  );
}
