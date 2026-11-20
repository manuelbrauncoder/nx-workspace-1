import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { shellLayout } from '@core/layout/shell-layout';
import { AuthStore } from '@features/auth/public-api';
import { withBackdrop } from '../app-backdrop/backdrop-route';
import { AppShell } from './app-shell';

@Component({ template: `<h1>Seite</h1>` })
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
              { path: 'notes', component: Page },
              { path: 'showcase', component: Page },
              {
                path: 'home',
                component: Page,
                data: { ...shellLayout('full-bleed'), ...withBackdrop() },
              },
            ],
          },
        ]),
        // The header shows the account menu, which reads who is signed in.
        { provide: AuthStore, useValue: { me: signal(undefined) } },
      ],
    });
    const harness = await RouterTestingHarness.create('/notes');
    const element: HTMLElement = harness.routeNativeElement!;
    return {
      harness,
      element,
      main: element.querySelector('main')!,
    };
  }

  it('renders header, routed page and footer', async () => {
    const { element, main } = await render();

    expect(element.querySelector('header a[href="/"]')?.getAttribute('aria-label')).toBe(
      'Manuel Braun, Frontend Developer, zur Startseite',
    );
    expect(main.querySelector('h1')?.textContent).toBe('Seite');
    expect(element.querySelector('footer')?.textContent).toContain('Manuel Braun');
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

  it('links to the sections of the start page in the header', async () => {
    const { element } = await render();

    const links = Array.from(element.querySelectorAll('header nav a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/#about',
      '/#projects',
      '/#skills',
      '/#contact',
    ]);
  });

  it('puts a page into the page container unless it asks for the full width', async () => {
    const { harness, main } = await render();
    expect(main.classList.contains('page-container')).toBe(true);

    await harness.navigateByUrl('/home');

    expect(main.classList.contains('page-container')).toBe(false);
  });

  it('shows the gradient backdrop only on the pages that ask for it', async () => {
    const { harness, element } = await render();
    expect(element.querySelector('app-backdrop')).toBeNull();

    await harness.navigateByUrl('/home');

    const backdrop = element.querySelector('app-backdrop');
    expect(backdrop).not.toBeNull();
    expect(backdrop?.getAttribute('aria-hidden')).toBe('true');
  });

  it('focuses the main area after a navigation', async () => {
    const { harness, main } = await render();

    await harness.navigateByUrl('/showcase');
    await harness.fixture.whenStable();

    expect(document.activeElement).toBe(main);
  });

  it('offers the settings menu instead of a drawer', async () => {
    const { element } = await render();

    expect(element.querySelector('header button[aria-label="Einstellungen"]')).not.toBeNull();
    expect(element.querySelector('[aria-label="Menü öffnen"]')).toBeNull();
  });

  it('moves focus to the main area from the skip link', async () => {
    const { element, main } = await render();

    element.querySelector<HTMLAnchorElement>('.skip-link')!.click();

    expect(document.activeElement).toBe(main);
  });
});
