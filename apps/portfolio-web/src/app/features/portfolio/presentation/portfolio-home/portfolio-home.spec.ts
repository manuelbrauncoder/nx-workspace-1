import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { I18nService } from '@core/i18n/i18n.service';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, idle, success } from '@core/state/async-state';
import { ContactStore } from '../../application/contact.store';
import { PortfolioStore } from '../../application/portfolio.store';
import { Portfolio, PortfolioImage } from '../../domain/portfolio';
import { PortfolioHome } from './portfolio-home';
import { portfolioHomeI18n } from './portfolio-home.i18n';

const image = (id: string): PortfolioImage => ({
  id,
  url: `https://api.example.com/media/${id}`,
  width: 800,
  height: 600,
  alt: { de: `Bild ${id}`, en: `Image ${id}` },
});

const PORTFOLIO: Portfolio = {
  hero: {
    name: 'Manuel Braun',
    description: { de: 'Hey, ich bin Manuel.', en: 'Hey there, I’m Manuel.' },
    mapPlace: { de: 'Partenstein', en: 'Partenstein' },
  },
  about: {
    headline: { de: 'Über mich', en: 'About me' },
    description: { de: 'Ich lebe im Spessart.', en: 'I live in the Spessart.' },
    facts: { de: ['Remote', 'Neugierig'], en: ['Remote', 'Curious'] },
    image: image('portrait'),
  },
  projects: {
    headline: { de: 'Projekte', en: 'Projects' },
    description: { de: 'Eine Auswahl.', en: 'A selection.' },
    items: [
      {
        title: 'Kochwelt',
        description: {
          de: '<p>Rezepte mit <strong>Biss</strong></p><script>window.hacked = true</script>',
          en: '<p>Recipes</p>',
        },
        stack: ['Angular'],
        testUrl: 'https://cooking-world.example.com',
        images: [image('kochwelt'), image('kochwelt-2')],
        published: true,
      },
      {
        title: 'Join',
        description: { de: 'Kanban', en: 'Kanban' },
        stack: ['Angular', 'Firebase'],
        githubUrl: 'https://github.com/manuelbrauncoder/Join-2.0',
        images: [image('join')],
        published: true,
      },
    ],
  },
  skills: {
    headline: { de: 'Skill Set', en: 'Skill set' },
    description: { de: 'Frontend mit Angular.', en: 'Frontend with Angular.' },
    sets: [
      {
        title: { de: 'Frontend', en: 'Frontend' },
        skills: [
          { name: { de: 'Angular', en: 'Angular' }, points: { de: ['Signals', 'SSR'], en: [] } },
        ],
      },
      {
        title: { de: 'Infrastruktur', en: 'Infrastructure' },
        skills: [{ name: { de: 'Docker', en: 'Docker' }, points: { de: ['Container'], en: [] } }],
      },
    ],
  },
  contact: {
    headline: { de: 'Lust auf einen Austausch?', en: 'Interested in a chat?' },
    description: { de: 'Schreib mir.', en: 'Write to me.' },
  },
  settings: {
    name: 'Manuel Braun',
    email: 'mail@manuel-braun.net',
    profiles: {
      github: 'https://github.com/manuelbrauncoder',
      linkedin: 'https://www.linkedin.com/in/manuel-braun-developer/',
    },
  },
  seo: undefined,
};

/** jsdom has none of these, the carousel's embla needs them to start. */
class IdleObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords(): [] {
    return [];
  }
}

