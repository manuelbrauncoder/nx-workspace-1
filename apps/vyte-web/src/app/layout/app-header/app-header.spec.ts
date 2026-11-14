import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@features/auth/public-api';
import { AppHeader } from './app-header';

@Component({ imports: [AppHeader], template: `<app-header [(drawerOpen)]="open" />` })
class Host {
  readonly open = signal(false);
}

describe('AppHeader', () => {
  let host: Host;

  async function render(role: 'user' | 'admin' | undefined) {
    const me = signal(role ? { role, email: 'ada@example.com' } : undefined);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthStore,
          useValue: {
            me,
            isSignedIn: () => me() !== undefined,
            isAdmin: () => me()?.role === 'admin',
          },
        },
      ],
    });
    const fixture = TestBed.createComponent(Host);
    host = fixture.componentInstance;
    await fixture.whenStable();
    // The drawer renders into an overlay, so look at the whole document.
    return document.body;
  }

  const links = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('nav a')).map((link) => link.getAttribute('href'));

  it('shows neither navigation nor menu button to a visitor', async () => {
    const root = await render(undefined);

    expect(root.querySelector('header nav')).toBeNull();
    expect(root.querySelector('button[aria-label="Menü öffnen"]')).toBeNull();
  });

  it('shows the events and the menu button to a user', async () => {
    const root = await render('user');

    expect(links(root)).toContain('/events');
    expect(links(root)).not.toContain('/admin');
    expect(root.querySelector('button[aria-label="Menü öffnen"]')).not.toBeNull();
  });

  it('shows the accounts to an admin', async () => {
    const root = await render('admin');

    expect(links(root)).toEqual(expect.arrayContaining(['/events', '/admin']));
    expect(root.querySelector('header nav')?.textContent).toContain('Verwaltung');
  });

  it('opens the drawer from the menu button', async () => {
    const root = await render('user');

    root.querySelector<HTMLButtonElement>('button[aria-label="Menü öffnen"]')!.click();

    expect(host.open()).toBe(true);
  });

  it('has no accessibility violations with the navigation of an admin', async () => {
    await render('admin');

    await expect(document.querySelector('app-header')!).toBeAccessible();
  });
});
