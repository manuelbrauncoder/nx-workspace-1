// The wire format is defined once in the contract with the API. Types only, so Zod stays out of
// the bundle.
export type {
  PublicEditorInviteDto as InvitePreviewDto,
  PublicEditorInviteResponseDto as InvitePreviewResponseDto,
} from '@vyte/contracts/team';
