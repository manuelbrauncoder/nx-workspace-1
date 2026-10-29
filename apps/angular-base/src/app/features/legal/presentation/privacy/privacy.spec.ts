import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { SITE_OWNER } from '../../../../site-owner';
import { Privacy } from './privacy';
import { legalPrivacyI18n } from './privacy.i18n';

describe('Privacy', () => {
  it('names the controller and renders every section', async () => {
    await loadI18nScopes(legalPrivacyI18n);
    const fixture = TestBed.createComponent(Privacy);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;

    expect(element.querySelector('h1')?.textContent).toBe('Datenschutzerklärung');
    expect(element.querySelector('address')?.textContent).toContain(SITE_OWNER.name);
    expect(Array.from(element.querySelectorAll('h2'), (h2) => h2.textContent)).toEqual([
      'Verantwortlicher',
      'Hosting und Server-Logs',
      'Cookies und lokaler Speicher',
      'Schriften und externe Inhalte',
      'Analyse und Tracking',
      'Kontakt per E-Mail',
      'Deine Rechte',
    ]);
  });
});
