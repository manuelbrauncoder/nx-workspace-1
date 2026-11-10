import { userSchema } from '@contracts/auth';
import { adminRouter } from '@server/auth/admin.routes';
import { authRouter } from '@server/auth/auth.routes';
import type { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import packageJson from '../../../package.json';
import { apiPrefix } from '../../shared/api.js';
import { adminAgent, app, signedUpAgent } from '../../test/helpers.js';
import { buildDocs } from './docs.document.js';

/** "POST /api/v1/auth/sign-in" for every route registered on the router. */
function routesOf(prefix: string, router: Router): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route as { path: string; methods: Record<string, boolean> } | undefined;
    if (!route) return [];
    const path = (prefix + route.path).replace(/\/$/, '').replace(/:(\w+)/g, '{$1}');
    return Object.keys(route.methods).map((method) => `${method.toUpperCase()} ${path}`);
  });
}

describe('docs', () => {
  it('reports the version of the app in /health', async () => {
    const health = await request(app).get('/health').expect(200);
    expect(health.body).toEqual({ status: 'ok', version: packageJson.version });
  });

  it('serves the spec and the docs page', async () => {
    const spec = await request(app).get('/docs/openapi.json').expect(200);
    expect(spec.body.openapi).toBe('3.1.0');

    const page = await request(app).get('/docs/').expect(200);
    expect(page.text).toContain('swagger-ui');
  });

  it('documents exactly the routes that exist', () => {
    const documented = Object.entries(buildDocs().paths ?? {})
      .flatMap(([path, operations]) =>
        Object.keys(operations).map((method) => `${method.toUpperCase()} ${path}`),
      )
      .filter((route) => route !== 'GET /health');

    const implemented = [
      ...routesOf(`${apiPrefix}/auth`, authRouter),
      ...routesOf(`${apiPrefix}/admin`, adminRouter),
    ];

    expect(documented.sort()).toEqual(implemented.sort());
  });

  it('documents the response shapes the API really returns', async () => {
    const agent = await signedUpAgent('ada@example.com');
    const me = await agent.get(`${apiPrefix}/auth/me`).expect(200);
    expect(userSchema.strict().safeParse(me.body.user).error).toBeUndefined();

    const admin = await adminAgent();
    const list = await admin.get(`${apiPrefix}/admin/users`).expect(200);
    expect(list.body.users).toHaveLength(2);
    for (const user of list.body.users) {
      expect(userSchema.strict().safeParse(user).error).toBeUndefined();
    }
  });
});
