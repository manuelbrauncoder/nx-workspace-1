import { TranslationKey } from '@core/i18n/translation-key';
import { UiIconName } from '@shared/ui/icon/ui-icons';

export interface ShowcasePage {
  /** Route path relative to /showcase. */
  path: string;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  icon: UiIconName;
}

/** Single source for the hub cards and the showcase navigation. The texts live in the scope of the shell. */
export const SHOWCASE_PAGES: ShowcasePage[] = [
  {
    path: 'typography',
    titleKey: 'showcaseShell.pages.typography.title',
    descriptionKey: 'showcaseShell.pages.typography.description',
    icon: 'type',
  },
  {
    path: 'colors',
    titleKey: 'showcaseShell.pages.colors.title',
    descriptionKey: 'showcaseShell.pages.colors.description',
    icon: 'palette',
  },
  {
    path: 'forms',
    titleKey: 'showcaseShell.pages.forms.title',
    descriptionKey: 'showcaseShell.pages.forms.description',
    icon: 'textCursorInput',
  },
  {
    path: 'components',
    titleKey: 'showcaseShell.pages.components.title',
    descriptionKey: 'showcaseShell.pages.components.description',
    icon: 'component',
  },
];
