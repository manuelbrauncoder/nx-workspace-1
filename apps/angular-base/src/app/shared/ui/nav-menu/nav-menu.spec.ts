import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { UiNavMenu, UiNavMenuItem, UiNavMenuOrientation } from './nav-menu';

const ITEMS: UiNavMenuItem[] = [
  { labelKey: 'layout.nav.notes', path: '/notes' },
  {
    labelKey: 'layout.nav.showcase',
    children: [
      { labelKey: 'layout.nav.showcaseOverview', path: '/showcase', exact: true },
      { labelKey: 'layout.nav.showcaseForms', path: '/showcase/forms' },
    ],
  },
];

@Component({
  imports: [UiNavMenu],
  template: `<app-ui-nav-menu
    [items]="items"
    [orientation]="orientation()"
    label="Hauptnavigation"
  />`,
})
class Host {
  readonly items = ITEMS;
  readonly orientation = signal<UiNavMenuOrientation>('horizontal');
}

describe('UiNavMenu', () => {
  async function render(url: string, orientation: UiNavMenuOrientation = 'horizontal') {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: '**', component: Host }])],
    });
    const harness = await RouterTestingHarness.create(url);
    const host = harness.routeDebugElement!.componentInstance as Host;
    host.orientation.set(orientation);
    await harness.fixture.whenStable();
    const element: HTMLElement = harness.routeNativeElement!;
    return {
      harness,
      element,
      nav: element.querySelector('nav')!,
      trigger: element.querySelector<HTMLButtonElement>('nav button')!,
    };
  }

  const texts = (elements: Iterable<Element>) =>
    Array.from(elements, (element) => element.textContent?.trim());

  /** The dropdown panel is rendered in an overlay outside of the component. */
  const panelLinks = () =>
    Array.from(
      document.querySelectorAll<HTMLAnchorElement>('[data-slot="navigation-menu-content"] a'),
    );

  describe('horizontal', () => {
    it('names the landmark with the given label', async () => {
      const { nav } = await render('/notes');

      expect(nav.getAttribute('aria-label')).toBe('Hauptnavigation');
    });

    it('renders a link per item and a button per group', async () => {
      const { nav, trigger } = await render('/notes');

      expect(texts(nav.querySelectorAll('a'))).toEqual(['Notizen']);
      expect(trigger.textContent?.trim()).toBe('Showcase');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('marks the link of the current page', async () => {
      const { nav, trigger } = await render('/notes');

      expect(nav.querySelector('a')!.getAttribute('aria-current')).toBe('page');
      expect(trigger.hasAttribute('data-current')).toBe(false);
    });

    it('opens the links of a group on click and closes them after choosing one', async () => {
      const { harness, trigger } = await render('/showcase/forms');
      expect(panelLinks()).toEqual([]);

      trigger.click();
      await vi.waitFor(() => expect(panelLinks().length).toBe(2));

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(texts(panelLinks())).toEqual(['Übersicht', 'Formulare']);
      // `exact` keeps the overview unmarked on its sub pages.
      expect(panelLinks().map((link) => link.getAttribute('aria-current'))).toEqual([null, 'page']);

      panelLinks()[0].click();
      await harness.fixture.whenStable();
      await vi.waitFor(() => expect(trigger.getAttribute('aria-expanded')).toBe('false'));
    });

    it('marks a group that contains the current page', async () => {
      const { nav, trigger } = await render('/showcase/forms');

      expect(trigger.hasAttribute('data-current')).toBe(true);
      expect(nav.querySelector('a')!.hasAttribute('aria-current')).toBe(false);
    });
  });

  describe('vertical', () => {
    it('keeps a group collapsed until its button is clicked', async () => {
      const { harness, nav, trigger } = await render('/notes', 'vertical');

      expect(nav.getAttribute('aria-label')).toBe('Hauptnavigation');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(nav.querySelector('a[aria-current="page"]')?.textContent?.trim()).toBe('Notizen');

      trigger.click();
      await harness.fixture.whenStable();

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(texts(nav.querySelectorAll('a'))).toEqual(['Notizen', 'Übersicht', 'Formulare']);
    });

    it('starts with the group of the current page expanded', async () => {
      const { nav, trigger } = await render('/showcase/forms', 'vertical');

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(nav.querySelector('a[aria-current="page"]')?.textContent?.trim()).toBe('Formulare');
    });
  });
});
