import { maxLength, PathKind, required, SchemaPathTree, validate } from '@angular/forms/signals';
import { I18nService } from '@core/i18n/i18n.service';
import { Localized, localizedOf } from '@core/i18n/localized';
import { Media, PORTFOLIO_LIMITS, PortfolioImage } from '../../domain/portfolio';

/** The uploaded file an image points to. */
export type ImageMedia = Pick<Media, 'id' | 'url' | 'width' | 'height'>;

/** Form model of an image: the chosen file, `null` before one is chosen, and its alt text. */
export interface ImageForm {
  media: ImageMedia | null;
  alt: Localized<string>;
}

export const toImageForm = (image: PortfolioImage | undefined): ImageForm => ({
  media: image ? { id: image.id, url: image.url, width: image.width, height: image.height } : null,
  alt: image ? { ...image.alt } : localizedOf(''),
});

/** `undefined` while no file is chosen. */
export const fromImageForm = (form: ImageForm): PortfolioImage | undefined =>
  form.media ? { ...form.media, alt: { ...form.alt } } : undefined;

/** An image needs an alt text in both languages as soon as a file is chosen. */
export function imageRules<K extends PathKind = PathKind.Root>(
  path: SchemaPathTree<ImageForm, K>,
  i18n: I18nService,
  { optional = false }: { optional?: boolean } = {},
): void {
  if (!optional) {
    validate(path.media, ({ value }) =>
      value()
        ? undefined
        : { kind: 'required', message: i18n.translate('sectionEditor.validation.imageRequired') },
    );
  }
  for (const alt of [path.alt.de, path.alt.en]) {
    required(alt, {
      message: () => i18n.translate('sectionEditor.validation.altRequired'),
      when: ({ valueOf }) => valueOf(path.media) !== null,
    });
    maxLength(alt, PORTFOLIO_LIMITS.alt, {
      message: () =>
        i18n.translate('sectionEditor.validation.tooLong', { max: PORTFOLIO_LIMITS.alt }),
    });
  }
}
