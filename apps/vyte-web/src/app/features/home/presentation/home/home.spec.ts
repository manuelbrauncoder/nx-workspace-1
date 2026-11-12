import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Home } from './home';
import { homeI18n } from './home.i18n';

describe('Home', () => {
  const render = async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    await loadI18nScopes(homeI18n);
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('leads a visitor to the sign-in', async () => {
    const element = await render();

    expect(element.querySelector('h1')?.textContent).toContain('Einladungen, die ankommen');
    expect(element.querySelector('a[href="/sign-in"]')?.textContent?.trim()).toBe('Anmelden');
  });

  it('has no accessibility violations', async () => {
    const element = await render();

    await expect(element).toBeAccessible();
  });
});
