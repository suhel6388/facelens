"use client";

import * as React from "react";
import Link from "next/link";
import { FileImage, Lock, Trash2, UploadCloud } from "lucide-react";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@app/validation";
import { Button, Card, cn } from "@app/ui";

export function UploadPreview() {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<{
    name: string;
    sizeLabel: string;
    previewUrl: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (selectedFile?.previewUrl) {
        URL.revokeObjectURL(selectedFile.previewUrl);
      }
    };
  }, [selectedFile]);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError(null);

    if (
      !ALLOWED_IMAGE_MIME_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number])
    ) {
      setError("Unsupported file type. Please choose a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      setError("File exceeds the 10 MB limit.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSelectedFile((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return {
        name: file.name,
        sizeLabel: `${(file.size / 1024).toFixed(0)} KB`,
        previewUrl,
      };
    });
  };

  const clearSelection = () => {
    setSelectedFile((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Card className="mx-auto mt-10 max-w-2xl text-left">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <Lock className="h-4 w-4 text-secondary" aria-hidden="true" />
          <span>Private Collection Comparison Preview</span>
        </div>
        <span className="text-xs text-muted">JPEG, PNG, WebP &bull; Max 10 MB</span>
      </div>

      <div className="mt-4">
        {!selectedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              handleFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors duration-150",
              dragging
                ? "border-primary bg-primary/10"
                : "border-border bg-surface hover:border-secondary/60",
            )}
          >
            <UploadCloud className="h-8 w-8 text-muted" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium text-white">
              Drop an image here to preview, or browse your device
            </p>
            <p className="mt-1 text-xs text-muted">
              Nothing is uploaded or searched automatically when you drop a file.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
              aria-label="Choose an image to preview"
              onChange={(e) => handleFile(e.target.files?.[0])}
              className="sr-only"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => inputRef.current?.click()}
            >
              Select image
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedFile.previewUrl}
                alt={`Preview of ${selectedFile.name}`}
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-sm font-medium text-white">
                  <FileImage className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span className="truncate">{selectedFile.name}</span>
                </p>
                <p className="mt-0.5 text-xs text-muted">
                  {selectedFile.sizeLabel} &bull; Ready to select an authorized collection in your
                  workspace
                </p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
              <span>Remove</span>
            </Button>
          </div>
        )}

        {error ? (
          <p role="alert" className="mt-3 text-xs text-[#FCA5A5]">
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col items-start justify-between gap-3 border-t border-border pt-4 sm:flex-row sm:items-center">
          <p className="text-xs text-muted">
            Comparisons run only against private collections you own or are authorized to access.
            Similarity is an estimate, not identity verification.
          </p>
          <Button variant="primary" size="sm" asChild className="shrink-0">
            <Link href="/dashboard">Continue in workspace</Link>
          </Button>
        </div>
      </div>
    </Card>
  );
}
