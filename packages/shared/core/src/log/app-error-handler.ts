import { ErrorHandler, inject, Service } from '@angular/core';
import { AppLog } from './app-log';

/**
 * Routes every unhandled error of the app through `AppLog`. It shows nothing to the user:
 * expected errors are a `Failure` and are rendered where they happen.
 */
@Service({ autoProvided: false })
export class AppErrorHandler implements ErrorHandler {
  private readonly _log = inject(AppLog);

  handleError(error: unknown): void {
    this._log.error('Unhandled error', error);
  }
}
