import React from "react";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/dashboard/page";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { UsageChart } from "./usage-chart";

const mockReplace = vi.fn();
const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/lib/api-client", () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  },
  authApi: {
    me: vi.fn().mockResolvedValue({
      user: {
        id: "u1",
        email: "owner@facelens.dev",
        name: "Alex Morgan",
        role: "USER",
        emailVerifiedAt: "2026-11-28T00:00:00.000Z",
        createdAt: "2026-11-28T00:00:00.000Z",
      },
      workspaces: [
        {
          id: "ws1",
          name: "Security Ops",
          slug: "security-ops",
          role: "OWNER",
          createdAt: "2026-11-28T00:00:00.000Z",
        },
      ],
    }),
    logout: vi.fn().mockResolvedValue({ loggedOut: true }),
  },
  collectionsApi: {
    list: vi.fn().mockResolvedValue([
      {
        id: "c1",
        workspaceId: "ws1",
        name: "Badge Directory",
        description: null,
        purpose: "Facility verification",
        status: "ACTIVE",
        imageCount: 12,
        createdAt: "2026-11-28T00:00:00.000Z",
        updatedAt: "2026-11-28T00:00:00.000Z",
      },
    ]),
  },
  searchesApi: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: "search-1234-5678",
          workspaceId: "ws1",
          collectionId: "c1",
          status: "COMPLETED",
          resultCount: 2,
          retentionExpiresAt: "2026-12-28T00:00:00.000Z",
          createdAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
      ],
      meta: { requestId: "r1", page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
  },
  billingApi: {
    getOverview: vi.fn().mockResolvedValue({
      subscription: {
        id: "sub1",
        workspaceId: "ws1",
        planCode: "PRO",
        status: "ACTIVE",
        monthlySearchLimit: 2000,
        currentPeriodStart: "2026-11-01T00:00:00.000Z",
        currentPeriodEnd: "2026-12-01T00:00:00.000Z",
        createdAt: "2026-11-01T00:00:00.000Z",
      },
      monthlySearchesUsed: 14,
      recentPayments: [],
    }),
  },
}));

describe("Phase 6 User Dashboard", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders all authenticated navigation links in AppSidebar", () => {
    render(<AppSidebar mobileOpen={false} onCloseMobile={() => undefined} />);
    expect(screen.getByRole("link", { name: /Overview/i }).getAttribute("href")).toBe("/dashboard");
    expect(screen.getByRole("link", { name: /New Search/i }).getAttribute("href")).toBe(
      "/search/new",
    );
    expect(screen.getByRole("link", { name: /Collections/i }).getAttribute("href")).toBe(
      "/collections",
    );
    expect(screen.getByRole("link", { name: /Search History/i }).getAttribute("href")).toBe(
      "/history",
    );
    expect(screen.getByRole("link", { name: /Billing/i }).getAttribute("href")).toBe("/billing");
    expect(screen.getByRole("link", { name: /Settings/i }).getAttribute("href")).toBe("/settings");
    expect(screen.getByRole("link", { name: /Profile/i }).getAttribute("href")).toBe("/profile");
  });

  it("renders UsageChart with accessible label", () => {
    render(
      <UsageChart
        searches={[
          {
            id: "s1",
            workspaceId: "ws1",
            collectionId: "c1",
            status: "COMPLETED",
            resultCount: 1,
            retentionExpiresAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            completedAt: new Date().toISOString(),
          },
        ]}
      />,
    );
    expect(screen.getByRole("img", { name: /7-day search activity bar chart/i })).toBeTruthy();
  });

  it("renders API-integrated overview widgets on DashboardPage", async () => {
    render(<DashboardPage />);
    await waitFor(() => {
      expect(screen.getByText("14 / 2000")).toBeTruthy();
    });
    expect(screen.getByText("PRO")).toBeTruthy();
    expect(screen.getByText("Badge Directory")).toBeTruthy();
    expect(screen.getByText("Search statistics")).toBeTruthy();
    expect(screen.getByText("Usage chart")).toBeTruthy();
    expect(screen.getByText("Recent activity")).toBeTruthy();
  });
});
