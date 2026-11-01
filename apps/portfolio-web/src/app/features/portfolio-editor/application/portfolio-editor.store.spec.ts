import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, throwError } from 'rxjs';
import {
  ContactSection,
  Media,
  Portfolio,
  PortfolioSectionName,
  PortfolioSections,
} from '../domain/portfolio';
import { PortfolioEditorUseCase } from '../domain/portfolio-editor.usecase';
import { PortfolioEditorStore } from './portfolio-editor.store';

const CONTACT: ContactSection = {
  headline: { de: 'Kontakt', en: 'Contact' },
  description: { de: 'Schreib mir', en: 'Write to me' },
};

const EMPTY: Portfolio = {
  hero: undefined,
  about: undefined,
  projects: undefined,
  skills: undefined,
  contact: undefined,
  settings: undefined,
  seo: undefined,
};

const media = (id: string): Media => ({
  id,
  url: `https://api.example.com/media/${id}`,
  width: 800,
  height: 600,
  createdAt: new Date('2026-10-01T09:00:00.000Z'),
});

class FakePortfolioEditorUseCase {
  portfolio: Portfolio = { ...EMPTY };
  failWith: Error | undefined;
  createSection = vi.fn(<K extends PortfolioSectionName>(_name: K, value: PortfolioSections[K]) =>
    this._respond(() => value),
  );
  updateSection = vi.fn(<K extends PortfolioSectionName>(_name: K, value: PortfolioSections[K]) =>
    this._respond(() => value),
  );
  getMedia = vi.fn(() => of([media('m1')]));

  get(): Observable<Portfolio> {
    return of(this.portfolio);
  }

  upload(): Observable<Media> {
    return this._respond(() => media('m2'));
  }

  private _respond<T>(value: () => T): Observable<T> {
    return this.failWith ? throwError(() => this.failWith) : of(value());
  }
}

describe('PortfolioEditorStore', () => {
  let useCase: FakePortfolioEditorUseCase;

  function setup(portfolio: Portfolio = EMPTY): PortfolioEditorStore {
    useCase = new FakePortfolioEditorUseCase();
    useCase.portfolio = portfolio;
    TestBed.configureTestingModule({
      providers: [PortfolioEditorStore, { provide: PortfolioEditorUseCase, useValue: useCase }],
    });
    return TestBed.inject(PortfolioEditorStore);
  }

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  it('creates a section that does not exist yet and shows it right away', async () => {
    const store = setup();
    await stable();

    expect(await store.save('contact', CONTACT)).toBe(true);

    expect(useCase.createSection).toHaveBeenCalledWith('contact', CONTACT);
    expect(useCase.updateSection).not.toHaveBeenCalled();
    expect(store.portfolio()?.contact).toEqual(CONTACT);
  });

  it('changes a section that exists', async () => {
    const store = setup({ ...EMPTY, contact: CONTACT });
    await stable();
    const changed = { ...CONTACT, headline: { de: 'Schreib mir', en: 'Write me' } };

    await store.save('contact', changed);

    expect(useCase.updateSection).toHaveBeenCalledWith('contact', changed);
    expect(store.portfolio()?.contact).toEqual(changed);
  });

  it('keeps the stored section when saving fails', async () => {
    const store = setup({ ...EMPTY, contact: CONTACT });
    await stable();
    useCase.failWith = new Failure('forbidden', 'Admin rights are missing');

    expect(await store.save('contact', { ...CONTACT, headline: CONTACT.description })).toBe(false);

    expect(store.mutationState().failure?.kind).toBe('forbidden');
    expect(store.portfolio()?.contact).toEqual(CONTACT);
  });

  it('loads the library only once it is opened', async () => {
    const store = setup();
    await stable();
    expect(useCase.getMedia).not.toHaveBeenCalled();

    store.loadMedia();
    await stable();

    expect(store.media().map((item) => item.id)).toEqual(['m1']);
  });

  it('puts an upload at the top of the loaded library', async () => {
    const store = setup();
    store.loadMedia();
    await stable();

    const uploaded = await store.upload(new File(['a'], 'a.png', { type: 'image/png' }));

    expect(uploaded?.id).toBe('m2');
    expect(store.media().map((item) => item.id)).toEqual(['m2', 'm1']);
  });
});
