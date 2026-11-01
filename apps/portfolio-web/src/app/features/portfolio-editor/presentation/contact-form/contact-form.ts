import { Component, computed, inject, linkedSignal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { localizedOf } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { ContactSection, PORTFOLIO_LIMITS } from '../../domain/portfolio';
import { LocalizedField } from '../localized-field/localized-field';
import { SectionFormFooter } from '../section-form-footer/section-form-footer';
import { localizedRules } from '../section-form/section-rules';
import { injectSectionSave } from '../section-form/section-save';

const toModel = (contact: ContactSection | undefined): ContactSection => ({
  headline: contact ? { ...contact.headline } : localizedOf(''),
  description: contact ? { ...contact.description } : localizedOf(''),
});

/** Heading and introduction above the contact form. Email and profiles are in the settings. */
@Component({
  selector: 'app-contact-form',
  imports: [FormRoot, TranslatePipe, LocalizedField, SectionFormFooter],
  styleUrl: './contact-form.scss',
  templateUrl: './contact-form.html',
})
export class ContactForm {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _save = injectSectionSave('contact');

  private readonly _section = computed(() => this._store.portfolio()?.contact);
  /** Starts from the stored section and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._section()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _contactForm = form(
    this._model,
    (path) => {
      localizedRules(path.headline, this._i18n, { max: PORTFOLIO_LIMITS.headline });
      localizedRules(path.description, this._i18n, { max: PORTFOLIO_LIMITS.description });
    },
    { submission: { action: () => this._save(this._model()) } },
  );
}
