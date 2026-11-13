// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export { PHOTO_TYPES, PHOTO_UPLOADER_NAME_MAX_LENGTH } from '@api/upload/upload';
export type { OwnPhoto, Upload, UploadLink } from '@api/upload/upload';
