import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';
import { formatLocalDate, LocalDateFormat } from './local-date';

/**
 * Formats a date in the locale of the active language. Use it instead of Angular's `DatePipe`,
 * whose locale is fixed when the app starts.
 *
 * @example
 * <time [attr.datetime]="note.updatedAt.toISOString()">{{ note.updatedAt | localDate: 'dateTime' }}</time>
 */
@Pipe({
  name: 'localDate',
  // Reads the locale signal, so the template runs it again when the language changes.
  pure: false,
})
export class LocalDatePipe implements PipeTransform {
  private readonly _i18n = inject(I18nService);

  transform(date: Date, format: LocalDateFormat = 'date'): string {
    return formatLocalDate(date, this._i18n.locale(), format);
  }
}
