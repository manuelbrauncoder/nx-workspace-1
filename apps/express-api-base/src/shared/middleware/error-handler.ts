import type { ErrorRequestHandler } from 'express';
import { MulterError } from 'multer';
import { HttpError } from '../errors.js';
import { logger } from '../logger.js';

function toHttpError(error: unknown): HttpError | undefined {
  if (error instanceof HttpError) return error;
  if (error instanceof MulterError) {
    return new HttpError(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400, error.message);
  }
  // errors from express.json() and similar (malformed JSON, body too large)
  if (error instanceof Error && 'status' in error && 'expose' in error) {
    const { status, expose } = error as Error & { status: unknown; expose: unknown };
    if (typeof status === 'number' && status >= 400 && status < 500 && expose === true) {
      return new HttpError(status, error.message);
    }
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);

  const httpError = toHttpError(error);
  if (!httpError) {
    logger.error({ err: error }, 'Unhandled error');
    res.status(500).json({ error: { message: 'Internal server error' } });
    return;
  }

  res.status(httpError.status).json({
    error: { message: httpError.message, details: httpError.details },
  });
};
