import { Component, computed, inject, linkedSignal } from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { About, PORTFOLIO_LIMITS } from '../../domain/portfolio';
import { ImageField } from '../image-field/image-field';
import { fromImageForm, ImageForm, imageRules, toImageForm } from '../image-field/image-form';
import { LocalizedField } from '../localized-field/localized-field';
import { SectionFormFooter } from '../section-form-footer/section-form-footer';
import {
  fromLines,
  localizedLinesRules,
  localizedRules,
  toLines,
} from '../section-form/section-rules';
import { injectSectionSave } from '../section-form/section-save';

/** The facts are a textarea per language with one fact per line. */
interface AboutFormModel {
  headline: Localized<string>;
  description: Localized<string>;
  facts: Localized<string>;
  image: ImageForm;
}

const toModel = (about: About | undefined): AboutFormModel => ({
  headline: about ? { ...about.headline } : localizedOf(''),
  description: about ? { ...about.description } : localizedOf(''),
  facts: { de: fromLines(about?.facts.de), en: fromLines(about?.facts.en) },
  image: toImageForm(about?.image),
});

/** Only called for a valid form, which always has an image. */
const fromModel = (model: AboutFormModel): About | undefined => {
  const image = fromImageForm(model.image);
  return (
    image && {
      headline: model.headline,
      description: model.description,
      facts: { de: toLines(model.facts.de), en: toLines(model.facts.en) },
      image,
    }
  );
};

/** "About me": heading, introduction, facts and the portrait. */
@Component({
  selector: 'app-about-form',
  imports: [FormRoot, TranslatePipe, ImageField, LocalizedField, SectionFormFooter],
  styleUrl: './about-form.scss',
  templateUrl: './about-form.html',
})
export class AboutForm {
  private readonly _store = inject(PortfolioEditorStore);
  private readonly _i18n = inject(I18nService);
  private readonly _save = injectSectionSave('about');

  private readonly _section = computed(() => this._store.portfolio()?.about);
  /** Starts from the stored section and follows it after a save. */
  private readonly _model = linkedSignal(() => toModel(this._section()));

  /** Submitted by `FormRoot`, which only runs the action once the form is valid. */
  private readonly _aboutForm = form(
    this._model,
    (path) => {
      localizedRules(path.headline, this._i18n, { max: PORTFOLIO_LIMITS.headline });
      localizedRules(path.description, this._i18n, { max: PORTFOLIO_LIMITS.description });
      localizedLinesRules(path.facts, this._i18n, {
        max: PORTFOLIO_LIMITS.facts,
        maxLength: PORTFOLIO_LIMITS.fact,
      });
      imageRules(path.image, this._i18n);
    },
    {
      submission: {
        action: async () => {
          const about = fromModel(this._model());
          if (about) {
            await this._save(about);
          }
        },
      },
    },
  );
}
