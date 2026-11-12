// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export {
  EVENT_ADDRESS_MAX_LENGTH,
  EVENT_DESCRIPTION_MAX_LENGTH,
  EVENT_IMAGES_MAX,
  EVENT_IMAGE_MAX_BYTES,
  EVENT_IMAGE_TYPES,
  EVENT_LOCATION_NAME_MAX_LENGTH,
  EVENT_TITLE_MAX_LENGTH,
  SAVE_THE_DATE_NOTE_MAX_LENGTH,
} from '@api/events/event';
export type { EventCounts, EventDraft, EventImage, VyteEvent } from '@api/events/event';
