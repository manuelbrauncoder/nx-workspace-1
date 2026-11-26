// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export type { PreviewImage } from '@api/preview-image';
export type {
  PastSaveTheDate,
  SaveTheDate,
  UpcomingSaveTheDate,
} from '@api/save-the-date/save-the-date';
