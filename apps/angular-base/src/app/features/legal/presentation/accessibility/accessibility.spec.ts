import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { SITE_OWNER } from '../../../../site-owner';
import { Accessibility } from './accessibility';
import { legalAccessibilityI18n } from './accessibility.i18n';

describe('Accessibility', () => {
  it('offers a mail address to report a barrier', async () => {
    await loadI18nScopes(legalAccessibilityI18n);
    const fixture = TestBed.createComponent(Accessibility);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toBe('Erklärung zur Barrierefreiheit');
    expect(element.querySelector('a')?.getAttribute('href')).toBe(`mailto:${SITE_OWNER.email}`);
  });
});
