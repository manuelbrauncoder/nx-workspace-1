import { Component } from '@angular/core';
import { TranslatePipe } from '@core/i18n/translate.pipe';
import { TranslationKey } from '@core/i18n/translation-key';
import { UiText } from '@shared/ui/text/text';
import { ShowcaseSection } from '../showcase-section/showcase-section';

interface FontFamily {
  name: string;
  roleKey: TranslationKey;
  /** Tailwind utility and the CSS variable behind it. */
  utility: string;
  token: string;
  weights: number[];
}

interface FontSize {
  utility: string;
  rem: string;
}

@Component({
  selector: 'app-showcase-typography',
  imports: [TranslatePipe, UiText, ShowcaseSection],
  styleUrl: './typography.scss',
  templateUrl: './typography.html',
})
export class Typography {
  private readonly _families: FontFamily[] = [
    {
      name: 'Figtree',
      roleKey: 'showcaseTypography.families.body',
      utility: 'font-sans',
      token: '--font-sans',
      weights: [300, 400, 500, 600, 700, 800, 900],
    },
    {
      name: 'Space Grotesk',
      roleKey: 'showcaseTypography.families.headings',
      utility: 'font-heading',
      token: '--font-heading',
      weights: [300, 400, 500, 600, 700],
    },
    {
      name: 'JetBrains Mono',
      roleKey: 'showcaseTypography.families.code',
      utility: 'font-mono',
      token: '--font-mono',
      weights: [100, 200, 300, 400, 500, 600, 700, 800],
    },
  ];

  // Full class names, so Tailwind picks them up when scanning this file.
  private readonly _sizes: FontSize[] = [
    { utility: 'text-xs', rem: '0.75rem' },
    { utility: 'text-sm', rem: '0.875rem' },
    { utility: 'text-base', rem: '1rem' },
    { utility: 'text-lg', rem: '1.125rem' },
    { utility: 'text-xl', rem: '1.25rem' },
    { utility: 'text-2xl', rem: '1.5rem' },
    { utility: 'text-3xl', rem: '1.875rem' },
    { utility: 'text-4xl', rem: '2.25rem' },
    { utility: 'text-5xl', rem: '3rem' },
  ];
}
