import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { config } from './config';
import { badRequest } from './errors';
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
  await Promise.all(
    filenames.map((filename) =>
      rm(imagePath(filename), { force: true }).catch((error: unknown) => {
        logger.warn({ err: error, filename }, 'Could not remove image file');
      }),
    ),
  );
}
