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

// Sign-up, sign-in and `/auth/me` wrap the user, the admin list wraps all users.
export const userResponseSchema = z.object({ user: userSchema });
export const usersResponseSchema = z.object({ users: z.array(userSchema) });

export const userParamsSchema = z.object({ id: z.uuid() });
export const updateUserSchema = z.object({ role: roleSchema });

/** What a validated request holds. */
export type SignUpInput = z.output<typeof signUpSchema>;
export type SignInInput = z.output<typeof signInSchema>;
export type UpdateUserInput = z.output<typeof updateUserSchema>;
export type Role = z.output<typeof roleSchema>;

// The wire format as a client sees it. `createdAt` is an ISO 8601 string.
export type UserDto = z.output<typeof userSchema>;
export type UserResponseDto = z.output<typeof userResponseSchema>;
export type UsersResponseDto = z.output<typeof usersResponseSchema>;
export type SignUpDto = z.input<typeof signUpSchema>;
export type SignInDto = z.input<typeof signInSchema>;
export type UpdateUserDto = z.input<typeof updateUserSchema>;
