"use client";

import * as React from "react";
import { ImagePlus, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@app/validation";
import { Button, Input, StatusBadge, cn } from "@app/ui";
import { ApiClientError, uploadsApi } from "@/lib/api-client";

export interface ImageUploadDropzoneProps {
  workspaceId: string;
  collectionId: string;
  disabled?: boolean;
  onUploaded: () => void | Promise<void>;
}

async function computeSha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function readImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error("Unable to read image dimensions."));
    img.src = url;
  });
}

export function ImageUploadDropzone({
  workspaceId,
  collectionId,
  disabled = false,
  onUploaded,
}: ImageUploadDropzoneProps) {
  const [dragging, setDragging] = React.useState(false);
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [dimensions, setDimensions] = React.useState<{ width: number; height: number } | null>(
    null,
  );
  const [authorizationBasis, setAuthorizationBasis] = React.useState("");
  const [consentConfirmed, setConsentConfirmed] = React.useState(false);
  const [subjectAdultConfirmed, setSubjectAdultConfirmed] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const clearSelection = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setDimensions(null);
    setProgress(null);
  };

  const handleSelectedFile = async (candidate: File | undefined) => {
    if (!candidate) return;
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(candidate.type)) {
      toast.error("Unsupported file type. Only JPEG, PNG, and WebP images are allowed.");
      return;
    }
    if (candidate.size > MAX_UPLOAD_SIZE_BYTES) {
      toast.error("Image exceeds the 10 MB maximum file size.");
      return;
    }

    const objectUrl = URL.createObjectURL(candidate);
    try {
      const dims = await readImageDimensions(objectUrl);
      if (dims.width < 64 || dims.height < 64 || dims.width > 10000 || dims.height > 10000) {
        URL.revokeObjectURL(objectUrl);
        toast.error("Image dimensions must be between 64x64 and 10000x10000 pixels.");
        return;
      }
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(candidate);
      setPreviewUrl(objectUrl);
      setDimensions(dims);
    } catch {
      URL.revokeObjectURL(objectUrl);
      toast.error("The selected file could not be decoded as a valid image.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !dimensions) {
      toast.error("Please select a valid image first.");
      return;
    }
    if (authorizationBasis.trim().length < 10) {
      toast.error("Documented authorization basis must be at least 10 characters.");
      return;
    }
    if (!consentConfirmed || !subjectAdultConfirmed) {
      toast.error("All consent and adult-subject confirmations are required.");
      return;
    }

    setSubmitting(true);
    setProgress(5);
    try {
      const sha256 = await computeSha256Hex(file);
      setProgress(15);

      const ticket = await uploadsApi.createTicket(workspaceId, {
        collectionId,
        mimeType: file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
        sizeBytes: file.size,
        width: dimensions.width,
        height: dimensions.height,
        sha256,
        authorizationBasis: authorizationBasis.trim(),
        consentConfirmed: true,
        subjectAdultConfirmed: true,
      });

      setProgress(30);
      const uploaded = await uploadsApi.uploadDirect(ticket.uploadUrl, file, (pct) => {
        setProgress(30 + Math.round(pct * 0.7));
      });

      toast.success(
        uploaded.metadataStripped
          ? "Image enrolled in private storage (EXIF metadata stripped)"
          : "Image enrolled in private storage",
      );
      clearSelection();
      setAuthorizationBasis("");
      setConsentConfirmed(false);
      setSubjectAdultConfirmed(false);
      await onUploaded();
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : "Failed to enroll image.");
      setProgress(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) void handleSelectedFile(e.dataTransfer.files?.[0]);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-6 text-center transition-colors",
          dragging ? "border-primary bg-primary/5" : "border-border bg-surface/60",
          disabled && "pointer-events-none opacity-50",
        )}
      >
        {previewUrl && file && dimensions ? (
          <div className="flex w-full flex-col items-center gap-3">
            <div className="relative">
              <img
                src={previewUrl}
                alt="Enrollment preview"
                className="max-h-48 rounded-lg border border-border object-contain"
              />
              <button
                type="button"
                onClick={clearSelection}
                aria-label="Remove selected image"
                className="absolute -right-2 -top-2 rounded-full border border-border bg-card p-1 text-muted hover:text-white"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
              <StatusBadge status="completed" label={file.type} />
              <span>
                {dimensions.width} &times; {dimensions.height}px
              </span>
              <span>&middot; {(file.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>
        ) : (
          <label
            htmlFor="collection-upload-input"
            className="flex cursor-pointer flex-col items-center gap-2"
          >
            <ImagePlus className="h-8 w-8 text-muted" aria-hidden="true" />
            <span className="text-sm font-medium text-white">
              Drag &amp; drop an image or click to browse
            </span>
            <span className="text-xs text-muted">
              JPEG, PNG, WebP &middot; 64&times;64 to 10000&times;10000px &middot; max 10 MB
              &middot; EXIF stripped
            </span>
            <input
              id="collection-upload-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={disabled}
              onChange={(e) => void handleSelectedFile(e.target.files?.[0])}
            />
          </label>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="auth-basis" className="text-sm font-medium text-white">
          Documented Authorization Basis
        </label>
        <Input
          id="auth-basis"
          required
          minLength={10}
          disabled={disabled || submitting}
          placeholder="e.g. Signed employee badge consent form #2026-04"
          value={authorizationBasis}
          onChange={(e) => setAuthorizationBasis(e.target.value)}
        />
      </div>

      <label className="flex items-start gap-2.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={consentConfirmed}
          disabled={disabled || submitting}
          onChange={(e) => setConsentConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
        />
        <span>
          I confirm documented permission/consent has been obtained for this subject and processing
          purpose.
        </span>
      </label>

      <label className="flex items-start gap-2.5 text-xs text-muted">
        <input
          type="checkbox"
          checked={subjectAdultConfirmed}
          disabled={disabled || submitting}
          onChange={(e) => setSubjectAdultConfirmed(e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
        />
        <span>I confirm that no minors are depicted in this image.</span>
      </label>

      {progress !== null ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-muted">
            <span>Uploading to private storage...</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-gradient-to-r from-secondary to-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between pt-1">
        <span className="inline-flex items-center gap-1.5 text-xs text-muted">
          <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
          Signed private upload
        </span>
        <Button type="submit" loading={submitting} disabled={disabled || !file}>
          Enroll image
        </Button>
      </div>
    </form>
  );
}
