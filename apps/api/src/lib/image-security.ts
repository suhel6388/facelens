import crypto from "node:crypto";
import { ALLOWED_IMAGE_MIME_TYPES, MAX_UPLOAD_SIZE_BYTES } from "@app/validation";

export type AllowedImageMime = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

export interface InspectedImage {
  mimeType: AllowedImageMime;
  width: number;
  height: number;
  sha256: string;
  strippedBuffer: Buffer;
  metadataStripped: boolean;
}

/**
 * Detects image MIME type strictly from file magic bytes (never trusting Content-Type alone).
 */
export function detectImageMimeFromMagicBytes(buf: Buffer): AllowedImageMime | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }

  // WebP: RIFF....WEBP
  if (
    buf.subarray(0, 4).toString("ascii") === "RIFF" &&
    buf.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

function parsePngDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 24) return null;
  if (buf.subarray(12, 16).toString("ascii") !== "IHDR") return null;
  return {
    width: buf.readUInt32BE(16),
    height: buf.readUInt32BE(20),
  };
}

function parseJpegDimensions(buf: Buffer): { width: number; height: number } | null {
  let offset = 2;
  while (offset + 4 < buf.length) {
    if (buf[offset] !== 0xff) break;
    const marker = buf[offset + 1]!;
    if (marker === 0xd9 || marker === 0xda) break; // EOI or SOS
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buf.length) break;

    // SOF0..SOF3, SOF5..SOF7, SOF9..SOF11, SOF13..SOF15
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSof && offset + 9 <= buf.length) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  return null;
}

function parseWebpDimensions(buf: Buffer): { width: number; height: number } | null {
  if (buf.length < 30) return null;
  const chunk = buf.subarray(12, 16).toString("ascii");
  if (chunk === "VP8X" && buf.length >= 30) {
    const w = 1 + (buf[24]! | (buf[25]! << 8) | (buf[26]! << 16));
    const h = 1 + (buf[27]! | (buf[28]! << 8) | (buf[29]! << 16));
    return { width: w, height: h };
  }
  if (chunk === "VP8 " && buf.length >= 30) {
    const w = buf.readUInt16LE(26) & 0x3fff;
    const h = buf.readUInt16LE(28) & 0x3fff;
    return { width: w, height: h };
  }
  if (chunk === "VP8L" && buf.length >= 25) {
    const b0 = buf[21]!;
    const b1 = buf[22]!;
    const b2 = buf[23]!;
    const b3 = buf[24]!;
    const w = 1 + (((b1 & 0x3f) << 8) | b0);
    const h = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
    return { width: w, height: h };
  }
  return null;
}

/**
 * Strips EXIF/APP1-APP15/COM segments from JPEG buffers while preserving JFIF (APP0) and image data.
 */
function stripJpegMetadata(buf: Buffer): { buffer: Buffer; stripped: boolean } {
  const chunks: Buffer[] = [buf.subarray(0, 2)];
  let offset = 2;
  let stripped = false;

  while (offset + 1 < buf.length) {
    if (buf[offset] !== 0xff) {
      chunks.push(buf.subarray(offset));
      break;
    }
    const marker = buf[offset + 1]!;
    if (marker === 0xda || marker === 0xd9) {
      chunks.push(buf.subarray(offset));
      break;
    }
    if (offset + 4 > buf.length) {
      chunks.push(buf.subarray(offset));
      break;
    }
    const length = buf.readUInt16BE(offset + 2);
    if (length < 2 || offset + 2 + length > buf.length) {
      chunks.push(buf.subarray(offset));
      break;
    }
    // Strip APP1..APP15 (0xE1..0xEF, includes EXIF/XMP/IPTC) and COM (0xFE)
    const isMetadataSegment = (marker >= 0xe1 && marker <= 0xef) || marker === 0xfe;
    if (isMetadataSegment) {
      stripped = true;
    } else {
      chunks.push(buf.subarray(offset, offset + 2 + length));
    }
    offset += 2 + length;
  }

  return { buffer: stripped ? Buffer.concat(chunks) : buf, stripped };
}

/**
 * Strips PNG textual/EXIF chunks (eXIf, tEXt, zTXt, iTXt) while preserving IHDR/PLTE/IDAT/IEND.
 */
function stripPngMetadata(buf: Buffer): { buffer: Buffer; stripped: boolean } {
  const chunks: Buffer[] = [buf.subarray(0, 8)];
  let offset = 8;
  let stripped = false;
  const metadataChunks = new Set(["eXIf", "tEXt", "zTXt", "iTXt"]);

  while (offset + 12 <= buf.length) {
    const length = buf.readUInt32BE(offset);
    const totalLen = 12 + length;
    if (offset + totalLen > buf.length) {
      chunks.push(buf.subarray(offset));
      break;
    }
    const type = buf.subarray(offset + 4, offset + 8).toString("ascii");
    if (metadataChunks.has(type)) {
      stripped = true;
    } else {
      chunks.push(buf.subarray(offset, offset + totalLen));
    }
    offset += totalLen;
  }

  return { buffer: stripped ? Buffer.concat(chunks) : buf, stripped };
}

/**
 * Validates file size, magic bytes, image dimensions, and strips embedded EXIF/text metadata.
 */
export function inspectAndSanitizeImage(buf: Buffer, expectedMimeType?: string): InspectedImage {
  if (buf.length === 0) {
    throw new Error("EMPTY_FILE");
  }
  if (buf.length > MAX_UPLOAD_SIZE_BYTES) {
    throw new Error("FILE_TOO_LARGE");
  }

  const detectedMime = detectImageMimeFromMagicBytes(buf);
  if (!detectedMime) {
    throw new Error("INVALID_FILE_SIGNATURE");
  }
  if (expectedMimeType && expectedMimeType !== detectedMime) {
    throw new Error("MIME_MISMATCH");
  }

  const dims =
    detectedMime === "image/png"
      ? parsePngDimensions(buf)
      : detectedMime === "image/jpeg"
        ? parseJpegDimensions(buf)
        : parseWebpDimensions(buf);

  if (!dims || dims.width < 64 || dims.height < 64 || dims.width > 10000 || dims.height > 10000) {
    throw new Error("INVALID_DIMENSIONS");
  }

  const sanitized =
    detectedMime === "image/jpeg"
      ? stripJpegMetadata(buf)
      : detectedMime === "image/png"
        ? stripPngMetadata(buf)
        : { buffer: buf, stripped: false };

  const sha256 = crypto.createHash("sha256").update(sanitized.buffer).digest("hex");

  return {
    mimeType: detectedMime,
    width: dims.width,
    height: dims.height,
    sha256,
    strippedBuffer: sanitized.buffer,
    metadataStripped: sanitized.stripped,
  };
}
