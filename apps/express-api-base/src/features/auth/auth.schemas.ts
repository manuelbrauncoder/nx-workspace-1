import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email().max(254));

export const signUpSchema = z.object({
  email,
  password: z.string().min(8).max(128),
  // optional; an empty string counts as "no name"
  name: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => value || null),
});

export const signInSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const roleSchema = z.enum(['user', 'admin']);

/** A user as returned by the API. */
export const userSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string().nullable(),
  role: roleSchema,
  createdAt: z.iso.datetime(),
});

export type SignUpInput = z.output<typeof signUpSchema>;
export type SignInInput = z.output<typeof signInSchema>;
export type Role = z.output<typeof roleSchema>;
