import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import { SaveTheDate, UpcomingSaveTheDate } from '../domain/save-the-date';
import { SaveTheDateUseCase } from '../domain/save-the-date.usecase';
import { SaveTheDateStore } from './save-the-date.store';

const SAVE_THE_DATE: UpcomingSaveTheDate = {
  past: false,
  title: 'Sommerfest',
  allDay: false,
  startsAt: new Date('2027-03-13T18:00:00.000Z'),
  endsAt: null,
  timeZone: 'Europe/Berlin',
  locationName: 'Alte Mühle',
  note: null,
  cover: null,
};

class FakeSaveTheDateUseCase {
  failWith: Error | undefined;
  loaded: string[] = [];

  getByToken = (token: string): Observable<SaveTheDate> => {
    this.loaded.push(token);
    return this.failWith ? throwError(() => this.failWith) : of(SAVE_THE_DATE);
  };
  coverUrl = (token: string) => `cover/${token}`;
  calendarUrl = (token: string) => `calendar/${token}`;
}

describe('SaveTheDateStore', () => {
  let useCase: FakeSaveTheDateUseCase;
  let store: SaveTheDateStore;
  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  beforeEach(() => {
    useCase = new FakeSaveTheDateUseCase();
    TestBed.configureTestingModule({
      providers: [{ provide: SaveTheDateUseCase, useValue: useCase }, SaveTheDateStore],
    });
    store = TestBed.inject(SaveTheDateStore);
  });

  it('loads nothing and has no addresses before a token is selected', async () => {
    await settle();

    expect(useCase.loaded).toEqual([]);
    expect(store.saveTheDate()).toBeUndefined();
    expect(store.coverUrl()).toBeUndefined();
    expect(store.calendarUrl()).toBeUndefined();
  });

  it('loads the page of the token', async () => {
    store.select('tok');
    await settle();

    expect(useCase.loaded).toEqual(['tok']);
    expect(store.saveTheDate()).toEqual(SAVE_THE_DATE);
    expect(store.saveTheDateState().loadingState).toBe('success');
  });

  it('exposes a failed load as a state and no page', async () => {
    useCase.failWith = new Failure('not-found', 'Unknown token');
    store.select('bad');
    await settle();

    expect(store.saveTheDate()).toBeUndefined();
    expect(store.saveTheDateState().failure?.kind).toBe('not-found');
  });

  it('reloads the page', async () => {
    store.select('tok');
    await settle();

    store.reload();
    await settle();

    expect(useCase.loaded).toEqual(['tok', 'tok']);
  });

  it('gives the addresses of the cover and of the calendar file', () => {
    store.select('tok');

    expect(store.coverUrl()).toBe('cover/tok');
    expect(store.calendarUrl()).toBe('calendar/tok');
  });
});
