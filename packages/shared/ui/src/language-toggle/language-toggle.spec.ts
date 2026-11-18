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

  it('is larger with size="lg", e.g. for a touch screen', async () => {
    const fixture = TestBed.createComponent(LanguageToggle);
    fixture.componentRef.setInput('size', 'lg');
    await fixture.whenStable();
    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;

    expect(button.className).toContain('size-12');
    // the icon gets the fixed size `lg` instead of following the text
    expect(button.innerHTML).toContain('1.5rem');
  });
});
