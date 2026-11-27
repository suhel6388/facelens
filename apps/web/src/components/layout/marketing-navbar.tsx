"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLogo, Button } from "@app/ui";

const MARKETING_LINKS = [
  { href: "/features", label: "Product" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/privacy", label: "Privacy" },
] as const;

export function MarketingNavbar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-shell items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          <BrandLogo />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {MARKETING_LINKS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-medium text-muted transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button variant="primary" size="sm" asChild>
            <Link href="/register">Start a comparison</Link>
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-controls="marketing-mobile-menu"
          aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-white hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {mobileOpen ? (
        <div
          id="marketing-mobile-menu"
          className="border-t border-border bg-surface px-4 py-4 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-3">
            {MARKETING_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-elevated hover:text-white"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              <Button variant="secondary" asChild>
                <Link href="/login">Login</Link>
              </Button>
              <Button variant="primary" asChild>
                <Link href="/register">Start a comparison</Link>
              </Button>
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
