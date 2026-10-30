// The wire format is defined once in the contract with the API. Types only, so Zod stays out of
// the bundle.
export type {
  UserDto as MeDto,
  UserResponseDto as MeResponseDto,
  SignInDto,
  SignUpDto,
} from '@contracts/auth';
