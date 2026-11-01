import { gameSchema } from '@dartomat/contracts/games';
import type { Router } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../../test/helpers.js';
import { gamesRouter } from '../games/games.routes.js';
import { buildDocs } from './docs.document.js';

/** "POST /games/{id}/darts" for every route registered on the router. */
function routesOf(prefix: string, router: Router): string[] {
  return router.stack.flatMap((layer) => {
    const route = layer.route as { path: string; methods: Record<string, boolean> } | undefined;
    if (!route) return [];
    const path = (prefix + route.path).replace(/\/$/, '').replace(/:(\w+)/g, '{$1}');
    return Object.keys(route.methods).map((method) => `${method.toUpperCase()} ${path}`);
  });
}

describe('docs', () => {
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

    expect(documented.sort()).toEqual(routesOf('/api/v1/games', gamesRouter).sort());
  });

  it('documents the game the API really returns', async () => {
    const created = await request(app)
      .post('/api/v1/games')
      .send({ names: ['Ada', 'Linus'] })
      .expect(201);
    expect(gameSchema.strict().safeParse(created.body.game).error).toBeUndefined();

    const { id } = created.body.game;
    const thrown = await request(app)
      .post(`/api/v1/games/${id}/darts`)
      .send({ multiplier: 3, value: 20 })
      .expect(201);
    expect(gameSchema.strict().safeParse(thrown.body.game).error).toBeUndefined();
    expect(thrown.body.game.currentTurnDarts).toHaveLength(1);
  });
});
