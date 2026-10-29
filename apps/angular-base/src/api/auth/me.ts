export type MeRole = 'user' | 'admin';

/** The signed-in user. */
export interface Me {
  id: string;
  email: string;
  /** Optional at sign-up, so it can be missing. */
  name: string | undefined;
  role: MeRole;
  createdAt: Date;
}

/** What a user enters to sign in. */
export interface Credentials {
  email: string;
  password: string;
}

/** What a user enters to create an account. An empty name is not sent. */
export interface Registration {
  email: string;
  password: string;
  name: string;
}

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;
