import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ForgotPasswordForm } from "./forgot-password-form";
import { LoginForm } from "./login-form";
import { RegisterForm } from "./register-form";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

afterEach(() => {
  cleanup();
});

describe("Auth Forms", () => {
  it("validates LoginForm email and password", () => {
    render(<LoginForm />);
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
  });

  it("validates RegisterForm password length and terms acceptance", () => {
    render(<RegisterForm />);
    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: "Alex" } });
    fireEvent.change(screen.getByLabelText(/Work email/i), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "short" } });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));

    expect(screen.getByText(/Password must be at least 12 characters/i)).toBeInTheDocument();
    expect(screen.getByText(/accept the terms/i)).toBeInTheDocument();
  });

  it("validates ForgotPasswordForm email", () => {
    render(<ForgotPasswordForm />);
    fireEvent.click(screen.getByRole("button", { name: /Send reset instructions/i }));
    expect(screen.getByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });
});
