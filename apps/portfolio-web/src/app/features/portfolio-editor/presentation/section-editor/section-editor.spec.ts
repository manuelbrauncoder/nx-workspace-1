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
      tags: [],
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

    describe('accordion', () => {
      const THREE: Portfolio = {
        ...EMPTY,
        projects: {
          ...PROJECTS,
          items: ['Kochwelt', 'Wetter', 'Notizen'].map((title) => ({
            ...PROJECTS.items[0],
            title,
          })),
        },
      };

      const toggles = (element: HTMLElement) =>
        Array.from(element.querySelectorAll<HTMLButtonElement>('.projects-form__toggle'));
      const panels = (element: HTMLElement) =>
        Array.from(element.querySelectorAll<HTMLElement>('.projects-form__panel'));
      /** Which projects are open, by position. */
      const openOnes = (element: HTMLElement) =>
        toggles(element).flatMap((toggle, index) =>
          toggle.getAttribute('aria-expanded') === 'true' ? [index] : [],
        );
      const titles = (element: HTMLElement) =>
        toggles(element).map((toggle) =>
          toggle.querySelector('.projects-form__title')?.textContent?.trim(),
        );
      const click = async (button: HTMLElement) => {
        button.click();
        await settle();
      };

      it('shows stored projects closed, with the title as the button text', async () => {
        const element = await render('projects', THREE);

        expect(titles(element)).toEqual(['Kochwelt', 'Wetter', 'Notizen']);
        for (const toggle of toggles(element)) {
          expect(toggle.getAttribute('aria-expanded')).toBe('false');
        }
        for (const panel of panels(element)) {
          expect(panel.hidden).toBe(true);
        }
        expect(toggles(element)[0].getAttribute('aria-controls')).toBe(panels(element)[0].id);
      });

      it('falls back to "Projekt n" while a project has no title', async () => {
        const element = await render('projects');

        await addProject(element);

        expect(titles(element)).toEqual(['Projekt 1']);
      });

      it('opens a project on click and closes it on a second click', async () => {
        const element = await render('projects', THREE);

        await click(toggles(element)[1]);
        expect(openOnes(element)).toEqual([1]);
        expect(panels(element).map((panel) => panel.hidden)).toEqual([true, false, true]);

        await click(toggles(element)[1]);
        expect(openOnes(element)).toEqual([]);
        expect(panels(element)[1].hidden).toBe(true);
      });

      it('keeps only one project open', async () => {
        const element = await render('projects', THREE);

        await click(toggles(element)[0]);
        await click(toggles(element)[2]);

        expect(openOnes(element)).toEqual([2]);
        expect(panels(element).map((panel) => panel.hidden)).toEqual([true, true, false]);
      });

      it('opens a new project and puts the cursor in its title', async () => {
        const element = await render('projects', THREE);
        await click(toggles(element)[0]);

        await addProject(element);

        expect(openOnes(element)).toEqual([3]);
        expect(document.activeElement).toBe(control(panels(element)[3], 'Name des Projekts'));
      });

      it('keeps an open project open at its new position when it moves down', async () => {
        const element = await render('projects', THREE);
        await click(toggles(element)[0]);

        await click(
          element.querySelector<HTMLElement>(
            'button[aria-label="Projekt 1: Kochwelt nach unten"]',
          )!,
        );

        expect(titles(element)).toEqual(['Wetter', 'Kochwelt', 'Notizen']);
        expect(openOnes(element)).toEqual([1]);
      });

      it('keeps an open project open at its new position when it moves up', async () => {
        const element = await render('projects', THREE);
        await click(toggles(element)[2]);

        await click(
          element.querySelector<HTMLElement>('button[aria-label="Projekt 3: Notizen nach oben"]')!,
        );

        expect(titles(element)).toEqual(['Kochwelt', 'Notizen', 'Wetter']);
        expect(openOnes(element)).toEqual([1]);
      });

      it('follows the open project when another one moves past it', async () => {
        const element = await render('projects', THREE);
        await click(toggles(element)[1]);

        await click(
          element.querySelector<HTMLElement>(
            'button[aria-label="Projekt 1: Kochwelt nach unten"]',
          )!,
        );

        expect(titles(element)).toEqual(['Wetter', 'Kochwelt', 'Notizen']);
        expect(openOnes(element)).toEqual([0]);
      });

      it('keeps the right project open when one before it is removed', async () => {
        confirm.mockResolvedValue(true);
        const element = await render('projects', THREE);
        await click(toggles(element)[2]);

        await click(
          element.querySelector<HTMLElement>('button[aria-label="Projekt 1: Kochwelt entfernen"]')!,
        );

        expect(titles(element)).toEqual(['Wetter', 'Notizen']);
        expect(openOnes(element)).toEqual([1]);
      });

      it('keeps the open project open when one after it is removed', async () => {
        confirm.mockResolvedValue(true);
        const element = await render('projects', THREE);
        await click(toggles(element)[0]);

        await click(
          element.querySelector<HTMLElement>('button[aria-label="Projekt 3: Notizen entfernen"]')!,
        );

        expect(titles(element)).toEqual(['Kochwelt', 'Wetter']);
        expect(openOnes(element)).toEqual([0]);
      });

      it('closes all projects when the open one is removed', async () => {
        confirm.mockResolvedValue(true);
        const element = await render('projects', THREE);
        await click(toggles(element)[1]);

        await click(
          element.querySelector<HTMLElement>('button[aria-label="Projekt 2: Wetter entfernen"]')!,
        );

        expect(titles(element)).toEqual(['Kochwelt', 'Notizen']);
        expect(openOnes(element)).toEqual([]);
      });

      it('keeps the open project open when removing is cancelled', async () => {
        confirm.mockResolvedValue(false);
        const element = await render('projects', THREE);
        await click(toggles(element)[1]);

        await click(
          element.querySelector<HTMLElement>('button[aria-label="Projekt 1: Kochwelt entfernen"]')!,
        );

        expect(titles(element)).toEqual(['Kochwelt', 'Wetter', 'Notizen']);
        expect(openOnes(element)).toEqual([1]);
      });

      it('opens the project with an error, marks it and does not save', async () => {
        const element = await render('projects', THREE);
        // The title of the second project is emptied while it is open, then it is closed again.
        await click(toggles(element)[1]);
        type(control(panels(element)[1], 'Name des Projekts'), '');
        await settle();
        await click(toggles(element)[1]);
        expect(openOnes(element)).toEqual([]);

        await submit(element);
        await settle();

        expect(updateSection).not.toHaveBeenCalled();
        expect(openOnes(element)).toEqual([1]);
        const invalid = element.querySelectorAll('.projects-form__invalid');
        expect(invalid).toHaveLength(1);
        expect(invalid[0].textContent?.trim()).toBe('Fehler');
        expect(toggles(element)[1].contains(invalid[0])).toBe(true);
      });

      it('puts the cursor on the wrong field of the project it opens', async () => {
        const element = await render('projects', THREE);
        await click(toggles(element)[1]);
        type(control(panels(element)[1], 'Name des Projekts'), '');
        await settle();
        await click(toggles(element)[1]);

        await submit(element);
        await settle();

        expect(document.activeElement).toBe(control(panels(element)[1], 'Name des Projekts'));
        await expect(element).toBeAccessible();
      });

      it('puts the cursor on the button to add a screenshot when the project has none', async () => {
        const element = await render('projects', THREE);
        await click(toggles(element)[1]);
        const panel = panels(element)[1];
        for (let removed = 0; removed < 2; removed++) {
          panel
            .querySelector<HTMLButtonElement>('button[aria-label="Screenshot 1 entfernen"]')!
            .click();
          await settle();
        }
        await click(toggles(element)[1]);

        await submit(element);
        await settle();

        expect(updateSection).not.toHaveBeenCalled();
        expect(openOnes(element)).toEqual([1]);
        expect(panels(element)[1].contains(document.activeElement)).toBe(true);
        expect(document.activeElement?.textContent?.trim()).toBe('Screenshot hinzufügen');
      });

      it('opens the first project with an error when several have one', async () => {
        const element = await render('projects', THREE);
        for (const index of [2, 1]) {
          await click(toggles(element)[index]);
          type(control(panels(element)[index], 'Name des Projekts'), '');
          await settle();
        }
        await click(toggles(element)[1]);

        await submit(element);
        await settle();

        expect(updateSection).not.toHaveBeenCalled();
        expect(openOnes(element)).toEqual([1]);
      });

      it('shows no error marker while the projects are valid', async () => {
        const element = await render('projects', THREE);

        await submit(element);

        expect(element.querySelector('.projects-form__invalid')).toBeNull();
        expect(updateSection).toHaveBeenCalledOnce();
      });

      it('shows the draft badge in the header of a closed project', async () => {
        const element = await render('projects', {
          ...EMPTY,
          projects: {
            ...PROJECTS,
            items: [PROJECTS.items[0], { ...PROJECTS.items[0], title: 'Wetter', published: false }],
          },
        });

        const badges = toggles(element).map((toggle) =>
          toggle.querySelector('.projects-form__draft')?.textContent?.trim(),
        );

        expect(badges).toEqual([undefined, 'Entwurf']);
        expect(openOnes(element)).toEqual([]);
      });

      it('passes the accessibility check with one project open', async () => {
        const element = await render('projects', THREE);
        await click(toggles(element)[0]);

        await expect(element).toBeAccessible();
      });
    });
  });
});
