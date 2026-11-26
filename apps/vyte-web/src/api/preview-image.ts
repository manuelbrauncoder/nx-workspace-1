import { PREVIEW_IMAGE } from '@vyte/contracts/preview-image';

/** The preview image of a shared link (`og:image`), cut by the API from the cover of an event. */
export interface PreviewImage {
  url: string;
  width: number;
  height: number;
}

/** The size is fixed by the API, so it is known before anyone loads the image. */
export function previewImage(url: string): PreviewImage {
  return { url, ...PREVIEW_IMAGE };
}
