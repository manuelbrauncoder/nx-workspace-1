import { Component, computed, inject, linkedSignal } from '@angular/core';
import { form, FormField, FormRoot } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { FormText } from '@shared/form-controls/form-text/form-text';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { Hero, PORTFOLIO_LIMITS } from '../../domain/portfolio';
import { LocalizedField } from '../localized-field/localized-field';
import { SectionFormFooter } from '../section-form-footer/section-form-footer';
import { localizedRules, textRules } from '../section-form/section-rules';
import { injectSectionSave } from '../section-form/section-save';

/** Optional fields are empty in the form, saving leaves them out. */
interface HeroFormModel {
  name: string;
  description: Localized<string>;
  mapPlace: Localized<string>;
  mapCoordinates: string;
}

const toModel = (hero: Hero | undefined): HeroFormModel => ({
  name: hero?.name ?? '',
  description: hero ? { ...hero.description } : localizedOf(''),
  mapPlace: hero?.mapPlace ? { ...hero.mapPlace } : localizedOf(''),
  mapCoordinates: hero?.mapCoordinates ?? '',
});

/** The first screen: name, introduction and the pin on the map. */
@Component({
  selector: 'app-hero-form',
  imports: [FormField, FormRoot, TranslatePipe, FormText, LocalizedField, SectionFormFooter],
  styleUrl: './hero-form.scss',
  templateUrl: './hero-form.html',
})
export class HeroForm {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _save = injectSectionSave('hero');

  private readonly _section = computed(() => this._store.portfolio()?.hero);
  /** Starts from the stored section and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._section()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _heroForm = form(
    this._model,
    (path) => {
      textRules(path.name, this._i18n, { max: PORTFOLIO_LIMITS.name });
      localizedRules(path.description, this._i18n, { max: PORTFOLIO_LIMITS.description });
      localizedRules(path.mapPlace, this._i18n, { max: PORTFOLIO_LIMITS.mapPlace, optional: true });
      textRules(path.mapCoordinates, this._i18n, {
        max: PORTFOLIO_LIMITS.mapCoordinates,
        optional: true,
      });
    },
    { submission: { action: () => this._save({ ...this._model() }) } },
  );
}
