import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { access, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from './config';
import { badRequest, notFound } from './errors';
import { logger } from './logger';

const uploadsDir = path.resolve(config.uploads.dir);
mkdirSync(uploadsDir, { recursive: true });

// "heif" covers AVIF; SVG and other formats sharp could read are rejected on purpose
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'gif', 'heif']);

// a small file can declare huge dimensions; decoding 50 MP takes about 200 MB of memory
// (sharp's default of 268 MP would allow more than 1 GB per image)
const MAX_INPUT_PIXELS = 50_000_000;

export interface ProcessedImage {
  data: Buffer;
  width: number;
  height: number;
}

/**
 * Re-encodes an upload to WebP, capped at the configured width or at `maxWidth`, and at
 * `maxHeight` when given (aspect ratio kept). The type is detected from the bytes, so a renamed
 * non-image is rejected, and metadata such as GPS data is dropped.
 */
export async function processImage(
  input: Buffer,
  {
    maxWidth = config.uploads.maxImageWidth,
    maxHeight,
  }: { maxWidth?: number; maxHeight?: number } = {},
): Promise<ProcessedImage> {
  try {
    const image = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
    const { format } = await image.metadata();
    if (!format || !ALLOWED_FORMATS.has(format)) throw new Error('Unsupported format');

    const { data, info } = await image
      .rotate()
      .resize({ width: maxWidth, height: maxHeight, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });

    return { data, width: info.width, height: info.height };
  } catch {
    throw badRequest('File is not a supported image (JPEG, PNG, WebP, AVIF or GIF)');
  }
}

// About 150 KB per 1200 × 630 JPEG, so at most ~15 MB. Stored names are random and never
// overwritten, so an entry needs no invalidation; `removeImages()` drops the entries of a file.
const PREVIEW_CACHE_MAX = 100;
const previews = new Map<string, Promise<Buffer>>();

/**
 * A stored image as JPEG for the preview of a shared link (`og:image`), cropped to exactly
 * `width` × `height` around its most interesting part. JPEG because not every messenger shows
 * WebP in a link preview. Rendered once per file and kept in a small LRU cache, parallel requests
 * share one render: the route is public, every crawler fetch would cost a decode otherwise. The
 * caller checks access on every request. A missing file is a 404, as with `sendFile`.
 */
export function previewImage(
  filename: string,
  { width, height }: { width: number; height: number },
): Promise<Buffer> {
  const key = `${filename}:${width}x${height}`;
  const cached = previews.get(key);
  if (cached) {
    // most recently used last
    previews.delete(key);
    previews.set(key, cached);
    return cached;
  }

  const file = imagePath(filename);
  const render = access(file)
    .catch(() => {
      throw notFound('Image not found');
    })
    .then(() =>
      sharp(file, { limitInputPixels: MAX_INPUT_PIXELS })
        .resize({ width, height, fit: 'cover', position: sharp.strategy.attention })
        .jpeg({ quality: 80, mozjpeg: true })
        .toBuffer(),
    )
    .catch((error: unknown) => {
      previews.delete(key);
      throw error;
    });
  previews.set(key, render);
  if (previews.size > PREVIEW_CACHE_MAX) {
    const oldest = previews.keys().next().value;
    if (oldest !== undefined) previews.delete(oldest);
  }
  return render;
}

function forgetPreviews(filename: string): void {
  for (const key of previews.keys()) {
    if (key.startsWith(`${filename}:`)) previews.delete(key);
  }
}

export function imagePath(filename: string): string {
  return path.join(uploadsDir, filename);
}

/** Writes the image under a random name and returns that name. */
export async function saveImage(data: Buffer): Promise<string> {
  const filename = `${randomUUID()}.webp`;
  await writeFile(imagePath(filename), data);
  return filename;
}

/** Best effort: a file that cannot be removed is logged, not treated as a request failure. */
export async function removeImages(filenames: string[]): Promise<void> {
  filenames.forEach(forgetPreviews);
  await Promise.all(
    filenames.map((filename) =>
      rm(imagePath(filename), { force: true }).catch((error: unknown) => {
        logger.warn({ err: error, filename }, 'Could not remove image file');
      }),
    ),
  );
}
