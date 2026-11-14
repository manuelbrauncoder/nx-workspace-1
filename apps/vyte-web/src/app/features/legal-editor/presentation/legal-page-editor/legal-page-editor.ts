import { Component, computed, effect, inject, input, linkedSignal, untracked } from '@angular/core';
import { form, FormField, FormRoot, maxLength, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { injectPageSeo } from '@core/seo/inject-page-seo';
import { AsyncContent } from '@shared/async-content/async-content';
import { FailureAlert } from '@shared/failure-alert/failure-alert';
import { FormRichText } from '@shared/form-controls/form-rich-text/form-rich-text';
import { UiBreadcrumb, UiBreadcrumbItem } from '@shared/ui/breadcrumb/breadcrumb';
import { UiButton } from '@shared/ui/button/button';
import { UiText } from '@shared/ui/text/text';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { LegalEditorStore } from '../../application/legal-editor.store';
import { LEGAL_PAGE_MAX_LENGTH, LegalPage, LegalPageName } from '../../domain/legal';

const toModel = (page: LegalPage | undefined): Localized<string> =>
  page ? { ...page.html } : localizedOf('');

/**
 * Edits one legal page on `/admin/legal/:page`, both languages with the rich text editor.
 * Saving creates the page if it does not exist yet. The route only matches known pages.
 */
@Component({
  selector: 'app-legal-page-editor',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    TranslatePipe,
    AsyncContent,
    FailureAlert,
    FormRichText,
    UiBreadcrumb,
    UiButton,
    UiText,
  ],
  styleUrl: './legal-page-editor.scss',
  templateUrl: './legal-page-editor.html',
})
export class LegalPageEditor {
  /** Route parameter, bound through `withComponentInputBinding()`. */
  readonly page = input.required<LegalPageName>();

  private readonly _store = inject(LegalEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _toast = inject(UiToastService);

  private readonly _pageKey = computed(() => `legalEditor.pages.${this.page()}` as const);
  private readonly _breadcrumb = computed((): UiBreadcrumbItem[] => [
    { labelKey: 'admin.tabs.legal', path: '/admin/legal' },
    { labelKey: this._pageKey() },
  ]);
  private readonly _stored = computed(() => this._store.pages()?.[this.page()]);
  private readonly _saving = computed(() => this._store.mutationState().loadingState === 'loading');

  /** Starts from the stored page and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._stored()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _pageForm = form(
    this._model,
    (path) => {
      // Messages are functions, so a visible error follows the language.
      for (const language of [path.de, path.en]) {
        required(language, {
          message: () => this._i18n.translate('legalPageEditor.validation.required'),
        });
        maxLength(language, LEGAL_PAGE_MAX_LENGTH, {
          message: () => this._i18n.translate('legalPageEditor.validation.tooLong'),
        });
      }
    },
    { submission: { action: () => this._save() } },
  );

  constructor() {
    // A failure from another page does not belong here.
    effect(() => {
      this.page();
      untracked(() => this._store.resetMutation());
    });
    injectPageSeo(() => ({ title: this._i18n.translate(this._pageKey()) }));
  }

  private async _save(): Promise<void> {
    if (await this._store.save(this.page(), this._model())) {
      this._toast.success(this._i18n.translate('legalPageEditor.saved'));
    }
  }
}
