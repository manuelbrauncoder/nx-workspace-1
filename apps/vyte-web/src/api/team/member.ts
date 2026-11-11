import { MemberRole } from '../events/event';

/** Someone who may edit an event: its owner or an editor. */
export interface Member {
  userId: string;
  /** Optional when the account was created, so it can be missing. */
  name: string | null;
  email: string;
  role: MemberRole;
  joinedAt: Date;
}

/**
 * An open invite to become an editor. Whoever opens `/invite/<token>` joins the event, the link
 * works once.
 */
export interface EditorInvite {
  id: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}
