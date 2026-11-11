import { notFound } from '@server/core/errors';
import type { Request } from 'express';
import type { z } from 'zod';

/**
 * The params of a token route. A malformed token is the same 404 as an unknown one, not a 400
 * that tells the two apart.
 */
export function tokenParams<T extends z.ZodType>(
  schema: T,
  req: Request,
  message: string,
): z.output<T> {
  const params = schema.safeParse(req.params);
  if (!params.success) throw notFound(message);
  return params.data;
}
