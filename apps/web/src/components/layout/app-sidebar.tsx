"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  FolderLock,
  History,
  LayoutDashboard,
  Search,
  Settings,
  ShieldCheck,
  X,
} from "lucide-react";
import { BrandLogo, cn } from "@app/ui";

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const APP_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/search/new", label: "New Search", icon: Search },
  { href: "/collections", label: "Collections", icon: FolderLock },
  { href: "/history", label: "Search History", icon: History },
  { href: "/billing", label: "Billing", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/admin", label: "Admin", icon: ShieldCheck },
];

export interface AppSidebarProps {
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function AppSidebar({ mobileOpen, onCloseMobile }: AppSidebarProps) {
  const pathname = usePathname();

  const navContent = (
    <div className="flex h-full flex-col justify-between px-3 py-5">
      <div>
        <div className="flex items-center justify-between px-3 pb-6">
          <Link
            href="/"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
          >
            <BrandLogo />
          </Link>
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Close sidebar"
            className="rounded-md p-1 text-muted hover:bg-elevated hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary lg:hidden"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Application navigation" className="flex flex-col gap-1">
          {APP_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-[9px] px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary",
                  active
                    ? "bg-elevated text-white"
                    : "text-muted hover:bg-elevated/60 hover:text-white",
                )}
              >
                <Icon
                  className={cn("h-4 w-4 shrink-0", active ? "text-primary" : "text-muted")}
                  aria-hidden="true"
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rounded-xl border border-border bg-card p-3.5 text-xs text-muted">
        <p className="font-medium text-white">Private Collections Only</p>
        <p className="mt-1 leading-relaxed">
          Comparisons run solely against explicitly authorized collections. Similarity scores are
          estimates.
        </p>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden w-[248px] shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 h-screen">{navContent}</div>
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation drawer"
        >
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <aside className="relative z-10 h-full w-[248px] border-r border-border bg-surface">
            {navContent}
          </aside>
        </div>
      ) : null}
    </>
  );
}
