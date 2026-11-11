import { z } from 'zod';

/** A token link: 32 random bytes, base64url without padding. */
export const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
