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

    expect(element.querySelector('.photo-card__chip')?.textContent?.trim()).toBe(text);
  });

  it('shows the time of the upload in the time zone of the app', async () => {
    const { element } = await render();

    const time = element.querySelector('time')!;
    expect(time.getAttribute('datetime')).toBe('2027-03-14T18:30:00.000Z');
    expect(time.textContent).toContain('14.03.2027');
    expect(time.textContent).toContain('19:30');
  });

  describe('visible', () => {
    it('has no hidden chip and no hidden class', async () => {
      const { element } = await render();

      expect(element.querySelector('.photo-card__chip--hidden')).toBeNull();
      expect(element.classList.contains('photo-card--hidden')).toBe(false);
    });

    it('offers hiding', async () => {
      const { element } = await render();

      expect(button(element, 'Verbergen: Foto 1 von Ada Lovelace')?.textContent).toContain(
        'Verbergen',
      );
      expect(button(element, 'Wieder zeigen: Foto 1 von Ada Lovelace')).toBeNull();
    });
  });

  describe('hidden', () => {
    it('shows the hidden chip and the hidden class', async () => {
      const { element } = await render({ hidden: true });

      expect(element.querySelector('.photo-card__chip--hidden')?.textContent).toContain(
        'Verborgen',
      );
      expect(element.classList.contains('photo-card--hidden')).toBe(true);
    });

    it('offers showing again instead of hiding', async () => {
      const { element } = await render({ hidden: true });

      expect(button(element, 'Wieder zeigen: Foto 1 von Ada Lovelace')?.textContent).toContain(
        'Wieder zeigen',
      );
      expect(button(element, 'Verbergen: Foto 1 von Ada Lovelace')).toBeNull();
    });
  });

  it('emits open, toggleHidden and remove from their buttons', async () => {
    const { element, outputs } = await render();

    button(element, 'Foto 1 von Ada Lovelace groß ansehen')!.click();
    expect(outputs.open).toHaveBeenCalledTimes(1);
    button(element, 'Verbergen: Foto 1 von Ada Lovelace')!.click();
    expect(outputs.toggleHidden).toHaveBeenCalledTimes(1);
    button(element, 'Löschen: Foto 1 von Ada Lovelace')!.click();
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
