import { describe, expect, it } from "vitest";
import { inspectAndSanitizeImage } from "./image-security.js";

function buildTestPng(width: number, height: number, withTextChunk = false): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 2; // RGB
  const ihdr = makeChunk("IHDR", ihdrData);

  const chunks: Buffer[] = [sig, ihdr];
  if (withTextChunk) {
    chunks.push(makeChunk("tEXt", Buffer.from("Author\0Secret Camera Info")));
  }
  chunks.push(makeChunk("IEND", Buffer.alloc(0)));
  return Buffer.concat(chunks);
}

function makeChunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  return Buffer.concat([len, typeBuf, data, crc]);
}

describe("image-security", () => {
  it("validates PNG magic bytes, dimensions, and strips tEXt metadata", () => {
    const png = buildTestPng(256, 256, true);
    const inspected = inspectAndSanitizeImage(png, "image/png");

    expect(inspected.mimeType).toBe("image/png");
    expect(inspected.width).toBe(256);
    expect(inspected.height).toBe(256);
    expect(inspected.metadataStripped).toBe(true);
    expect(inspected.strippedBuffer.length).toBeLessThan(png.length);
  });

  it("rejects spoofed non-image payloads", () => {
    const fake = Buffer.from("not-a-real-image-payload");
    expect(() => inspectAndSanitizeImage(fake, "image/png")).toThrow("INVALID_FILE_SIGNATURE");
  });

  it("rejects images smaller than 64x64", () => {
    const tiny = buildTestPng(32, 32, false);
    expect(() => inspectAndSanitizeImage(tiny, "image/png")).toThrow("INVALID_DIMENSIONS");
  });
});
