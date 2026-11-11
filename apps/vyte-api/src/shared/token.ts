import { randomBytes } from 'node:crypto';

/**
 * A token link: 32 random bytes in base64url, 43 characters. The request log masks path
 * segments of exactly this shape (`redactTokens()` in `@server/core/logger`), so a token always
 * goes in a path segment of its own, never in a query string.
 */
export function newToken(): string {
  return randomBytes(32).toString('base64url');
}
