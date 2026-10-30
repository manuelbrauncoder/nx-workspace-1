export type UserRole = 'user' | 'admin';

/** An account as an admin sees it in the list of all users. The signed-in user is `Me`. */
export interface User {
  id: string;
  email: string;
  /** Optional at sign-up, so it can be missing. */
  name: string | undefined;
  role: UserRole;
  createdAt: Date;
}
