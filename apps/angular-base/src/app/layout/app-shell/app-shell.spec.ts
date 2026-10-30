import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { AuthStore } from '@features/auth/public-api';
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
      menuButton: element.querySelector<HTMLButtonElement>('button[aria-label="Menü öffnen"]')!,
    };
  }

  it('renders header, routed page and footer', async () => {
    const { element, main } = await render();

    expect(element.querySelector('header a[href="/"] img')?.getAttribute('alt')).toBe(
      'angular-base',
    );
    expect(main.querySelector('h1')?.textContent).toBe('Seite');
    expect(element.querySelector('footer')?.textContent).toContain('angular-base');
  });

  it('links to the legal pages in the footer', async () => {
    const { element } = await render();

    const links = Array.from(element.querySelectorAll('footer nav a'));

    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/imprint',
      '/privacy',
      '/accessibility',
    ]);
  });

  it('marks the link of the current page', async () => {
    const { element } = await render();

    const current = element.querySelector('header nav a[aria-current="page"]');

    expect(current?.textContent?.trim()).toBe('Notizen');
  });

  it('opens the drawer with the navigation from the menu button', async () => {
    const { harness, menuButton } = await render();

    menuButton.click();
    await harness.fixture.whenStable();

    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(menuButton.getAttribute('aria-expanded')).toBe('true');
    expect(dialog.querySelector('a[href="/"] img')?.getAttribute('alt')).toBe('angular-base');
    expect(dialog.querySelector('nav a')?.textContent?.trim()).toBe('Notizen');
    expect(dialog.querySelector('nav button')?.textContent?.trim()).toBe('Showcase');
  });

  it('expands a group of the navigation in the drawer', async () => {
    const { harness, menuButton } = await render();
    menuButton.click();
    await harness.fixture.whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;

    dialog.querySelector<HTMLButtonElement>('nav button')!.click();
    await harness.fixture.whenStable();

    expect(Array.from(dialog.querySelectorAll('nav a'), (a) => a.getAttribute('href'))).toEqual([
      '/notes',
      '/showcase',
      '/showcase/typography',
      '/showcase/colors',
      '/showcase/forms',
      '/showcase/components',
    ]);
  });

  it('closes the drawer and focuses the main area after a navigation', async () => {
    const { harness, main, menuButton } = await render();
    menuButton.click();
    await harness.fixture.whenStable();

    await harness.navigateByUrl('/showcase');
    await harness.fixture.whenStable();

    expect(menuButton.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(main);
  });

  it('moves focus to the main area from the skip link', async () => {
    const { element, main } = await render();

    element.querySelector<HTMLAnchorElement>('.skip-link')!.click();

    expect(document.activeElement).toBe(main);
  });
});
