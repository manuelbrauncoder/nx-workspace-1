import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { shellLayout } from '@core/layout/shell-layout';
import { AuthStore } from '@features/auth/public-api';
import { AppShell } from './app-shell';

@Component({
  template: `<h1>Seite</h1>
    <h2 id="section" tabindex="-1">Abschnitt</h2>
    <h2 id="plain">Ohne Fokus</h2>`,
})
class Page {}

describe('AppShell', () => {
  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {
            path: '',
            component: AppShell,
            children: [
              { path: 'events', component: Page },
              { path: 'wide', component: Page, data: shellLayout('full-bleed') },
            ],
          },
        ]),
        // The header shows the account menu, which reads who is signed in.
        {
          provide: AuthStore,
          useValue: { me: signal(undefined), isSignedIn: () => false, isAdmin: () => false },
        },
      ],
    });
    const harness = await RouterTestingHarness.create('/events');
    const element: HTMLElement = harness.routeNativeElement!;
    return { harness, element, main: element.querySelector('main')! };
  }

  it('renders header, routed page and footer', async () => {
    const { element, main } = await render();

    const home = element.querySelector('header a[href="/"]');
    expect(home?.textContent?.trim()).toBe('');
    const logo = home?.querySelector('img');
    expect(logo?.getAttribute('alt')).toBe('Vyte');
    expect(logo?.getAttribute('src')).toBe('/logo-full.svg');
    expect(main.querySelector('h1')?.textContent).toBe('Seite');
    expect(element.querySelector('footer')?.textContent).toContain('Vyte');
  });

  it('links to the legal pages in the footer', async () => {
    const { element } = await render();

    const links = Array.from(element.querySelectorAll('footer nav a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/imprint',
      '/privacy',
      '/accessibility',
      '/cookies',
    ]);
  });

  it('offers the sign-in in the header to a visitor', async () => {
    const { element } = await render();

    expect(element.querySelector('header a[href="/sign-in"]')?.textContent?.trim()).toBe(
      'Anmelden',
    );
  });

  it('shows neither a navigation nor the menu button while there are no entries', async () => {
    const { element } = await render();

    expect(element.querySelector('header nav')).toBeNull();
    expect(element.querySelector('button[aria-label="Menü öffnen"]')).toBeNull();
  });

  it('puts a page into the page container unless it asks for the full width', async () => {
    const { harness, main } = await render();
    expect(main.classList.contains('page-container')).toBe(true);

    await harness.navigateByUrl('/wide');

    expect(main.classList.contains('page-container')).toBe(false);
  });

  it('focuses the main area after a navigation', async () => {
    const { harness, main } = await render();

    await harness.navigateByUrl('/wide');
    await harness.fixture.whenStable();

    expect(document.activeElement).toBe(main);
  });

  it('keeps the focus when only the query changes', async () => {
    const { harness, element } = await render();
    const button = document.createElement('button');
    element.appendChild(button);
    button.focus();

    await harness.navigateByUrl('/events?filter=accepted');
    await harness.fixture.whenStable();

    expect(document.activeElement).toBe(button);
  });

  it('focuses the section of a fragment when only the query changes', async () => {
    const { harness, element } = await render();
    const button = document.createElement('button');
    element.appendChild(button);
    button.focus();

    await harness.navigateByUrl('/events?page=2#section');
    await harness.fixture.whenStable();

    expect(document.activeElement).toBe(element.querySelector('#section'));
  });

  it('focuses the main area for a fragment without tabindex when only the query changes', async () => {
    const { harness, main } = await render();

    await harness.navigateByUrl('/events?page=2#plain');
    await harness.fixture.whenStable();

    expect(document.activeElement).toBe(main);
  });

  it('focuses the main area when the query change removed the focused element', async () => {
    const { harness, element, main } = await render();
    const button = document.createElement('button');
    element.appendChild(button);
    button.focus();
    button.remove();

    await harness.navigateByUrl('/events?page=2');
    await harness.fixture.whenStable();

    expect(document.activeElement).toBe(main);
  });

  it('moves focus to the main area from the skip link', async () => {
    const { element, main } = await render();

    element.querySelector<HTMLAnchorElement>('.skip-link')!.click();

    expect(document.activeElement).toBe(main);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });
});
