import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { shellLayout } from '@core/layout/shell-layout';
import { homeRoutes } from '../../home.routes';
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

  it('shows the three steps as an ordered list with a heading each', async () => {
    const element = await render();

    const items = element.querySelectorAll('ol > li');
    expect(items).toHaveLength(3);
    expect(Array.from(items).map((item) => item.querySelector('h3')?.textContent?.trim())).toEqual([
      'Save the Date',
      'Einladung mit Antwort',
      'Fotos vom Abend',
    ]);
    expect(element.querySelector('h2')?.textContent).toContain(
      'Von der Ankündigung bis zu den Fotos',
    );
  });

  it('hides the phone mock-up from assistive technology and the tab order', async () => {
    const element = await render();

    const visual = element.querySelector('.home-hero__visual')!;
    expect(visual.getAttribute('aria-hidden')).toBe('true');
    expect(visual.hasAttribute('inert')).toBe(true);
    expect(
      visual.querySelectorAll('a[href], button, input, select, textarea, [tabindex]'),
    ).toHaveLength(0);
  });

  it('has the sign-in as its only link', async () => {
    const element = await render();

    const links = Array.from(element.querySelectorAll('a'));
    expect(links).toHaveLength(1);
    expect(links[0].getAttribute('href')).toBe('/sign-in');
  });

  it('runs the hero across the full width of the shell', () => {
    expect(homeRoutes[0].data).toEqual(expect.objectContaining(shellLayout('full-bleed')));
  });

  it('has no accessibility violations', async () => {
    const element = await render();

    await expect(element).toBeAccessible();
  });
});
