import { z } from 'zod';
import {
  GUEST_COMPANIONS_MAX,
  GUEST_MESSAGE_MAX_LENGTH,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NOTE_MAX_LENGTH,
  GUESTS_BULK_MAX,
} from './guests-limits';
import { tokenSchema } from './token';

export { tokenSchema };

const name = z.string().trim().min(1).max(GUEST_NAME_MAX_LENGTH);
// An empty string counts as "no note".
const note = z
  .string()
  .trim()
  .max(GUEST_NOTE_MAX_LENGTH)
  .nullish()
  .transform((value) => value || null);
const maxCompanions = z.number().int().min(0).max(GUEST_COMPANIONS_MAX);

export const guestResponseValueSchema = z.enum(['pending', 'accepted', 'declined']);
export const answeredBySchema = z.enum(['guest', 'host']);

export const createGuestSchema = z.object({
  name,
  note: note.default(null),
  maxCompanions: maxCompanions.default(0),
});

/** A pasted list: one guest per name, all with the same allowance. */
export const createGuestsBulkSchema = z.object({
  names: z.array(name).min(1).max(GUESTS_BULK_MAX),
  maxCompanions: maxCompanions.default(0),
});

export const updateGuestSchema = z
  .object({ name, note, maxCompanions })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

/** An answer a host records for a guest, e.g. one given in person. A decline counts no companions. */
export const hostResponseSchema = z.object({
  response: z.enum(['accepted', 'declined']),
  companions: z.number().int().min(0).max(GUEST_COMPANIONS_MAX).default(0),
});

export const guestParamsSchema = z.object({ id: z.uuid(), guestId: z.uuid() });

/** A guest as the hosts see it, with the token of the personal link. */
export const guestSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  note: z.string().nullable(),
  maxCompanions: z.number().int(),
  token: tokenSchema,
  response: guestResponseValueSchema,
  companions: z.number().int(),
  /** The allowance was lowered below the companions given; the hosts should tell the guest. */
  companionsReduced: z.boolean(),
  message: z.string().nullable(),
  answeredBy: answeredBySchema.nullable(),
  respondedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const guestResponseSchema = z.object({ guest: guestSchema });
export const guestsResponseSchema = z.object({ guests: z.array(guestSchema) });

/** The answer of a guest through their link. A decline counts no companions. */
export const rsvpSchema = z.object({
  response: z.enum(['accepted', 'declined']),
  companions: z.number().int().min(0).max(GUEST_COMPANIONS_MAX).default(0),
  message: z
    .string()
    .trim()
    .max(GUEST_MESSAGE_MAX_LENGTH)
    .nullish()
    .transform((value) => value || null),
});

export const rsvpParamsSchema = z.object({ token: tokenSchema });
export const rsvpImageParamsSchema = z.object({ token: tokenSchema, imageId: z.uuid() });

/** What a guest sees of the event: no guest list, no notes, no emails. */
const invitationEventSchema = z.object({
  title: z.string(),
  description: z.string(),
  locationName: z.string().nullable(),
  address: z.string().nullable(),
  allDay: z.boolean(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().nullable(),
  timeZone: z.string(),
  rsvpDeadline: z.iso.datetime().nullable(),
  images: z.array(
    z.object({
      id: z.uuid(),
      width: z.number().int(),
      height: z.number().int(),
      position: z.number().int(),
    }),
  ),
  /** Names of owner and editors who set one; never an email. */
  hosts: z.array(z.string()),
});

const invitationGuestSchema = z.object({
  name: z.string(),
  maxCompanions: z.number().int(),
  response: guestResponseValueSchema,
  companions: z.number().int(),
  message: z.string().nullable(),
  respondedAt: z.iso.datetime().nullable(),
});

/** Before and during the event: everything a guest needs. After it: only the title. */
export const invitationSchema = z.discriminatedUnion('past', [
  z.object({
    past: z.literal(false),
    /** Answers are open until the deadline, or until the start without one. */
    open: z.boolean(),
    event: invitationEventSchema,
    guest: invitationGuestSchema,
  }),
  z.object({
    past: z.literal(true),
    event: z.object({ title: z.string() }),
  }),
]);

export const invitationResponseSchema = z.object({ invitation: invitationSchema });

/** What a validated request holds. */
export type CreateGuestInput = z.output<typeof createGuestSchema>;
export type CreateGuestsBulkInput = z.output<typeof createGuestsBulkSchema>;
export type UpdateGuestInput = z.output<typeof updateGuestSchema>;
export type HostResponseInput = z.output<typeof hostResponseSchema>;
export type RsvpInput = z.output<typeof rsvpSchema>;

// The wire format as a client sees it. Times are ISO 8601 strings.
export type GuestDto = z.output<typeof guestSchema>;
export type GuestResponseDto = z.output<typeof guestResponseSchema>;
export type GuestsResponseDto = z.output<typeof guestsResponseSchema>;
export type InvitationDto = z.output<typeof invitationSchema>;
export type InvitationResponseDto = z.output<typeof invitationResponseSchema>;
export type CreateGuestDto = z.input<typeof createGuestSchema>;
export type CreateGuestsBulkDto = z.input<typeof createGuestsBulkSchema>;
export type UpdateGuestDto = z.input<typeof updateGuestSchema>;
export type HostResponseDto = z.input<typeof hostResponseSchema>;
export type RsvpDto = z.input<typeof rsvpSchema>;
