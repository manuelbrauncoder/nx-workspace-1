import { Component, computed, inject, linkedSignal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { PORTFOLIO_LIMITS, Settings } from '../../domain/portfolio';
import { SectionFormFooter } from '../section-form-footer/section-form-footer';
import { emailRules, urlRules } from '../section-form/section-rules';
import { injectSectionSave } from '../section-form/section-save';

interface SettingsFormModel {
  email: string;
  github: string;
  linkedin: string;
}

const toModel = (settings: Settings | undefined): SettingsFormModel => ({
  email: settings?.email ?? '',
  github: settings?.profiles.github ?? '',
  linkedin: settings?.profiles.linkedin ?? '',
});

const fromModel = (model: SettingsFormModel): Settings => ({
  email: model.email,
  profiles: { github: model.github, linkedin: model.linkedin },
});

/** The direct ways of contact in the contact section: email and public profiles. */
@Component({
  selector: 'app-settings-form',
  imports: [FormField, FormRoot, TranslatePipe, FormText, SectionFormFooter],
  styleUrl: './settings-form.scss',
  templateUrl: './settings-form.html',
})
export class SettingsForm {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _save = injectSectionSave('settings');

  private readonly _section = computed(() => this._store.portfolio()?.settings);
  /** Starts from the stored section and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._section()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _settingsForm = form(
    this._model,
    (path) => {
      emailRules(path.email, this._i18n);
      urlRules(path.github, this._i18n, { max: PORTFOLIO_LIMITS.url });
      urlRules(path.linkedin, this._i18n, { max: PORTFOLIO_LIMITS.url });
    },
    { submission: { action: () => this._save(fromModel(this._model())) } },
  );
}
