import { Component, computed, inject, linkedSignal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { PORTFOLIO_LIMITS, Seo } from '../../domain/portfolio';
import { ImageField } from '../image-field/image-field';
import { fromImageForm, ImageForm, imageRules, toImageForm } from '../image-field/image-form';
import { LocalizedField } from '../localized-field/localized-field';
import { SectionFormFooter } from '../section-form-footer/section-form-footer';
import { localizedRules } from '../section-form/section-rules';
import { injectSectionSave } from '../section-form/section-save';

interface SeoFormModel {
  title: Localized<string>;
  description: Localized<string>;
  ogImage: ImageForm;
}

const toModel = (seo: Seo | undefined): SeoFormModel => ({
  title: seo ? { ...seo.title } : localizedOf(''),
  description: seo ? { ...seo.description } : localizedOf(''),
  ogImage: toImageForm(seo?.ogImage),
});

const fromModel = (model: SeoFormModel): Seo => ({
  title: model.title,
  description: model.description,
  ogImage: fromImageForm(model.ogImage),
});

/** Title, description and preview image of the start page in search results and shared links. */
@Component({
  selector: 'app-seo-form',
  imports: [FormRoot, TranslatePipe, ImageField, LocalizedField, SectionFormFooter],
  styleUrl: './seo-form.scss',
  templateUrl: './seo-form.html',
})
export class SeoForm {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _save = injectSectionSave('seo');

  private readonly _section = computed(() => this._store.portfolio()?.seo);
  /** Starts from the stored section and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._section()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _seoForm = form(
    this._model,
    (path) => {
      localizedRules(path.title, this._i18n, { max: PORTFOLIO_LIMITS.seoTitle });
      localizedRules(path.description, this._i18n, { max: PORTFOLIO_LIMITS.seoDescription });
      imageRules(path.ogImage, this._i18n, { optional: true });
    },
    { submission: { action: () => this._save(fromModel(this._model())) } },
  );
}
