import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, Subject, throwError } from 'rxjs';
import { Portfolio } from '../domain/portfolio';
import { PortfolioUseCase } from '../domain/portfolio.usecase';
import { PortfolioStore } from './portfolio.store';

const portfolio = (name: string): Portfolio => ({
  hero: { name, description: { de: 'Hallo', en: 'Hello' } },
  about: undefined,
  projects: undefined,
  skills: undefined,
  contact: undefined,
  settings: undefined,
  seo: undefined,
});

class FakePortfolioUseCase {
  responses: (() => Observable<Portfolio>)[] = [];
  calls = 0;

  get(): Observable<Portfolio> {
    return this.responses[this.calls++]();
  }
}

describe('PortfolioStore', () => {
  let useCase: FakePortfolioUseCase;
  let store: PortfolioStore;

  beforeEach(() => {
    useCase = new FakePortfolioUseCase();
    TestBed.configureTestingModule({
      providers: [PortfolioStore, { provide: PortfolioUseCase, useValue: useCase }],
    });
    store = TestBed.inject(PortfolioStore);
  });

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  it('requests nothing before the first visit', async () => {
    await stable();

    expect(useCase.calls).toBe(0);
    expect(store.hero()).toBeUndefined();
  });

  it('waits for the content on the first visit', async () => {
    const response = new Subject<Portfolio>();
    useCase.responses = [() => response];

    let loaded = false;
    const load = store.load().then(() => (loaded = true));
    // Not `whenStable()`: the pending request keeps the app from becoming stable.
    TestBed.tick();
    await Promise.resolve();
    expect(loaded).toBe(false);
    expect(store.state().loadingState).toBe('loading');

    response.next(portfolio('Ada'));
    response.complete();
    await load;

    expect(store.hero()?.name).toBe('Ada');
    expect(store.state().loadingState).toBe('success');
  });

  it('keeps the loaded content on screen while it refreshes on a later visit', async () => {
    const refresh = new Subject<Portfolio>();
    useCase.responses = [() => of(portfolio('Ada')), () => refresh];
    await store.load();

    await store.load();
    TestBed.tick();

    expect(store.state().loadingState).toBe('success');
    expect(store.hero()?.name).toBe('Ada');

    refresh.next(portfolio('Grace'));
    refresh.complete();
    await stable();

    expect(store.hero()?.name).toBe('Grace');
    expect(useCase.calls).toBe(2);
  });

  it('settles with the failure and tries again on the next visit', async () => {
    useCase.responses = [
      () => throwError(() => new Failure('network', 'Offline')),
      () => of(portfolio('Ada')),
    ];

    await store.load();
    expect(store.state().failure?.kind).toBe('network');

    await store.load();
    expect(store.hero()?.name).toBe('Ada');
  });
});
