import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AppConfigService } from '@core/config/app-config';
import { map, Observable } from 'rxjs';
import { DartThrow, Game, NewGame } from './game';
import { GameDtoMapper } from './game-dto.mapper';
import { GameResponseDto, PatchGameDto } from './game.dto';

/** Talks to the games endpoints and hands out models, never DTOs. */
@Service()
export class GamesRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(GameDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/games`;
  }

  create(newGame: NewGame): Observable<Game> {
    return this._http
      .post<GameResponseDto>(this._url, this._mapper.toCreateDto(newGame))
      .pipe(map((response) => this._mapper.toModel(response.game)));
  }

  getById(id: string): Observable<Game> {
    return this._http
      .get<GameResponseDto>(this._urlFor(id))
      .pipe(map((response) => this._mapper.toModel(response.game)));
  }

  /** Throws a dart for the current player. */
  throwDart(id: string, dart: DartThrow): Observable<Game> {
    return this._http
      .post<GameResponseDto>(`${this._urlFor(id)}/darts`, this._mapper.toThrowDto(dart))
      .pipe(map((response) => this._mapper.toModel(response.game)));
  }

  /** Takes back the last dart, also the winning one. */
  undo(id: string): Observable<Game> {
    return this._http
      .post<GameResponseDto>(`${this._urlFor(id)}/undo`, {})
      .pipe(map((response) => this._mapper.toModel(response.game)));
  }

  /** Every score back to the start, same players in the same order. Works on a finished game. */
  restart(id: string): Observable<Game> {
    return this._patch(id, { restart: true });
  }

  setDoubleOut(id: string, doubleOut: boolean): Observable<Game> {
    return this._patch(id, { doubleOut });
  }

  private _patch(id: string, body: PatchGameDto): Observable<Game> {
    return this._http
      .patch<GameResponseDto>(this._urlFor(id), body)
      .pipe(map((response) => this._mapper.toModel(response.game)));
  }

  private _urlFor(id: string): string {
    return `${this._url}/${encodeURIComponent(id)}`;
  }
}
