import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ContactForm } from "./contact-form";
import { MarketingFooter } from "./marketing-footer";
import { UploadPreview } from "./upload-preview";

afterEach(() => {
  cleanup();
});

describe("Marketing Components", () => {
  it("renders UploadPreview without auto-submit and validates unsupported file types", () => {
    render(<UploadPreview />);
    expect(screen.getByText(/Private Collection Comparison Preview/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing is uploaded or searched automatically when you drop a file/i),
    ).toBeInTheDocument();

    const fileInput = screen.getByLabelText(/Choose an image to preview/i);
    const invalidFile = new File(["hello"], "notes.txt", { type: "text/plain" });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/Unsupported file type/i);
  });

  it("renders UploadPreview image preview on valid image and allows removal", () => {
    const createObjectURL = vi.fn(() => "blob:mock-preview-url");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });

    render(<UploadPreview />);
    const fileInput = screen.getByLabelText(/Choose an image to preview/i);
    const validFile = new File(["img"], "sample.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    expect(screen.getByText("sample.png")).toBeInTheDocument();
    expect(screen.getByAltText("Preview of sample.png")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Remove/i }));
    expect(screen.queryByText("sample.png")).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });

  it("renders MarketingFooter with legal and product links", () => {
    render(<MarketingFooter />);
    expect(screen.getByRole("link", { name: "Features" })).toHaveAttribute("href", "/features");
    expect(screen.getByRole("link", { name: "Privacy policy" })).toHaveAttribute(
      "href",
      "/privacy",
    );
    expect(screen.getByRole("link", { name: "Terms and conditions" })).toHaveAttribute(
      "href",
      "/terms",
    );
  });

  it("validates ContactForm and shows confirmation on valid submission", () => {
    render(<ContactForm />);
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));
    expect(screen.getByText(/Please enter your name/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Full name/i), { target: { value: "Alex Rivera" } });
    fireEvent.change(screen.getByLabelText(/Work email/i), {
      target: { value: "alex@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/Message/i), {
      target: { value: "We would like to evaluate FaceLens for our private archive." },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send message/i }));

    expect(screen.getByText(/Your message has been recorded for review/i)).toBeInTheDocument();
  });
});

