import type { EventDto } from '@vyte/contracts/events';

// The wire format is defined once in the contract with the API. Types only, so Zod stays out of
// the bundle.
export type {
  CreateEventDto,
  EventDto,
  EventImageDto,
  EventImagesResponseDto,
  EventResponseDto,
  EventsResponseDto,
  ReorderEventImagesDto,
  SaveTheDateSettingsDto,
  UpdateEventDto,
} from '@vyte/contracts/events';

export type EventCountsDto = EventDto['counts'];
