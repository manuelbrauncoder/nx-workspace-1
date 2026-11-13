import { PRECONNECT_CHECK_BLOCKLIST } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { provideUiDialogTesting } from '@shared/testing/dialog-testing';
import { photoListI18n } from '../photo-list/photo-list.i18n';
import { PhotoDialog, PhotoDialogData } from './photo-dialog';

describe('PhotoDialog', () => {
  const close = vi.fn();
  const data: PhotoDialogData = {
    src: 'https://api.example.com/events/e1/photos/p1',
    width: 1600,
    height: 900,
    heading: 'Foto von Ada Lovelace',
    description: 'Tischkarte · 12.11.2026, 18:48',
  };

  beforeEach(() => vi.resetAllMocks());

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        ...provideUiDialogTesting({ data, close }),
        { provide: PRECONNECT_CHECK_BLOCKLIST, useValue: 'https://api.example.com' },
      ],
    });
    await loadI18nScopes(photoListI18n);
    const fixture = TestBed.createComponent(PhotoDialog);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('shows the heading and the large photo with the heading as its text', async () => {
    const { element } = await render();

    expect(element.textContent).toContain('Foto von Ada Lovelace');
    const image = element.querySelector('img')!;
    expect(image.getAttribute('src')).toContain('/events/e1/photos/p1');
    expect(image.getAttribute('alt')).toBe('Foto von Ada Lovelace');
    expect(image.getAttribute('width')).toBe('1600');
    expect(image.getAttribute('height')).toBe('900');
  });

  it('closes with the close button', async () => {
    const { element } = await render();

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.includes('Schließen'))!
      .click();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });
});
