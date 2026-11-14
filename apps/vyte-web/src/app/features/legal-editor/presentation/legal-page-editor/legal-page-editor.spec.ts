import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, loading, success } from '@core/state/async-state';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { LegalEditorStore } from '../../application/legal-editor.store';
import { LegalPage, LegalPageName, LegalPages } from '../../domain/legal';
import { LegalPageEditor } from './legal-page-editor';
import { legalPageEditorI18n } from './legal-page-editor.i18n';

const STORED: LegalPage = {
  html: { de: '<p>Hallo</p>', en: '<p>Hello</p>' },
  updatedAt: new Date('2026-11-12T09:30:00.000Z'),
};

describe('LegalPageEditor', () => {
  const save = vi.fn();
  const resetMutation = vi.fn();
  const reload = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };

  beforeEach(() => vi.resetAllMocks());

  async function render(
    options: {
      page?: LegalPageName;
      stored?: LegalPage;
      state?: AsyncState;
      mutationState?: AsyncState;
    } = {},
  ) {
    const pages = {
      imprint: options.stored,
      privacy: undefined,
      accessibility: undefined,
      cookies: undefined,
    } as LegalPages;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: LegalEditorStore,
          useValue: {
            pages: signal(pages),
            state: signal(options.state ?? success()),
            mutationState: signal(options.mutationState ?? idle()),
            save,
            resetMutation,
            reload,
          },
        },
        { provide: UiToastService, useValue: toast },
      ],
    });
    await loadI18nScopes(legalPageEditorI18n);
    const fixture = TestBed.createComponent(LegalPageEditor);
    fixture.componentRef.setInput('page', options.page ?? 'imprint');
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await TestBed.inject(ApplicationRef).whenStable();
  }

  it('shows the title, the breadcrumb and one editor per language', async () => {
    const { element } = await render({ stored: STORED });

    expect(element.querySelector('h1')?.textContent).toBe('Impressum');
    expect(element.querySelector('nav[aria-label] a')?.getAttribute('href')).toBe('/admin/legal');
    expect(element.querySelectorAll('app-form-rich-text')).toHaveLength(2);
    expect(element.textContent).toContain('Deutsch');
    expect(element.textContent).toContain('Englisch');
  });

  it('says the page exists and links to it', async () => {
    const { element } = await render({ stored: STORED });

    expect(element.textContent).toContain('Änderungen erscheinen nach dem Speichern sofort');
    expect(element.querySelector('a[href="/imprint"]')?.textContent).toContain('Seite ansehen');
  });

  it('says a missing page is created on save and offers no view link', async () => {
    const { element } = await render();

    expect(element.textContent).toContain('Diese Seite gibt es noch nicht');
    expect(element.querySelector('a[href="/imprint"]')).toBeNull();
  });

  it('saves both languages of the stored page and confirms with a toast', async () => {
    save.mockResolvedValue(true);
    const { element } = await render({ stored: STORED });

    await submit(element);

    expect(save).toHaveBeenCalledWith('imprint', STORED.html);
    expect(toast.success).toHaveBeenCalledWith('Seite gespeichert');
  });

  it('shows no toast when saving fails', async () => {
    save.mockResolvedValue(false);
    const { element } = await render({ stored: STORED });

    await submit(element);

    expect(toast.success).not.toHaveBeenCalled();
  });

  it('does not save empty languages and reports them as required', async () => {
    const { element } = await render();

    await submit(element);

    expect(save).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte gib einen Text ein.');
  });

  it('shows the failure of a save', async () => {
    const { element } = await render({
      stored: STORED,
      mutationState: failed(new Failure('server', 'Down')),
    });

    expect(element.textContent).toContain('Speichern fehlgeschlagen');
  });

  it('marks the submit button busy while saving', async () => {
    const { element } = await render({ stored: STORED, mutationState: loading() });

    expect(
      element.querySelector<HTMLButtonElement>('button[type="submit"]')?.getAttribute('aria-busy'),
    ).toBe('true');
  });

  it('drops an earlier failure when it opens', async () => {
    await render({ stored: STORED });

    expect(resetMutation).toHaveBeenCalled();
  });

  it('shows the load failure instead of the form and retries', async () => {
    const { element } = await render({ state: failed(new Failure('server', 'Down')) });

    expect(element.textContent).toContain('Die Rechtsseiten konnten nicht geladen werden');
    expect(element.querySelector('form')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    const { element } = await render({ stored: STORED });

    await expect(element).toBeAccessible();
  });

  it('has no accessibility violations with a failure', async () => {
    const { element } = await render({
      mutationState: failed(new Failure('server', 'Down')),
    });

    await expect(element).toBeAccessible();
  });
});
