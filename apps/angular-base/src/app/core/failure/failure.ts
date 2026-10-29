export type FailureKind =
  | 'network'
  | 'bad-request'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'too-many-requests'
  | 'server'
  | 'unknown';

/**
 * The one error type of the app. Everything that goes wrong is normalized to a `Failure` through
 * `toFailure`, so stores and components never deal with raw errors. It extends `Error` because a
 * resource only passes `Error` instances through unchanged.
 *
 * `message` is English and for the log. The user reads the translated text of the `kind`.
 */
export class Failure extends Error {
  override readonly name = 'Failure';
  readonly status: number | undefined;

  constructor(
    readonly kind: FailureKind,
    message: string,
    options?: { status?: number; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.status = options?.status;
  }
}
