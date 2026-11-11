// The wire format is defined once in the contract with the API. Types only, so Zod stays out of
// the bundle.
export type {
  HidePhotoDto,
  PhotoDto,
  PhotoResponseDto,
  PhotosResponseDto,
} from '@vyte/contracts/photos';
