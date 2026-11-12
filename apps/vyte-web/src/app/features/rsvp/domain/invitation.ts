// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export { GUEST_MESSAGE_MAX_LENGTH } from '@api/rsvp/invitation';
export type {
  Invitation,
  InvitationEvent,
  InvitationGuest,
  InvitationImage,
  PastInvitation,
  RsvpAnswer,
  UpcomingInvitation,
} from '@api/rsvp/invitation';
