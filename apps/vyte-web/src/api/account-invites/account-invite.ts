/**
 * An open account link as an admin sees it. Whoever opens `/welcome/<token>` creates the account,
 * the link works once.
 */
export interface AccountInvite {
  id: string;
  /** Name of the new account, unless the invited person enters another one. */
  name: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

/** What the page of an account link shows before the account exists. */
export interface AccountInvitePreview {
  name: string;
}

/** The limit of the API, so a form can report it before sending. */
export const ACCOUNT_INVITE_NAME_MAX_LENGTH = 100;
