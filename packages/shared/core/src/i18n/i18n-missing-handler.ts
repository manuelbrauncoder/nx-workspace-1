import { inject, Service } from '@angular/core';
import { TranslocoMissingHandler } from '@jsverse/transloco';
import { AppLog } from '../log/app-log';

/** Reports a key without a translation through the app log and shows the key itself. */
@Service({ autoProvided: false })
export class I18nMissingHandler implements TranslocoMissingHandler {
  private readonly _log = inject(AppLog);

  handle(key: string): string {
    this._log.warn(`Missing translation for "${key}"`);
    return key;
  }
}
