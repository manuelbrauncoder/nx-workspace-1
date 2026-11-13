import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthStore } from '@features/auth/public-api';
import { AppDrawer } from './app-drawer';

@Component({ imports: [AppDrawer], template: `<app-drawer [open]="true" />` })
class Host {}

describe('AppDrawer', () => {
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
    await fixture.whenStable();
    // The drawer renders into an overlay, so look at the whole document.
    return document.body;
  }

  const links = (root: HTMLElement) =>
    Array.from(root.querySelectorAll('nav a')).map((link) => link.getAttribute('href'));

  it('lists no entries to a visitor', async () => {
    const root = await render(undefined);

    expect(links(root)).not.toContain('/events');
    expect(links(root)).not.toContain('/admin');
  });

  it('lists the events to a user, not the accounts', async () => {
    const root = await render('user');

    expect(links(root)).toContain('/events');
    expect(links(root)).not.toContain('/admin');
  });

  it('lists the accounts to an admin', async () => {
    const root = await render('admin');

    expect(links(root)).toEqual(expect.arrayContaining(['/events', '/admin']));
    expect(root.textContent).toContain('Konten');
  });

  it('has no accessibility violations while open for an admin', async () => {
    const root = await render('admin');

    await expect(root).toBeAccessible();
  });
});
