import { z } from 'zod';
import {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_IMAGES_MAX,
  EVENT_LOCATION_NAME_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
} from './events-limits';

/** True for a time zone the runtime knows, e.g. `Europe/Berlin`. */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// An empty string counts as "not set".
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((value) => value || null);

const instant = z.iso.datetime({ offset: true }).transform((value) => new Date(value));

const eventFields = {
  title: z.string().trim().min(1).max(EVENT_TITLE_MAX_LENGTH),
  description: z.string().max(EVENT_DESCRIPTION_MAX_LENGTH),
  locationName: optionalText(EVENT_LOCATION_NAME_MAX_LENGTH),
  address: optionalText(EVENT_ADDRESS_MAX_LENGTH),
  allDay: z.boolean(),
  startsAt: instant,
  endsAt: instant.nullable(),
  timeZone: z.string().refine(isTimeZone, { message: 'Unknown time zone' }),
  rsvpDeadline: instant.nullable(),
};

/** The order of start, end and deadline, checked on create and on the merged event of an update. */
export function eventTimesError(event: {
  startsAt: Date;
  endsAt: Date | null;
  rsvpDeadline: Date | null;
}): { path: string; message: string } | undefined {
  if (event.endsAt && event.endsAt < event.startsAt) {
    return { path: 'endsAt', message: 'The end is before the start' };
  }
  if (event.rsvpDeadline && event.rsvpDeadline > event.startsAt) {
    return { path: 'rsvpDeadline', message: 'The deadline is after the start' };
  }
  return undefined;
}

export const createEventSchema = z
  .object({
    ...eventFields,
    description: eventFields.description.default(''),
    allDay: eventFields.allDay.default(false),
    endsAt: eventFields.endsAt.default(null),
    rsvpDeadline: eventFields.rsvpDeadline.default(null),
  })
  .superRefine((event, ctx) => {
    const error = eventTimesError(event);
    if (error) ctx.addIssue({ code: 'custom', path: [error.path], message: error.message });
  });

/** Any subset of the fields; the order of the times is checked against the stored event. */
export const updateEventSchema = z
  .object(eventFields)
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: 'Nothing to update' });

export const eventParamsSchema = z.object({ id: z.uuid() });
export const eventImageParamsSchema = z.object({ id: z.uuid(), imageId: z.uuid() });

/** The image ids of the event in their new order; position 0 is the cover image. */
export const reorderEventImagesSchema = z.object({
  ids: z.array(z.uuid()).min(1).max(EVENT_IMAGES_MAX),
});

export const memberRoleSchema = z.enum(['owner', 'editor']);

/** An image as returned by the API; the file is served by GET /events/:id/images/:imageId. */
export const eventImageSchema = z.object({
  id: z.uuid(),
  width: z.number().int(),
  height: z.number().int(),
  position: z.number().int(),
});

/** The guest list in numbers, see docs/vyte/spec.md section 5. */
export const eventCountsSchema = z.object({
  /** Guests on the list. */
  invited: z.number().int(),
  /** People expected: accepted guests plus their companions. */
  coming: z.number().int(),
  declined: z.number().int(),
  pending: z.number().int(),
  /** Everyone who could come: all guests plus all allowances. */
  atMost: z.number().int(),
});

/** An event as a member sees it. */
export const eventSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  locationName: z.string().nullable(),
  address: z.string().nullable(),
  allDay: z.boolean(),
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime().nullable(),
  timeZone: z.string(),
  rsvpDeadline: z.iso.datetime().nullable(),
  /** The role of the signed-in user. */
  role: memberRoleSchema,
  /** Past events are read-only, see docs/vyte/spec.md section 3. */
  past: z.boolean(),
  images: z.array(eventImageSchema),
  counts: eventCountsSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const eventResponseSchema = z.object({ event: eventSchema });
export const eventsResponseSchema = z.object({ events: z.array(eventSchema) });
export const eventImagesResponseSchema = z.object({ images: z.array(eventImageSchema) });

/** What a validated request holds. */
export type CreateEventInput = z.output<typeof createEventSchema>;
export type UpdateEventInput = z.output<typeof updateEventSchema>;
export type ReorderEventImagesInput = z.output<typeof reorderEventImagesSchema>;
export type MemberRole = z.output<typeof memberRoleSchema>;

// The wire format as a client sees it. Times are ISO 8601 strings.
export type EventDto = z.output<typeof eventSchema>;
export type EventImageDto = z.output<typeof eventImageSchema>;
export type EventResponseDto = z.output<typeof eventResponseSchema>;
export type EventsResponseDto = z.output<typeof eventsResponseSchema>;
export type EventImagesResponseDto = z.output<typeof eventImagesResponseSchema>;
export type CreateEventDto = z.input<typeof createEventSchema>;
export type UpdateEventDto = z.input<typeof updateEventSchema>;
export type ReorderEventImagesDto = z.input<typeof reorderEventImagesSchema>;
