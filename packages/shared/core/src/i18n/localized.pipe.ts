import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';
import { Localized } from './localized';

/**
 * Picks the value of a `Localized` in the active language and follows a language switch.
 *
 * @example
 * <p>{{ hero.description | localized }}</p>
 * @for (fact of about.facts | localized; track $index) { ... }
 */
@Pipe({
  name: 'localized',
  // Reads the language signal, so the template runs it again when the language changes.
  pure: false,
})
export class LocalizedPipe implements PipeTransform {
  private readonly _i18n = inject(I18nService);

  transform<T>(value: Localized<T>): T {
    return this._i18n.localize(value);
  }
}
