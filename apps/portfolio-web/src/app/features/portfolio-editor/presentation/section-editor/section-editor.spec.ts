import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { Observable, of } from 'rxjs';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import {
  About,
  Portfolio,
  PortfolioSectionName,
  PortfolioSections,
  ProjectsSection,
} from '../../domain/portfolio';
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

const PROJECTS: ProjectsSection = {
  headline: { de: 'Projekte', en: 'Projects' },
  description: { de: 'Eine Auswahl.', en: 'A selection.' },
  items: [
    {
      title: 'Kochwelt',
      description: { de: '<p>Rezepte</p>', en: '<p>Recipes</p>' },
      stack: ['Angular'],
      githubUrl: '',
      testUrl: '',
      images: [
        {
          id: 'm1',
          url: 'https://api.example.com/media/m1',
          width: 800,
          height: 600,
          alt: { de: 'Start', en: 'Home' },
        },
        {
          id: 'm2',
          url: 'https://api.example.com/media/m2',
          width: 800,
          height: 600,
          alt: { de: 'Detail', en: 'Detail' },
        },
      ],
      published: true,
    },
  ],
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

  it('creates the hero with the name and the role in both languages', async () => {
    const element = await render('hero');
    type(control(element, 'Name'), 'Ada Lovelace');
    const [accentDe, accentEn] = localized(element, 'Rolle, hervorgehobenes Wort');
    type(accentDe, 'Frontend');
    type(accentEn, 'Frontend');
    const [roleDe, roleEn] = localized(element, 'Rolle, übrige Wörter');
    type(roleDe, 'Entwicklerin');
    type(roleEn, 'Developer');

    await submit(element);

    expect(createSection).toHaveBeenCalledWith('hero', {
      name: 'Ada Lovelace',
      roleAccent: { de: 'Frontend', en: 'Frontend' },
      role: { de: 'Entwicklerin', en: 'Developer' },
    });
    expect(toast.success).toHaveBeenCalledWith('Abschnitt gespeichert');
    expect(element.textContent).toContain('Änderungen erscheinen nach dem Speichern sofort');
  });

  it('asks for the role in both languages', async () => {
    const element = await render('hero');
    type(control(element, 'Name'), 'Ada');
    type(localized(element, 'Rolle, hervorgehobenes Wort')[0], 'Frontend');
    type(localized(element, 'Rolle, übrige Wörter')[0], 'Entwicklerin');

    await submit(element);

    expect(createSection).not.toHaveBeenCalled();
    expect(element.textContent).toContain('Bitte fülle dieses Feld aus.');
  });

  it('passes the accessibility check for the hero', async () => {
    await expect(await render('hero')).toBeAccessible();
  });

  it('passes the accessibility check for the settings', async () => {
    await expect(await render('settings')).toBeAccessible();
  });

  it('edits the settings without name, phone and address', async () => {
    const element = await render('settings');

    const labels = Array.from(element.querySelectorAll('form label'), (label) =>
      label.textContent?.replace(/\s+/g, ' ').replace('*', '').trim(),
    );

    expect(labels).toEqual(['E-Mail', 'GitHub-Profil', 'LinkedIn-Profil']);
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

  describe('projects', () => {
    const addProject = async (element: HTMLElement) => {
      element.querySelector<HTMLButtonElement>('.projects-form__items > button')!.click();
      await settle();
    };

    it('starts a new project with one empty image', async () => {
      const element = await render('projects');

      await addProject(element);

      const images = element.querySelectorAll('.projects-form__item app-image-field');
      expect(images).toHaveLength(1);
      expect(images[0].textContent).toContain('Screenshot 1 (Titelbild)');
      expect(images[0].textContent).toContain('Kein Bild');
    });

    const draftBadge = (element: HTMLElement) => element.querySelector('.projects-form__draft');
    const publishedSwitch = (element: HTMLElement) =>
      element.querySelector<HTMLElement>('.projects-form__item app-form-switch [role="switch"]')!;

    it('starts a new project unpublished, marked as a draft in its legend', async () => {
      const element = await render('projects');

      await addProject(element);

      expect(publishedSwitch(element).getAttribute('aria-checked')).toBe('false');
      expect(draftBadge(element)?.textContent?.trim()).toBe('Entwurf');
      await expect(element).toBeAccessible();
    });

    it('shows a stored published project with the switch on and no badge', async () => {
      const element = await render('projects', { ...EMPTY, projects: PROJECTS });

      expect(publishedSwitch(element).getAttribute('aria-checked')).toBe('true');
      expect(draftBadge(element)).toBeNull();
    });

    it('saves the published state after the switch was toggled', async () => {
      const element = await render('projects', { ...EMPTY, projects: PROJECTS });

      publishedSwitch(element).click();
      await settle();
      expect(draftBadge(element)).not.toBeNull();
      await submit(element);

      expect(updateSection).toHaveBeenCalledOnce();
      const saved = updateSection.mock.calls[0][1] as ProjectsSection;
      expect(saved.items[0].published).toBe(false);
    });

    it('shows the images of a stored project in order', async () => {
      const element = await render('projects', { ...EMPTY, projects: PROJECTS });

      const legends = Array.from(
        element.querySelectorAll('app-images-field app-image-field > fieldset > legend'),
        (legend) => legend.textContent?.trim(),
      );

      expect(legends).toEqual(['Screenshot 1 (Titelbild)', 'Screenshot 2']);
    });

    it('edits the description of a project with a rich-text editor per language', async () => {
      const element = await render('projects', { ...EMPTY, projects: PROJECTS });

      const item = element.querySelector('.projects-form__item')!;
      const description = Array.from(item.querySelectorAll('app-localized-field')).find(
        (field) =>
          field.querySelector(':scope > fieldset > legend')?.textContent?.trim() ===
            'Beschreibung' && field.querySelector('app-form-rich-text'),
      )!;

      expect(description.querySelectorAll('app-form-rich-text')).toHaveLength(2);
      expect(description.querySelector('textarea')).toBeNull();
      // The introduction of the section stays a plain textarea.
      expect(element.querySelector('app-localized-field app-form-textarea')).not.toBeNull();
    });

    it('asks for at least one image once the last one is removed and saved', async () => {
      const element = await render('projects', {
        ...EMPTY,
        projects: {
          ...PROJECTS,
          items: [{ ...PROJECTS.items[0], images: [PROJECTS.items[0].images[0]] }],
        },
      });

      element
        .querySelector<HTMLButtonElement>('button[aria-label="Screenshot 1 entfernen"]')!
        .click();
      await settle();
      await submit(element);

      expect(updateSection).not.toHaveBeenCalled();
      expect(element.querySelector('app-images-field')?.textContent).toContain(
        'Ein Projekt braucht mindestens einen Screenshot.',
      );
    });

    it('does not save a new project whose image has no file', async () => {
      const element = await render('projects');
      await addProject(element);

      await submit(element);

      expect(createSection).not.toHaveBeenCalled();
      expect(element.querySelector('app-image-field')?.textContent).toContain(
        'Bitte lade ein Bild hoch oder wähle eines aus der Mediathek.',
      );
    });

    it('saves the images of a project in the order they were moved to', async () => {
      const element = await render('projects', { ...EMPTY, projects: PROJECTS });

      element
        .querySelector<HTMLButtonElement>('button[aria-label="Screenshot 2 nach oben"]')!
        .click();
      await settle();
      await submit(element);

      expect(updateSection).toHaveBeenCalledOnce();
      const saved = updateSection.mock.calls[0][1] as ProjectsSection;
      expect(saved.items[0].images.map((image) => image.id)).toEqual(['m2', 'm1']);
    });
  });
});
