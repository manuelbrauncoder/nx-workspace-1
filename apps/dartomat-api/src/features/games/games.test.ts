import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app, startedGame, throwDarts, type ThrownDart } from '../../test/helpers.js';

const miss: ThrownDart = { multiplier: 1, value: 0 };
const t20: ThrownDart = { multiplier: 3, value: 20 };

/** Ada checks out 301 in her third turn; Linus misses everything. */
const adaWins: ThrownDart[] = [
  t20,
  t20,
  t20,
  miss,
  miss,
  miss,
  t20,
  { multiplier: 3, value: 19 },
  { multiplier: 2, value: 2 },
];

describe('games', () => {
  it('starts a game in the order given', async () => {
    const res = await request(app)
      .post('/api/v1/games')
      .send({ names: [' Ada ', 'Linus', 'Grace'] })
      .expect(201);

    expect(res.body.game).toMatchObject({
      startScore: 301,
      doubleOut: true,
      status: 'active',
      currentPlayerIdx: 0,
      currentTurnDarts: [],
      winnerIdx: null,
      canUndo: false,
      checkout: { status: 'hidden', route: null },
      finishedAt: null,
    });
    expect(
      res.body.game.players.map((p: { name: string; score: number }) => [p.name, p.score]),
    ).toEqual([
      ['Ada', 301],
      ['Linus', 301],
      ['Grace', 301],
    ]);

    const loaded = await request(app).get(`/api/v1/games/${res.body.game.id}`).expect(200);
    expect(loaded.body.game).toEqual(res.body.game);
  });

  it('validates a new game', async () => {
    const post = (body: object) => request(app).post('/api/v1/games').send(body);
    await post({ names: [] }).expect(400);
    await post({ names: ['  '] }).expect(400);
    await post({ names: ['Ada', 'ada'] }).expect(400);
    await post({ names: ['x'.repeat(25)] }).expect(400);
  });

  it('answers 400 for an invalid id and 404 for an unknown game', async () => {
    await request(app).get('/api/v1/games/not-a-uuid').expect(400);
    await request(app).get('/api/v1/games/00000000-0000-4000-8000-000000000000').expect(404);
  });

  it('plays darts, passes on after three and rejects invalid darts', async () => {
    const id = await startedGame();
    const game = await throwDarts(id, [t20, t20, t20]);
    expect(game).toMatchObject({ currentPlayerIdx: 1, currentTurnDarts: [], canUndo: true });
    expect((game['players'] as { score: number }[])[0]!.score).toBe(121);

    const darts = `/api/v1/games/${id}/darts`;
    await request(app).post(darts).send({ multiplier: 3, value: 25 }).expect(400);
    await request(app).post(darts).send({ multiplier: 2, value: 0 }).expect(400);
    await request(app).post(darts).send({ multiplier: 1, value: 21 }).expect(400);
  });

  it('recommends a checkout for the current player', async () => {
    const id = await startedGame(['Ada', 'Linus'], true);
    const game = await throwDarts(id, [...adaWins.slice(0, 7)]);
    // Ada has 61 left with two darts
    expect(game['checkout']).toEqual({
      status: 'ok',
      route: [
        { multiplier: 3, value: 19 },
        { multiplier: 2, value: 2 },
      ],
    });
  });

  it('busts back to the start of the turn', async () => {
    const id = await startedGame();
    await throwDarts(id, [t20, t20, t20, miss, miss, miss, t20, t20]);
    // 121 - 60 - 60 = 1: a bust with double-out
    const game = await request(app).get(`/api/v1/games/${id}`).expect(200);
    expect(game.body.game.players[0].score).toBe(121);
    expect(game.body.game.currentPlayerIdx).toBe(1);
  });

  it('finishes the game on a double and rejects further darts', async () => {
    const id = await startedGame();
    const game = await throwDarts(id, adaWins);
    expect(game).toMatchObject({ status: 'finished', winnerIdx: 0, canUndo: true });
    expect(game['finishedAt']).toEqual(expect.any(String));
    expect(game['currentTurnDarts']).toHaveLength(3);
    expect(game['checkout']).toEqual({ status: 'hidden', route: null });

    await request(app).post(`/api/v1/games/${id}/darts`).send(miss).expect(409);
  });

  it('takes back the winning dart and reopens the game', async () => {
    const id = await startedGame();
    await throwDarts(id, adaWins);

    const res = await request(app).post(`/api/v1/games/${id}/undo`).expect(200);
    expect(res.body.game).toMatchObject({
      status: 'active',
      winnerIdx: null,
      finishedAt: null,
      currentPlayerIdx: 0,
    });
    expect(res.body.game.players[0].score).toBe(4);
    expect(res.body.game.currentTurnDarts).toHaveLength(2);
  });

  it('has nothing to undo in a new game', async () => {
    const id = await startedGame();
    await request(app).post(`/api/v1/games/${id}/undo`).expect(409);
  });

  it('restarts a finished game with the same players', async () => {
    const id = await startedGame(['Ada', 'Linus']);
    await throwDarts(id, adaWins);

    const res = await request(app).patch(`/api/v1/games/${id}`).send({ restart: true }).expect(200);
    expect(res.body.game).toMatchObject({
      status: 'active',
      winnerIdx: null,
      currentPlayerIdx: 0,
      currentTurnDarts: [],
      canUndo: false,
    });
    expect(
      res.body.game.players.map((p: { name: string; score: number }) => [p.name, p.score]),
    ).toEqual([
      ['Ada', 301],
      ['Linus', 301],
    ]);
  });

  it('switches double-out', async () => {
    const id = await startedGame();
    const res = await request(app)
      .patch(`/api/v1/games/${id}`)
      .send({ doubleOut: false })
      .expect(200);
    expect(res.body.game.doubleOut).toBe(false);
    await request(app).patch(`/api/v1/games/${id}`).send({}).expect(400);
  });
});
