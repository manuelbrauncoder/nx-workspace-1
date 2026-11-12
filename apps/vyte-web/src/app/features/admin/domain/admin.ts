// The models belong to the API layer. The rest of the feature imports them from here, so
// `domain` stays the only place of the feature that knows the API layer.
export { ACCOUNT_INVITE_NAME_MAX_LENGTH } from '@api/account-invites/account-invite';
export type { AccountInvite } from '@api/account-invites/account-invite';
export type { User, UserRole } from '@api/users/user';
