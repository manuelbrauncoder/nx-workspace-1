import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Localized } from '@core/i18n/localized';
import { Observable, of, throwError } from 'rxjs';
import { LegalPage, LegalPageName, LegalPages } from '../domain/legal';
import { LegalEditorUseCase } from '../domain/legal-editor.usecase';
import { LegalEditorStore } from './legal-editor.store';

const IMPRINT: LegalPage = {
  html: { de: '<h2>Angaben</h2>', en: '<h2>Details</h2>' },
  updatedAt: new Date('2026-10-26T09:00:00.000Z'),
};

const EMPTY: LegalPages = {
  imprint: undefined,
  privacy: undefined,
  accessibility: undefined,
  cookies: undefined,
};

class FakeLegalEditorUseCase {
  pages: LegalPages = { ...EMPTY };
  failWith: Error | undefined;
  update = vi.fn((_name: LegalPageName, html: Localized<string>): Observable<LegalPage> =>
    this.failWith
      ? throwError(() => this.failWith)
      : of({ html, updatedAt: new Date('2026-10-27T09:00:00.000Z') }),
  );

  getAll(): Observable<LegalPages> {
    return of(this.pages);
  }
}

describe('LegalEditorStore', () => {
  let useCase: FakeLegalEditorUseCase;

  function setup(pages: LegalPages = EMPTY): LegalEditorStore {
    useCase = new FakeLegalEditorUseCase();
    useCase.pages = pages;
    TestBed.configureTestingModule({
      providers: [LegalEditorStore, { provide: LegalEditorUseCase, useValue: useCase }],
    });
    return TestBed.inject(LegalEditorStore);
  }

  const stable = () => TestBed.inject(ApplicationRef).whenStable();

  it('saves a page and shows it right away', async () => {
    const store = setup();
    await stable();
    const html = { de: '<p>Neu</p>', en: '<p>New</p>' };

    expect(await store.save('cookies', html)).toBe(true);

    expect(useCase.update).toHaveBeenCalledWith('cookies', html);
    expect(store.pages()?.cookies?.html).toEqual(html);
  });

  it('keeps the stored page when saving fails', async () => {
    const store = setup({ ...EMPTY, imprint: IMPRINT });
    await stable();
    useCase.failWith = new Failure('forbidden', 'Admin rights are missing');

    expect(await store.save('imprint', { de: '<p>x</p>', en: '<p>x</p>' })).toBe(false);

    expect(store.mutationState().failure?.kind).toBe('forbidden');
    expect(store.pages()?.imprint).toEqual(IMPRINT);
  });
});
