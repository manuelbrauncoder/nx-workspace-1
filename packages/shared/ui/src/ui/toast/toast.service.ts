import { Service } from '@angular/core';
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
 * shell. Use it for confirmations. A failure the user has to act on belongs into an
 * `app-failure-alert` next to the content.
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
  success(message: string, options?: UiToastOptions): void {
    toast.success(message, options);
  }

  info(message: string, options?: UiToastOptions): void {
    toast.info(message, options);
  }

  warning(message: string, options?: UiToastOptions): void {
    toast.warning(message, options);
  }

  error(message: string, options?: UiToastOptions): void {
    toast.error(message, options);
  }
}
