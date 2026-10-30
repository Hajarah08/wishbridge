import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

export type ProcessedImage = { buffer: Buffer; width: number; height: number; filename: string };

/**
 * Validates an uploaded image by decoding it (not by trusting the extension or
 * MIME type), then re-encodes to WebP. Re-encoding strips EXIF/GPS metadata and
 * neutralises polyglot files.
 */
export async function processWishImage(file: File): Promise<ProcessedImage> {
  if (file.size === 0) throw new ImageError("The image file is empty.");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageError("Images must be 5 MB or smaller.");
  const input = Buffer.from(await file.arrayBuffer());
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new ImageError("That file isn't a supported image. Use JPEG, PNG or WebP.");
  }
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageError("That file isn't a supported image. Use JPEG, PNG or WebP.");
  }
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer({ resolveWithObject: true });
  return { buffer: data, width: info.width, height: info.height, filename: `${randomUUID()}.webp` };
}

export class ImageError extends Error {}
