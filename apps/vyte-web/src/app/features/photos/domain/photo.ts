// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export type { VyteEvent } from '@api/events/event';
export type { Photo, PhotoSource } from '@api/photos/photo';
