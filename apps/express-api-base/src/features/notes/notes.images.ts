import multer from 'multer';
import { config } from '../../config/index.js';

/** Parses multipart uploads from the "images" field into memory. */
export const uploadImages = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: config.uploads.maxFileSizeMb * 1024 * 1024,
    files: config.uploads.maxImagesPerNote,
  },
}).array('images');
