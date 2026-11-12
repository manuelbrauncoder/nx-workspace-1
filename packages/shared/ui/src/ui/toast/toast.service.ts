import { Service, signal } from '@angular/core';
import { toast } from '@spartan-ng/brain/sonner';

export type UiToastPosition =
  'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';

export interface UiToastOptions {
  /** Second line below the message. */
  description?: string;
  /** Where this toast appears. Defaults to the position of the `app-ui-toaster`, top right. */
  position?: UiToastPosition;
}

/**
 * Short, self-dismissing feedback after an action, shown by the `app-ui-toaster` in the app
 * shell. Use it for confirmations. Errors stay until they are closed. A failure the user has to
 * act on belongs into an `app-failure-alert` next to the content. The toaster's live regions read
 * out every message, so a toast that vanishes is not missed.
 *
 * @example
 * private readonly _toast = inject(UiToastService);
 *
 * private async _save(): Promise<void> {
 *   if (await this._store.create(this.draft())) {
 *     this._toast.success('Notiz gespeichert');
 *   }
 * }
 *
 * // Somewhere other than the default corner:
 * this._toast.info('Entwurf wiederhergestellt', { position: 'bottom-center' });
 */
@Service()
export class UiToastService {
  private readonly _status = signal('');
  private readonly _alert = signal('');

  /** The last confirmation, read by the polite live region of the toaster. */
  readonly status = this._status.asReadonly();
  /** The last error, read by the assertive live region of the toaster. */
  readonly alert = this._alert.asReadonly();

  success(message: string, options?: UiToastOptions): void {
    this._status.set(message);
    toast.success(message, options);
  }

  info(message: string, options?: UiToastOptions): void {
    this._status.set(message);
    toast.info(message, options);
  }

  warning(message: string, options?: UiToastOptions): void {
    this._status.set(message);
    toast.warning(message, options);
  }

  error(message: string, options?: UiToastOptions): void {
    this._alert.set(message);
    toast.error(message, { ...options, duration: Infinity, closeButton: true });
  }
}
