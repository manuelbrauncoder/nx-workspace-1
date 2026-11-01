import request from 'supertest';
import { createApp } from '../app.js';

export const app = createApp();

export interface ThrownDart {
  multiplier: 1 | 2 | 3;
  value: number;
}

/** Starts a game with the given players and returns its id. */
export async function startedGame(names: string[] = ['Ada', 'Linus'], doubleOut = true) {
  const res = await request(app).post('/api/v1/games').send({ names, doubleOut }).expect(201);
  return res.body.game.id as string;
}

/** Throws the darts one after another and returns the game after the last one. */
export async function throwDarts(id: string, darts: ThrownDart[]) {
  let game: unknown;
  for (const dart of darts) {
    const res = await request(app).post(`/api/v1/games/${id}/darts`).send(dart).expect(201);
    game = res.body.game;
  }
  return game as Record<string, unknown>;
}
