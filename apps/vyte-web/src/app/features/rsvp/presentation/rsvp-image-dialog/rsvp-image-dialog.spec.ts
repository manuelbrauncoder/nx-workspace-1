import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { provideUiDialogTesting } from '@shared/testing/dialog-testing';
import { rsvpI18n } from '../rsvp/rsvp.i18n';
import { RsvpImageDialog, RsvpImageDialogData } from './rsvp-image-dialog';

const DATA: RsvpImageDialogData = {
  src: 'https://api.example.com/rsvp/tok/images/i2',
  width: 1600,
  height: 900,
  number: 2,
  total: 3,
};

describe('RsvpImageDialog', () => {
  const close = vi.fn();

  async function render() {
    TestBed.configureTestingModule({
      providers: provideUiDialogTesting({ data: DATA, close }),
    });
    await loadI18nScopes(rsvpI18n);
    const fixture = TestBed.createComponent(RsvpImageDialog);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement };
  }

  beforeEach(() => close.mockReset());

  it('names the dialog and the image with its place in the gallery', async () => {
    const { element } = await render();

    expect(element.querySelector('h2, h1, [role="heading"]')?.textContent?.trim()).toBe(
      'Bild 2 von 3',
    );
    const image = element.querySelector('img')!;
    expect(image.getAttribute('alt')).toBe('Bild 2 von 3');
    expect(image.getAttribute('src')).toBe(DATA.src);
    expect(image.getAttribute('width')).toBe('1600');
    expect(image.getAttribute('height')).toBe('900');
  });

  it('closes without a result', async () => {
    const { element } = await render();

    Array.from(element.querySelectorAll('button'))
      .find((button) => button.textContent?.trim() === 'Schließen')!
      .click();

    expect(close).toHaveBeenCalledWith(undefined);
  });

  it('has no accessibility violations', async () => {
    const { element } = await render();

    await expect(element).toBeAccessible();
  });
});
