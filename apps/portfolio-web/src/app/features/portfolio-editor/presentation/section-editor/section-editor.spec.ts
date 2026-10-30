import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { Observable, of } from 'rxjs';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { About, Portfolio, PortfolioSectionName, PortfolioSections } from '../../domain/portfolio';
import { PortfolioEditorUseCase } from '../../domain/portfolio-editor.usecase';
import { SectionEditor } from './section-editor';
import { sectionEditorI18n } from './section-editor.i18n';

const ABOUT: About = {
  headline: { de: 'Über mich', en: 'About me' },
  description: { de: 'Ich lebe im Spessart.', en: 'I live in the Spessart.' },
  facts: { de: ['Remote', 'Neugierig'], en: ['Remote', 'Curious'] },
  image: {
    id: 'm1',
    url: 'https://api.example.com/media/m1',
    width: 800,
    height: 1200,
    alt: { de: 'Porträt', en: 'Portrait' },
  },
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

describe('SectionEditor', () => {
  const toast = { success: vi.fn(), error: vi.fn() };
  const confirm = vi.fn();
  const createSection = vi.fn(
    <K extends PortfolioSectionName>(_name: K, value: PortfolioSections[K]) => of(value),
  );
  const updateSection = vi.fn(
    <K extends PortfolioSectionName>(_name: K, value: PortfolioSections[K]) => of(value),
  );

  beforeEach(() => vi.clearAllMocks());

  async function render(section: PortfolioSectionName, portfolio: Portfolio = EMPTY) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        PortfolioEditorStore,
        {
          provide: PortfolioEditorUseCase,
          useValue: {
            get: (): Observable<Portfolio> => of(portfolio),
            createSection,
            updateSection,
            getMedia: () => of([]),
          },
        },
        { provide: UiToastService, useValue: toast },
        { provide: UiConfirmDialogService, useValue: { confirm } },
      ],
    });
    await loadI18nScopes(sectionEditorI18n);
    const fixture = TestBed.createComponent(SectionEditor);
    fixture.componentRef.setInput('section', section);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  /** The control of the field with this label, the `index`-th one if several share it. */
  function control(element: HTMLElement, label: string, index = 0) {
    const labels = Array.from(element.querySelectorAll('label')).filter(
      (candidate) => candidate.textContent?.replace('*', '').trim() === label,
    );
    return element.querySelector<HTMLInputElement | HTMLTextAreaElement>(
      `#${labels[index].htmlFor}`,
    )!;
  }

  /** The German and the English control of a text in both languages, found by its legend. */
  function localized(element: HTMLElement, legend: string) {
    const fieldset = Array.from(element.querySelectorAll('fieldset')).find(
      (candidate) => candidate.querySelector(':scope > legend')?.textContent?.trim() === legend,
    )!;
    return [control(fieldset, 'Deutsch'), control(fieldset, 'Englisch')];
  }

  function type(field: HTMLInputElement | HTMLTextAreaElement, value: string): void {
    field.value = value;
    field.dispatchEvent(new Event('input'));
  }

  async function submit(element: HTMLElement): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await settle();
  }

  it('names the section and says that saving creates it', async () => {
    const element = await render('hero');

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Einstieg');
    expect(element.textContent).toContain('Er wird beim Speichern angelegt');
  });

  it('saves nothing and names the missing fields of an empty form', async () => {
    const element = await render('hero');

    await submit(element);

    expect(createSection).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Bitte fülle dieses Feld aus.',
    );
  });

  it('creates a missing section, leaving empty optional fields out', async () => {
    const element = await render('hero');
    type(control(element, 'Name'), 'Ada Lovelace');
    const [de, en] = localized(element, 'Einleitung');
    type(de, 'Hallo');
    type(en, 'Hello');

    await submit(element);

    expect(createSection).toHaveBeenCalledWith('hero', {
      name: 'Ada Lovelace',
      description: { de: 'Hallo', en: 'Hello' },
      mapPlace: { de: '', en: '' },
      mapCoordinates: '',
    });
    expect(toast.success).toHaveBeenCalledWith('Abschnitt gespeichert');
    expect(element.textContent).toContain('Änderungen erscheinen nach dem Speichern sofort');
  });

  it('asks for an optional text in both languages once one of them is filled', async () => {
    const element = await render('hero');
    type(control(element, 'Name'), 'Ada');
    const [description] = localized(element, 'Einleitung');
    type(description, 'Hallo');
    type(localized(element, 'Einleitung')[1], 'Hello');
    type(localized(element, 'Ort auf der Karte')[0], 'Partenstein');

    await submit(element);

    expect(createSection).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte fülle beide Sprachen aus oder lass beide leer.');
  });

  it('changes an existing section, with one list entry per line', async () => {
    const element = await render('about', { ...EMPTY, about: ABOUT });
    const [factsDe] = localized(element, 'Was mich ausmacht');
    expect(factsDe.value).toBe('Remote\nNeugierig');

    type(factsDe, 'Remote\n\nNeugierig\nGeduldig');
    await submit(element);

    expect(updateSection).toHaveBeenCalledWith('about', {
      ...ABOUT,
      facts: { de: ['Remote', 'Neugierig', 'Geduldig'], en: ['Remote', 'Curious'] },
    });
  });

  it('asks for an image before a new about section can be saved', async () => {
    const element = await render('about');
    for (const legend of ['Überschrift', 'Beschreibung', 'Was mich ausmacht']) {
      const [de, en] = localized(element, legend);
      type(de, 'Text');
      type(en, 'Text');
    }

    await submit(element);

    expect(createSection).not.toHaveBeenCalled();
    expect(element.querySelector('app-image-field')?.textContent).toContain(
      'Bitte lade ein Bild hoch oder wähle eines aus der Mediathek.',
    );
  });

  it('adds and removes a project', async () => {
    confirm.mockResolvedValue(true);
    const element = await render('projects');

    element.querySelector<HTMLButtonElement>('.projects-form__items > button')!.click();
    await settle();
    expect(element.querySelectorAll('.projects-form__item')).toHaveLength(1);

    element.querySelector<HTMLButtonElement>('button[aria-label="Projekt 1 entfernen"]')!.click();
    await settle();

    expect(confirm).toHaveBeenCalledOnce();
    expect(element.querySelectorAll('.projects-form__item')).toHaveLength(0);
    // The removed project took the focus with it, so it moves to the button to add one.
    expect(document.activeElement?.textContent?.trim()).toBe('Projekt hinzufügen');
  });
});
