import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Photo } from '../../domain/photo';
import { photoListI18n } from '../photo-list/photo-list.i18n';
import { PhotoCard } from './photo-card';

const PHOTO: Photo = {
  id: 'p1',
  source: 'guest',
  uploaderName: 'Ada Lovelace',
  width: 1600,
  height: 900,
  hidden: false,
  createdAt: new Date('2027-03-14T18:30:00.000Z'),
};

describe('PhotoCard', () => {
  async function render(photo: Partial<Photo> = {}) {
    TestBed.configureTestingModule({
      providers: [{ provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'https://api.example.com' }],
    });
    await loadI18nScopes(photoListI18n);
    const fixture = TestBed.createComponent(PhotoCard);
    fixture.componentRef.setInput('photo', { ...PHOTO, ...photo });
    fixture.componentRef.setInput('src', 'https://api.example.com/events/e1/photos/p1');
    fixture.componentRef.setInput('priority', true);
    fixture.componentRef.setInput('number', 1);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const outputs = { open: vi.fn(), toggleHidden: vi.fn(), remove: vi.fn() };
    fixture.componentInstance.open.subscribe(outputs.open);
    fixture.componentInstance.toggleHidden.subscribe(outputs.toggleHidden);
    fixture.componentInstance.remove.subscribe(outputs.remove);
    return { fixture, element, outputs };
  }

  const button = (element: HTMLElement, label: string) =>
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);

  const badges = (element: HTMLElement) =>
    Array.from(element.querySelectorAll('[data-slot="badge"]'), (b) => b.textContent?.trim());
  const trigger = (element: HTMLElement) =>
    element.querySelector<HTMLButtonElement>(
      'button[aria-label="Aktionen für Foto 1 von Ada Lovelace"]',
    );
  const menuItems = () =>
    Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  async function openMenu(fixture: { whenStable(): Promise<unknown> }, element: HTMLElement) {
    trigger(element)!.click();
    await fixture.whenStable();
  }

  it('shows who took the photo as a heading and the picture', async () => {
    const { element } = await render();

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Ada Lovelace');
    const image = element.querySelector('img')!;
    expect(image.getAttribute('src')).toContain('/events/e1/photos/p1');
    expect(image.getAttribute('alt')).toBe('');
  });

  it('shows "Ohne Namen" when nobody gave a name', async () => {
    const { element } = await render({ uploaderName: null });

    expect(element.querySelector('h3')?.textContent?.trim()).toBe('Ohne Namen');
    expect(button(element, 'Foto 1 von Ohne Namen groß ansehen')).not.toBeNull();
  });

  it.each([
    ['guest', 'Tischkarte'],
    ['stand', 'Fotostation'],
  ] as const)('shows the source %s as "%s"', async (source, text) => {
    const { element } = await render({ source });

    expect(badges(element)).toEqual([text]);
  });

  it('shows the time of the upload in the time zone of the app', async () => {
    const { element } = await render();

    const time = element.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2027-03-14T18:30:00.000Z');
    expect(time.textContent).toContain('14.03.2027');
    expect(time.textContent).toContain('19:30');
  });

  describe('visible', () => {
    it('has no hidden badge and no hidden class', async () => {
      const { element } = await render();

      expect(badges(element)).not.toContain('Verborgen');
      expect(element.classList.contains('photo-card--hidden')).toBe(false);
    });

    it('offers hiding in the menu', async () => {
      const { fixture, element } = await render();

      await openMenu(fixture, element);

      expect(menuItems().map((item) => item.textContent?.trim())).toEqual(['Verbergen', 'Löschen']);
    });
  });

  describe('hidden', () => {
    it('shows the hidden badge and the hidden class', async () => {
      const { element } = await render({ hidden: true });

      expect(badges(element)).toEqual(['Tischkarte', 'Verborgen']);
      expect(element.classList.contains('photo-card--hidden')).toBe(true);
    });

    it('offers showing again instead of hiding', async () => {
      const { fixture, element } = await render({ hidden: true });

      await openMenu(fixture, element);

      expect(menuItems().map((item) => item.textContent?.trim())).toEqual([
        'Wieder zeigen',
        'Löschen',
      ]);
    });
  });

  it('has no visible hide or delete button outside the menu', async () => {
    const { element } = await render();

    expect(element.querySelector('button[aria-label^="Verbergen"]')).toBeNull();
    expect(element.querySelector('button[aria-label^="Löschen"]')).toBeNull();
    expect(trigger(element)).not.toBeNull();
  });

  it('shows the loading state on the menu trigger while busy', async () => {
    const { fixture, element } = await render();
    expect(trigger(element)!.getAttribute('aria-busy')).not.toBe('true');

    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    expect(trigger(element)!.getAttribute('aria-busy') ?? trigger(element)!.disabled).toBeTruthy();
  });

  it('disables both menu items while busy', async () => {
    const { fixture, element } = await render();
    fixture.componentRef.setInput('busy', true);
    await fixture.whenStable();

    await openMenu(fixture, element);

    const items = menuItems();
    expect(items).toHaveLength(2);
    items.forEach((item) =>
      expect(item.disabled || item.getAttribute('aria-disabled') === 'true').toBe(true),
    );
  });

  it('emits open from the picture and toggleHidden and remove from the menu', async () => {
    const { fixture, element, outputs } = await render();

    button(element, 'Foto 1 von Ada Lovelace groß ansehen')!.click();
    expect(outputs.open).toHaveBeenCalledTimes(1);

    await openMenu(fixture, element);
    menuItems()[0].click();
    await fixture.whenStable();
    expect(outputs.toggleHidden).toHaveBeenCalledTimes(1);

    await openMenu(fixture, element);
    menuItems()[1].click();
    await fixture.whenStable();
    expect(outputs.remove).toHaveBeenCalledTimes(1);
    expect(outputs.open).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations, visible or hidden', async () => {
    const visible = await render();
    await expect(visible.element).toBeAccessible();
    TestBed.resetTestingModule();

    const hidden = await render({ hidden: true, uploaderName: null, source: 'stand' });
    await expect(hidden.element).toBeAccessible();
  });
});
