import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { SITE_OWNER } from '../../../../site-owner';
import { Imprint } from './imprint';
import { legalImprintI18n } from './imprint.i18n';

describe('Imprint', () => {
  it('names the site owner and links the mail address', async () => {
    await loadI18nScopes(legalImprintI18n);
    const fixture = TestBed.createComponent(Imprint);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toBe('Impressum');
    expect(element.querySelector('address')?.textContent).toContain(SITE_OWNER.name);
    expect(element.querySelector('address a')?.getAttribute('href')).toBe(
      `mailto:${SITE_OWNER.email}`,
    );
  });
});
