// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export {
  EVENT_GUESTS_MAX,
  GUESTS_BULK_MAX,
  GUEST_COMPANIONS_MAX,
  GUEST_NAME_MAX_LENGTH,
  GUEST_NOTE_MAX_LENGTH,
} from '@api/guests/guest';
export type {
  Guest,
  GuestDraft,
  GuestResponse,
  GuestsBulk,
  GuestsExportLanguage,
  HostAnswer,
} from '@api/guests/guest';
// The guest list shows title, time zone and state of its event.
export type { EventCounts, VyteEvent } from '@api/events/event';
