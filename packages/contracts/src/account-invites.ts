import { z } from 'zod';
import { signUpSchema } from './auth';

/** An account link: 32 random bytes, base64url without padding. */
export const accountInviteTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export const accountInviteTokenParamsSchema = z.object({ token: accountInviteTokenSchema });
export const accountInviteParamsSchema = z.object({ id: z.uuid() });

/** What an admin sends: the name of the new account. */
export const createAccountInviteSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

/** Email, password and an optional name; without a name the account takes the one of the link. */
export const acceptAccountInviteSchema = signUpSchema;

/** An open account link as admins see it. */
export const accountInviteSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  token: accountInviteTokenSchema,
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

/** What the person who opens the link sees before creating the account. */
export const publicAccountInviteSchema = z.object({ name: z.string() });

export const accountInviteResponseSchema = z.object({ invite: accountInviteSchema });
export const accountInvitesResponseSchema = z.object({ invites: z.array(accountInviteSchema) });
export const publicAccountInviteResponseSchema = z.object({ invite: publicAccountInviteSchema });

/** What a validated request holds. */
export type CreateAccountInviteInput = z.output<typeof createAccountInviteSchema>;
export type AcceptAccountInviteInput = z.output<typeof acceptAccountInviteSchema>;

// The wire format as a client sees it. Dates are ISO 8601 strings.
export type AccountInviteDto = z.output<typeof accountInviteSchema>;
export type PublicAccountInviteDto = z.output<typeof publicAccountInviteSchema>;
export type AccountInviteResponseDto = z.output<typeof accountInviteResponseSchema>;
export type AccountInvitesResponseDto = z.output<typeof accountInvitesResponseSchema>;
export type PublicAccountInviteResponseDto = z.output<typeof publicAccountInviteResponseSchema>;
export type CreateAccountInviteDto = z.input<typeof createAccountInviteSchema>;
export type AcceptAccountInviteDto = z.input<typeof acceptAccountInviteSchema>;
