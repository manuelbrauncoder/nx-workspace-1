import { EVENT_IMAGES_MAX } from '@vyte/contracts/events-limits';
import multer from 'multer';
import { config } from '../../config/index.js';

/** Parses multipart uploads from the "images" field into memory. */
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploads.maxFileSizeMb * 1024 * 1024,
    // one more than allowed, so 7 files reach the service and get the same 409 as the total;
    // multer cuts off at 8 or more (400)
    files: EVENT_IMAGES_MAX + 1,
    // only the files: no text fields, so nothing else is buffered
    fields: 0,
    parts: EVENT_IMAGES_MAX + 1,
    fieldNameSize: 100,
  },
}).array('images');
