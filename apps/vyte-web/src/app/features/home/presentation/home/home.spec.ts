import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AuthStore } from '@features/auth/public-api';
import { Home } from './home';
import { homeI18n } from './home.i18n';

describe('Home', () => {
  const render = async (signedIn: boolean) => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { isSignedIn: signal(signedIn) } },
      ],
    });
    await loadI18nScopes(homeI18n);
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  it('leads a visitor to the sign-in', async () => {
    const element = await render(false);

    expect(element.querySelector('h1')?.textContent).toContain('Einladungen, die ankommen');
    expect(element.querySelector('a[href="/sign-in"]')?.textContent?.trim()).toBe('Anmelden');
  });

  it('shows no sign-in link to a signed-in user', async () => {
    const element = await render(true);

    expect(element.querySelector('a[href="/sign-in"]')).toBeNull();
    expect(element.textContent).toContain('Du bist angemeldet');
  });
});
