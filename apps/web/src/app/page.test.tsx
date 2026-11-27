import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import HomePage from "./page";

describe("HomePage", () => {
  it("renders FaceLens brand and private-collection hero", () => {
    render(<HomePage />);
    expect(screen.getByText("FaceLens")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /Compare images across your private collections/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/explicitly enrolled private collections/i)).toBeInTheDocument();
  });
});
