import { signUpSchema } from '@contracts/auth';
import { z } from 'zod';
import { memberRoleSchema } from './events';
import { tokenSchema } from './guests';

export const memberParamsSchema = z.object({ id: z.uuid(), userId: z.uuid() });
export const inviteParamsSchema = z.object({ id: z.uuid(), inviteId: z.uuid() });
export const inviteTokenParamsSchema = z.object({ token: tokenSchema });

/** The editor who becomes owner; the owner becomes an editor. */
export const handOverSchema = z.object({ userId: z.uuid() });

/** Name, email and password of a new account, made through an editor invite. */
export const inviteSignUpSchema = signUpSchema;

/** Owner or editor of an event, as the other members see them. */
export const memberSchema = z.object({
  userId: z.uuid(),
  name: z.string().nullable(),
  email: z.email(),
  role: memberRoleSchema,
  joinedAt: z.iso.datetime(),
});

/** An open editor invite as the owner sees it, with the token of its link. */
export const editorInviteSchema = z.object({
  id: z.uuid(),
  token: tokenSchema,
  expiresAt: z.iso.datetime(),
  createdAt: z.iso.datetime(),
});

/** What someone opening an invite link sees before accepting it. */
export const publicEditorInviteSchema = z.object({
  eventTitle: z.string(),
  startsAt: z.iso.datetime(),
  allDay: z.boolean(),
  timeZone: z.string(),
  /** Only if the owner set a name; never an email. */
  ownerName: z.string().nullable(),
});

export const membersResponseSchema = z.object({ members: z.array(memberSchema) });
export const editorInviteResponseSchema = z.object({ invite: editorInviteSchema });
export const editorInvitesResponseSchema = z.object({ invites: z.array(editorInviteSchema) });
export const publicEditorInviteResponseSchema = z.object({ invite: publicEditorInviteSchema });

/** What a validated request holds. */
export type HandOverInput = z.output<typeof handOverSchema>;
export type InviteSignUpInput = z.output<typeof inviteSignUpSchema>;

// The wire format as a client sees it. Times are ISO 8601 strings.
export type MemberDto = z.output<typeof memberSchema>;
export type EditorInviteDto = z.output<typeof editorInviteSchema>;
export type PublicEditorInviteDto = z.output<typeof publicEditorInviteSchema>;
export type MembersResponseDto = z.output<typeof membersResponseSchema>;
export type EditorInviteResponseDto = z.output<typeof editorInviteResponseSchema>;
export type EditorInvitesResponseDto = z.output<typeof editorInvitesResponseSchema>;
export type PublicEditorInviteResponseDto = z.output<typeof publicEditorInviteResponseSchema>;
export type HandOverDto = z.input<typeof handOverSchema>;
export type InviteSignUpDto = z.input<typeof inviteSignUpSchema>;
