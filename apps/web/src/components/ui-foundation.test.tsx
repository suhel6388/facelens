import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BrandLogo, Button, ConfirmDialog, Input, StatusBadge } from "@app/ui";
import { AppShell } from "./layout/app-shell";
import { MarketingNavbar } from "./layout/marketing-navbar";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

describe("FaceLens UI Foundation", () => {
  it("renders BrandLogo with FaceLens wordmark", () => {
    render(<BrandLogo />);
    expect(screen.getByText("FaceLens")).toBeInTheDocument();
  });

  it("renders Button loading and disabled states accessibly", () => {
    render(
      <Button loading variant="primary">
        Submit
      </Button>,
    );
    const btn = screen.getByRole("button", { name: /submit/i });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
  });

  it("renders Input with label, helper text, and error alert", () => {
    const { rerender } = render(
      <Input label="Collection name" helperText="Visible only to workspace members." />,
    );
    expect(screen.getByLabelText("Collection name")).toBeInTheDocument();
    expect(screen.getByText("Visible only to workspace members.")).toBeInTheDocument();

    rerender(<Input label="Collection name" error="Collection name is required." />);
    expect(screen.getByLabelText("Collection name")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Collection name is required.");
  });

  it("renders StatusBadge with text label", () => {
    render(<StatusBadge status="consent-required" />);
    expect(screen.getByText("Consent required")).toBeInTheDocument();
  });

  it("renders ConfirmDialog with affected data notice", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Delete search?"
        description="Removes search history."
        affectedDataNotice="Deletes query image and results permanently."
        destructive
        onConfirm={onConfirm}
      />,
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Deletes query image and results permanently.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("renders MarketingNavbar with links and mobile menu toggle", () => {
    render(<MarketingNavbar />);
    expect(screen.getByRole("link", { name: "Product" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Privacy" })).toBeInTheDocument();
    const toggle = screen.getByRole("button", { name: /open navigation menu/i });
    fireEvent.click(toggle);
    expect(screen.getByRole("navigation", { name: "Mobile" })).toBeInTheDocument();
  });

  it("renders AppShell with page title, sidebar links, and mobile drawer toggle", () => {
    render(
      <AppShell title="Overview" workspaceName="Acme Private">
        <div>Main content</div>
      </AppShell>,
    );
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByText("Acme Private")).toBeInTheDocument();
    expect(screen.getByText("Main content")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open navigation menu/i }));
    expect(screen.getByRole("dialog", { name: "Navigation drawer" })).toBeInTheDocument();
  });
});
