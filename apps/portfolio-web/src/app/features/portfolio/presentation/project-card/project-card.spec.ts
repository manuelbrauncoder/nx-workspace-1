import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Project } from '../../domain/portfolio';
import { portfolioHomeI18n } from '../portfolio-home/portfolio-home.i18n';
import { ProjectCard } from './project-card';

/** jsdom has none of these, the carousel's embla needs them to start. */
class IdleObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords(): [] {
    return [];
  }
}

const PROJECT: Project = {
  title: 'Join',
  description: { de: 'Kanban', en: 'Kanban' },
  stack: ['Angular'],
  githubUrl: 'https://github.com/manuelbrauncoder/Join-2.0',
  images: [
    {
      id: 'join',
      url: 'https://api.example.com/media/join',
      width: 800,
      height: 600,
      alt: { de: 'Bild join', en: 'Image join' },
    },
  ],
  published: true,
};

describe('ProjectCard', () => {
  beforeEach(() => {
    vi.stubGlobal('IntersectionObserver', IdleObserver);
    vi.stubGlobal('ResizeObserver', IdleObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render(project: Project) {
    await loadI18nScopes(portfolioHomeI18n);
    const fixture = TestBed.createComponent(ProjectCard);
    fixture.componentRef.setInput('project', project);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('marks a draft with a badge and a hint', async () => {
    const element = await render({ ...PROJECT, published: false });

    const draft = element.querySelector('.project-card__draft')!;
    expect(draft).not.toBeNull();
    expect(draft.textContent).toContain('Entwurf');
    expect(draft.textContent).toContain('Nur für dich sichtbar');
    expect(draft.querySelector('[appUiBadge]')?.textContent?.trim()).toBe('Entwurf');
  });

  it('shows no draft marker for a published project', async () => {
    const element = await render(PROJECT);

    expect(element.querySelector('.project-card__draft')).toBeNull();
    expect(element.textContent).not.toContain('Entwurf');
    expect(element.querySelector('.project-card__title')?.textContent).toContain('Join');
  });

  it('uses the overlay controls of the carousel with the screenshot labels', async () => {
    const element = await render({
      ...PROJECT,
      images: [PROJECT.images[0], { ...PROJECT.images[0], id: 'b' }],
    });

    expect(element.querySelector('.ui-carousel--overlay')).not.toBeNull();
    const next = element.querySelector('.ui-carousel__arrow--next')!;
    const previous = element.querySelector('.ui-carousel__arrow--previous')!;
    expect(next.getAttribute('aria-label')).toBe('Nächster Screenshot');
    expect(previous.getAttribute('aria-label')).toBe('Vorheriger Screenshot');
  });

  it('shows the links with the arrowUpRight icon and a label naming the project', async () => {
    const element = await render({ ...PROJECT, testUrl: 'https://join.example.com' });

    const links = Array.from(element.querySelectorAll<HTMLAnchorElement>('.project-card__link'));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      'https://join.example.com',
      PROJECT.githubUrl,
    ]);
    for (const link of links) {
      expect(link.getAttribute('target')).toBe('_blank');
      expect(link.getAttribute('rel')).toBe('noopener noreferrer');
      expect(link.getAttribute('aria-label')).toContain('Join');
      expect(link.querySelector('app-ui-icon')).not.toBeNull();
    }
  });

  it('shows no links without urls', async () => {
    const element = await render({ ...PROJECT, githubUrl: undefined });

    expect(element.querySelector('.project-card__links')).toBeNull();
  });

  it('is accessible as a draft', async () => {
    const element = await render({ ...PROJECT, published: false });

    await expect(element).toBeAccessible();
  });
});
