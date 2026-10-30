import { HttpErrorResponse } from '@angular/common/http';
import { Failure, FailureKind } from './failure';

/** For the log. The user sees the translated text of the kind, see `app-failure-alert`. */
const DEFAULT_MESSAGES: Record<FailureKind, string> = {
  network: 'The server cannot be reached.',
  'bad-request': 'The request was invalid.',
  unauthorized: 'Not signed in.',
  forbidden: 'Missing permission for this action.',
  'not-found': 'The entry was not found.',
  conflict: 'The request conflicts with existing data.',
  'too-many-requests': 'Too many attempts.',
  server: 'An error occurred on the server.',
  unknown: 'An unknown error occurred.',
};

function kindOf(status: number): FailureKind {
  if (status === 0) return 'network';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not-found';
  if (status === 409) return 'conflict';
  if (status === 429) return 'too-many-requests';
  if (status >= 500) return 'server';
  if (status >= 400) return 'bad-request';
  return 'unknown';
}

/** The backend reports errors as `{ error: { message: string } }`, in English. */
function serverMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null || !('error' in body)) {
    return undefined;
  }
  const error = body.error;
  return typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
    ? error.message
    : undefined;
}

/** Single place where any thrown value becomes a `Failure`. */
export function toFailure(error: unknown): Failure {
  if (error instanceof Failure) {
    return error;
  }
  if (error instanceof HttpErrorResponse) {
    const kind = kindOf(error.status);
    return new Failure(kind, serverMessage(error.error) ?? DEFAULT_MESSAGES[kind], {
      status: error.status,
      cause: error,
    });
  }
  // A failure that was wrapped on its way, e.g. by a resource or a rethrow.
  if (error instanceof Error && error.cause instanceof Failure) {
    return error.cause;
  }
  return new Failure('unknown', DEFAULT_MESSAGES.unknown, { cause: error });
}
