import { pino } from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.logLevel,
  // pino-http logs all headers; the session cookie would let anyone with the logs sign in, and
  // the referer of a page with a token link in its path carries the token
  redact: [
    'req.headers.cookie',
    'req.headers.referer',
    // the detail of a database error can quote the values of a row
    'err.detail',
    'res.headers["set-cookie"]',
    'res.headers.location',
  ],
  ...(config.nodeEnv === 'development' && { transport: { target: 'pino-pretty' } }),
});

// A token link: 32 random bytes in base64url, a path segment of its own. A uuid has 36
// characters, so ids stay readable.
const TOKEN_SEGMENT = /(?<=\/)[A-Za-z0-9_-]{43}(?=[/?#]|$)/g;

/** Replaces the token segments of a path, e.g. `/auth/account-invites/[token]`. */
export function redactTokens(url: string): string {
  return url.replace(TOKEN_SEGMENT, '[token]');
}

interface SerializedRequest {
  url?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

/** Request serializer of the request log: the url and the route params without tokens. */
export function serializeRequest(req: SerializedRequest): SerializedRequest {
  const params = req.params
    ? Object.fromEntries(
        Object.entries(req.params).map(([key, value]) => [
          key,
          typeof value === 'string' ? redactTokens(`/${value}`).slice(1) : value,
        ]),
      )
    : req.params;
  return { ...req, url: req.url && redactTokens(req.url), params };
}
