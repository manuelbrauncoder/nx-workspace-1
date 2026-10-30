import { TranslationKey } from '@core/i18n/translation-key';

export interface ColorToken {
  /** Custom property name without the leading dashes, e.g. `primary`. */
  name: string;
  /** Matching text color token, if the theme defines one. */
  foreground?: string;
}

export interface ColorGroup {
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  tokens: ColorToken[];
}

const pair = (name: string): ColorToken => ({ name, foreground: `${name}-foreground` });

/** Mirrors the tokens in styles/themes/_light.scss and _dark.scss. */
export const COLOR_GROUPS: ColorGroup[] = [
  {
    titleKey: 'showcaseColors.groups.surfaces.title',
    descriptionKey: 'showcaseColors.groups.surfaces.description',
    tokens: [{ name: 'background', foreground: 'foreground' }, pair('card'), pair('popover')],
  },
  {
    titleKey: 'showcaseColors.groups.actions.title',
    descriptionKey: 'showcaseColors.groups.actions.description',
    tokens: [
      pair('primary'),
      pair('secondary'),
      pair('muted'),
      pair('accent'),
      { name: 'destructive' },
    ],
  },
  {
    titleKey: 'showcaseColors.groups.borders.title',
    descriptionKey: 'showcaseColors.groups.borders.description',
    tokens: [{ name: 'border' }, { name: 'input' }, { name: 'ring' }],
  },
  {
    titleKey: 'showcaseColors.groups.charts.title',
    descriptionKey: 'showcaseColors.groups.charts.description',
    tokens: [
      { name: 'chart-1' },
      { name: 'chart-2' },
      { name: 'chart-3' },
      { name: 'chart-4' },
      { name: 'chart-5' },
    ],
  },
  {
    titleKey: 'showcaseColors.groups.sidebar.title',
    descriptionKey: 'showcaseColors.groups.sidebar.description',
    tokens: [
      pair('sidebar'),
      pair('sidebar-primary'),
      pair('sidebar-accent'),
      { name: 'sidebar-border' },
      { name: 'sidebar-ring' },
    ],
  },
];
