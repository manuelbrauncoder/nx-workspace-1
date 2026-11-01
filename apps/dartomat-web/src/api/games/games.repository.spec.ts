import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AppConfigService } from '@core/config/app-config';
import { firstValueFrom } from 'rxjs';
import { GameDto } from './game.dto';
import { GamesRepository } from './games.repository';

const DTO: GameDto = {
  id: 'g/1',
  startScore: 301,
  doubleOut: true,
  status: 'active',
  players: [
    { id: 'p1', name: 'Ada', score: 81 },
    { id: 'p2', name: 'Linus', score: 207 },
  ],
  currentPlayerIdx: 0,
  currentTurnDarts: [{ multiplier: 3, value: 20, points: 60 }],
  winnerIdx: null,
  checkout: {
    status: 'ok',
    route: [
      { multiplier: 3, value: 19 },
      { multiplier: 2, value: 12 },
    ],
  },
  canUndo: true,
  createdAt: '2026-11-01T09:00:00.000Z',
  finishedAt: null,
};

describe('GamesRepository', () => {
  let repository: GamesRepository;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AppConfigService, useValue: { apiBaseUrl: 'https://api.example.com' } },
      ],
    });
    repository = TestBed.inject(GamesRepository);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  it('creates a game with trimmed names and maps it', async () => {
    const game = firstValueFrom(repository.create({ names: [' Ada ', 'Linus'], doubleOut: true }));
    const request = backend.expectOne('https://api.example.com/games');
    request.flush({ game: DTO });

    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ names: ['Ada', 'Linus'], doubleOut: true });
    expect((await game).createdAt).toEqual(new Date(DTO.createdAt));
  });

  it('loads a game and encodes its id', async () => {
    const game = firstValueFrom(repository.getById('g/1'));
    backend.expectOne('https://api.example.com/games/g%2F1').flush({ game: DTO });

    expect((await game).checkout.route).toHaveLength(2);
  });

  it('throws a dart and takes it back', async () => {
    const thrown = firstValueFrom(repository.throwDart('g/1', { multiplier: 2, value: 25 }));
    const dart = backend.expectOne('https://api.example.com/games/g%2F1/darts');
    expect(dart.request.body).toEqual({ multiplier: 2, value: 25 });
    dart.flush({ game: DTO });
    await thrown;

    const undone = firstValueFrom(repository.undo('g/1'));
    const undo = backend.expectOne('https://api.example.com/games/g%2F1/undo');
    expect(undo.request.method).toBe('POST');
    undo.flush({ game: DTO });
    await undone;
  });

  it('restarts and switches double-out with PATCH', async () => {
    const restarted = firstValueFrom(repository.restart('g/1'));
    const restart = backend.expectOne('https://api.example.com/games/g%2F1');
    expect(restart.request.method).toBe('PATCH');
    expect(restart.request.body).toEqual({ restart: true });
    restart.flush({ game: DTO });
    await restarted;

    const switched = firstValueFrom(repository.setDoubleOut('g/1', false));
    const patch = backend.expectOne('https://api.example.com/games/g%2F1');
    expect(patch.request.body).toEqual({ doubleOut: false });
    patch.flush({ game: { ...DTO, doubleOut: false } });
    expect((await switched).doubleOut).toBe(false);
  });
});
