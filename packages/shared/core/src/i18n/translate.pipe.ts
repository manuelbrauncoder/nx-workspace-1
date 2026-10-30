import { inject, Pipe, PipeTransform } from '@angular/core';
import { I18nService } from './i18n.service';
import { TranslationKey, TranslationParams } from './translation-key';

/**
 * Translates a key in a template and follows the active language.
 *
 * @example
 * <h1>{{ 'notesList.heading' | t }}</h1>
 * <button [attr.aria-label]="'notes.delete.labelNamed' | t: { title: note.title }">...</button>
 */
@Pipe({
  name: 't',
  // Reads signals, so the template runs it again when the language changes.
  pure: false,
})
export class TranslatePipe implements PipeTransform {
  private readonly _i18n = inject(I18nService);

  transform(key: TranslationKey, params?: TranslationParams): string {
    return this._i18n.translate(key, params);
  }
}