describe('PortfolioHome', () => {
  async function render(portfolio: Portfolio = PORTFOLIO, state: AsyncState = success()) {
    const content = signal(portfolio);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ContactStore, useValue: { mutationState: signal(idle()), send: vi.fn() } },
        {
          provide: PortfolioStore,
          useValue: {
            state: signal(state),
            reload: vi.fn(),
            hero: computed(() => content().hero),
            about: computed(() => content().about),
            projects: computed(() => content().projects),
            skills: computed(() => content().skills),
            contact: computed(() => content().contact),
            settings: computed(() => content().settings),
            seo: computed(() => content().seo),
          },
        },
      ],
    });
    await loadI18nScopes(portfolioHomeI18n);
    const fixture = TestBed.createComponent(PortfolioHome);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows the name and the role as the only top-level heading', async () => {
    const { element } = await render();

    const headings = element.querySelectorAll('h1');

    expect(headings.length).toBe(1);
    expect(headings[0].textContent?.replace(/\s+/g, ' ').trim()).toBe(
      'Manuel Braun Frontend Developer',
    );
    expect(headings[0].querySelector('em')?.textContent).toBe('Frontend');
  });

  it('keeps the magnified copy of the headline away from assistive technology', async () => {
    const { element } = await render();

    const lens = element.querySelector('app-hero-lens')!;
    const copy = lens.querySelector('.hero__headline--copy')!;

    expect(lens.getAttribute('aria-hidden')).toBe('true');
    expect(copy.getAttribute('aria-hidden')).toBe('true');
    expect(copy.hasAttribute('inert')).toBe(true);
    expect(copy.textContent?.replace(/\s+/g, ' ').trim()).toBe('Manuel Braun Frontend Developer');
  });

  it('leaves the hero description out', async () => {
    const { element } = await render();

    expect(element.querySelector('app-hero-section')?.textContent).not.toContain(
      'Hey, ich bin Manuel.',
    );
  });

  it('puts the sections in order, each a jump target of the navigation', async () => {
    const { element } = await render();

    const sections = Array.from(element.querySelectorAll('section[id]'), (section) => section.id);

    expect(sections).toEqual(['about', 'projects', 'skills', 'contact']);
    for (const id of sections) {
      const section = element.querySelector(`#${id}`)!;
      expect(section.getAttribute('tabindex')).toBe('-1');
      expect(element.querySelector(`#${section.getAttribute('aria-labelledby')}`)).not.toBeNull();
    }
  });

  it('leaves out a section that has not been created', async () => {
    const { element } = await render({ ...PORTFOLIO, hero: undefined, skills: undefined });

    expect(element.querySelector('h1')).toBeNull();
    expect(element.querySelector('#skills')).toBeNull();
    expect(element.querySelector('#about')).not.toBeNull();
  });

  it('shows every project with the links it has', async () => {
    const { element } = await render();

    const titles = Array.from(element.querySelectorAll('app-project-card h3'), (title) =>
      title.textContent?.trim(),
    );
    const cards = element.querySelectorAll('app-project-card');

    expect(titles).toEqual(['Kochwelt', 'Join']);
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe(
      'https://cooking-world.example.com',
    );
    expect(cards[1].querySelector('a')?.getAttribute('href')).toBe(
      'https://github.com/manuelbrauncoder/Join-2.0',
    );
  });

  it('shows a card per skill set with the points of each skill', async () => {
    const { element } = await render();

    const titles = Array.from(element.querySelectorAll('.skills__card h3'), (title) =>
      title.textContent?.trim(),
    );

    expect(titles).toEqual(['Frontend', 'Infrastruktur']);
    expect(element.querySelectorAll('.skills__points li').length).toBe(3);
  });

  it('lists the direct ways to get in touch', async () => {
    const { element } = await render();

    const channels = Array.from(element.querySelectorAll('.contact__channel'), (channel) =>
      channel.textContent?.trim(),
    );

    expect(channels).toEqual([PORTFOLIO.settings!.email, 'GitHub', 'LinkedIn']);
  });

  it('follows a language switch without loading again', async () => {
    const { fixture, element } = await render();

    await TestBed.inject(I18nService).setLanguage('en');
    await fixture.whenStable();

    expect(element.querySelector('#about-heading')?.textContent?.trim()).toBe('About me');
    expect(element.querySelector('.about__portrait')?.getAttribute('alt')).toBe('Image portrait');
  });

  it('shows why the content could not be loaded', async () => {
    const { element } = await render(PORTFOLIO, failed(new Failure('network', 'Offline')));

    expect(element.querySelector('app-failure-alert')?.textContent).toContain(
      'Die Startseite konnte nicht geladen werden',
    );
    expect(element.querySelector('section')).toBeNull();
  });

  describe('project card', () => {
    beforeEach(() => {
      vi.stubGlobal('IntersectionObserver', IdleObserver);
      vi.stubGlobal('ResizeObserver', IdleObserver);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('shows several screenshots in a carousel named after the project', async () => {
      const { element } = await render();

      const card = element.querySelectorAll('app-project-card')[0];
      const region = card.querySelector('app-ui-carousel [role="region"]')!;

      expect(region.getAttribute('aria-label')).toBe('Screenshots von Kochwelt');
      expect(card.querySelectorAll('app-ui-carousel img')).toHaveLength(2);
      expect(card.querySelector('app-ui-carousel img')?.getAttribute('alt')).toBe('Bild kochwelt');
      const buttons = Array.from(card.querySelectorAll('app-ui-carousel button'), (button) =>
        button.getAttribute('aria-label'),
      );
      expect(buttons).toEqual(['Vorheriger Screenshot', 'Nächster Screenshot']);
    });

    it('shows a single screenshot without carousel controls', async () => {
      const { element } = await render();

      const card = element.querySelectorAll('app-project-card')[1];

      expect(card.querySelectorAll('app-ui-carousel img')).toHaveLength(1);
      expect(card.querySelector('app-ui-carousel [role="region"]')).toBeNull();
      expect(card.querySelector('app-ui-carousel button')).toBeNull();
    });

    it('renders the description as rich text and drops a script', async () => {
      const { element } = await render();

      const description = element.querySelector('app-project-card app-ui-rich-text')!;

      expect(description.querySelector('strong')?.textContent).toBe('Biss');
      expect(description.querySelector('script')).toBeNull();
      expect((window as { hacked?: boolean }).hacked).toBeUndefined();
    });

    it('shows the description of the other language after a switch', async () => {
      const { fixture, element } = await render();

      await TestBed.inject(I18nService).setLanguage('en');
      await fixture.whenStable();

      expect(element.querySelector('app-project-card app-ui-rich-text')?.textContent).toContain(
        'Recipes',
      );
    });

    it('is accessible', async () => {
      const { element } = await render();

      await expect(element.querySelector('#projects') as HTMLElement).toBeAccessible();
    });

    it('passes the accessibility check as a whole page', async () => {
      const { element } = await render();

      await expect(element).toBeAccessible();
    });

    it('shows the stack of every project that has one', async () => {
      const { element } = await render();

      expect(element.querySelectorAll('.project-card__stack').length).toBe(2);
    });
  });
});
