import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthStore } from '@features/auth/public-api';
import { injectAppNavItems } from './app-nav-items';

describe('injectAppNavItems', () => {
  function items(role: 'user' | 'admin' | undefined) {
    const me = signal(role ? { role } : undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AuthStore,
          useValue: {
            isSignedIn: () => me() !== undefined,
            isAdmin: () => me()?.role === 'admin',
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => injectAppNavItems())();
  }

  it('is empty while nobody is signed in', () => {
    expect(items(undefined)).toEqual([]);
  });

  it('offers only the events to a user', () => {
    expect(items('user').map((item) => (item as { path: string }).path)).toEqual(['/events']);
  });

  it('adds the accounts for an admin', () => {
    const result = items('admin');

    expect(result.map((item) => (item as { path: string }).path)).toEqual(['/events', '/admin']);
    expect(result.map((item) => item.labelKey)).toEqual([
      'layout.nav.events',
      'layout.nav.accounts',
    ]);
  });
});
