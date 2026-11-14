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

  describe('events', () => {
    const shellChildren = routes.find((route) => route.component === AppShell)!.children!;
    const paths = shellChildren.map((route) => route.path);
    const frame = shellChildren.find((route) => route.path === 'events/:id')!;

    it('puts the events routes before the frame of one event', () => {
      expect(paths.indexOf('events')).toBeGreaterThan(-1);
      expect(paths.indexOf('events')).toBeLessThan(paths.indexOf('events/:id'));
    });

    it('guards both and keeps events out of search results', () => {
      expect(shellChildren.find((route) => route.path === 'events')!.canActivate).toHaveLength(1);
      expect(frame.canActivate).toHaveLength(1);
      expect(frame.data?.['seo']).toMatchObject({ index: false });
    });

    it('loads the frame lazily and hangs the tabs below it', () => {
      expect(frame.loadComponent).toBeTypeOf('function');
      expect(frame.children!.map((route) => route.path)).toEqual(['', 'guests', 'team', 'photos']);
      for (const child of frame.children!) {
        expect(child.loadChildren).toBeTypeOf('function');
      }
      expect(frame.children![0]!.pathMatch).toBe('full');
    });

    it('keeps the print sheets outside every shell', () => {
      expect(routes[0]!.path).toBe('events/:id/print');
    });

    it('resolves the overview routes of the frame without an :id of their own', async () => {
      const { eventOverviewRoutes, eventsRoutes } = await import('./features/events/events.routes');

      expect(eventOverviewRoutes.map((route) => route.path)).toEqual(['']);
      const listChildren = eventsRoutes[0]!.children!.map((route) => route.path);
      expect(listChildren).toEqual(['', 'new', ':id/edit']);
    });
  });
});
