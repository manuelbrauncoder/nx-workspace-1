import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '**',
    renderMode: RenderMode.Server,
    // A page rendered for the signed-in admin contains draft projects, so no shared cache may keep
    // it, and the browser asks again after signing in or out.
    headers: { 'Cache-Control': 'private, no-cache', Vary: 'Cookie' },
  },
];
