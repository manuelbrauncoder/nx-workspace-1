import { Route } from '@angular/router';
import { routes } from './app.routes';
import { AppShell } from './layout/app-shell/app-shell';
import { GuestShell } from './layout/guest-shell/guest-shell';

describe('routes', () => {
  const guestRoutes = routes.filter((route) => route.component === GuestShell);

  it('puts every guest page in its own GuestShell route with a path of its own', () => {
    // A GuestShell under `''` would also take `/` and hide the start page.
    expect(guestRoutes.map((route) => route.path)).toEqual([
      'rsvp/:token',
      'photos/:token',
      'stand/:token',
      'save-the-date/:token',
    ]);
  });

  it('hangs each guest feature below its shell as an empty child', () => {
    for (const route of guestRoutes) {
      expect(route.children).toHaveLength(1);
      expect(route.children![0]).toMatchObject({ path: '' } satisfies Partial<Route>);
      expect(route.children![0]!.loadChildren).toBeTypeOf('function');
    }
  });

  it('tells the two upload pages apart through their data', () => {
    const kind = (path: string) => guestRoutes.find((route) => route.path === path)?.data?.['kind'];

    expect(kind('photos/:token')).toBe('guest');
    expect(kind('stand/:token')).toBe('stand');
  });

  it('leaves the empty path to the app shell, which holds the start page', () => {
    const emptyPath = routes.filter((route) => route.path === '');

    expect(emptyPath).toHaveLength(1);
    expect(emptyPath[0]!.component).toBe(AppShell);
    expect(emptyPath[0]!.children?.[0]).toMatchObject({ path: '', pathMatch: 'full' });
  });
});
