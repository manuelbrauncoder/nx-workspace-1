import { TestBed } from '@angular/core/testing';
import { I18nService } from '@core/i18n/i18n.service';
import { LanguageToggle } from './language-toggle';

describe('LanguageToggle', () => {
  it('follows the language without being rendered again from outside', async () => {
    const fixture = TestBed.createComponent(LanguageToggle);
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.getAttribute('aria-label')).toBe('Sprache wählen');

    await TestBed.inject(I18nService).setLanguage('en');
    await fixture.whenStable();

    expect(button.getAttribute('aria-label')).toBe('Choose language');
  });
});
