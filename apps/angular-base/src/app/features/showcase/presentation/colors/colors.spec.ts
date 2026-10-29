import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { COLOR_GROUPS } from './color-tokens';
import { Colors } from './colors';
import { showcaseColorsI18n } from './colors.i18n';

describe('Colors', () => {
  it('renders a swatch for every token', async () => {
    await loadI18nScopes(showcaseColorsI18n);
    const fixture = TestBed.createComponent(Colors);
    await fixture.whenStable();

    const swatches = (fixture.nativeElement as HTMLElement).querySelectorAll('app-color-swatch');

    expect(swatches.length).toBe(COLOR_GROUPS.flatMap((group) => group.tokens).length);
  });
});
