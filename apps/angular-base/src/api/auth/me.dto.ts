/** Wire format of the signed-in user. `createdAt` is an ISO 8601 string. */
export interface MeDto {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin';
  createdAt: string;
}

/** Sign-up, sign-in and `/auth/me` all wrap the user. */
export interface MeResponseDto {
  user: MeDto;
}

export interface SignInDto {
  email: string;
  password: string;
}

export interface SignUpDto {
  email: string;
  password: string;
  name?: string;
}
