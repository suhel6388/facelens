"use client";

import * as React from "react";
import { ChevronDown, HelpCircle, Menu, User } from "lucide-react";
import { Button } from "@app/ui";
import { AppSidebar } from "./app-sidebar";

export interface AppShellProps {
  title: string;
  workspaceName?: string;
  children: React.ReactNode;
}

/**
 * Responsive application shell with 248px desktop sidebar, mobile drawer,
 * top bar (page title, workspace selector, help, profile), and 1440px max-width main area.
 */
export function AppShell({ title, workspaceName = "Default Workspace", children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <AppSidebar mobileOpen={mobileOpen} onCloseMobile={() => setMobileOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-shell items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                aria-label="Open navigation menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface text-white hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary lg:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </button>
              <h1 className="text-lg font-semibold tracking-tight text-white sm:text-xl">
                {title}
              </h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <Button variant="secondary" size="sm" className="hidden sm:inline-flex">
                <span>{workspaceName}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
              </Button>
              <Button variant="ghost" size="icon" aria-label="Help and documentation">
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button variant="secondary" size="icon" aria-label="Account profile">
                <User className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-shell flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
