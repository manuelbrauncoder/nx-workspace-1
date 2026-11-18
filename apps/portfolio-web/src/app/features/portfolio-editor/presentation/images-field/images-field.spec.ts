import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, validate } from '@angular/forms/signals';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { UiDialogService } from '@shared/ui/dialog/dialog.service';
import { PortfolioEditorStore } from '../../application/portfolio-editor.store';
import { ImageForm } from '../image-field/image-form';
import { sectionEditorI18n } from '../section-editor/section-editor.i18n';
import { ImagesField } from './images-field';

const image = (id: string): ImageForm => ({
  media: { id, url: `https://api.example.com/media/${id}`, width: 800, height: 600 },
  alt: { de: `Bild ${id}`, en: `Image ${id}` },
});

@Component({
  imports: [ImagesField],
  template: `<app-images-field
    [field]="_form"
    [label]="'Screenshots'"
    [description]="'Beschreibung der Liste'"
    [max]="max"
  />`,
})
class Host {
  max = 3;
  readonly model = signal<ImageForm[]>([]);
  protected readonly _form = form(this.model, (path) => {
    validate(path, ({ value }) =>
      value().length === 0 ? { kind: 'required', message: 'Mindestens ein Bild.' } : undefined,
    );
  });
  markTouched(): void {
    this._form().markAsTouched();
  }
  isTouched(): boolean {
    return this._form().touched();
  }
}

describe('ImagesField', () => {
  async function render(images: ImageForm[], max = 3) {
    TestBed.configureTestingModule({
      providers: [
        { provide: PortfolioEditorStore, useValue: {} },
        { provide: UiDialogService, useValue: {} },
      ],
    });
    await loadI18nScopes(sectionEditorI18n);
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.max = max;
    fixture.componentInstance.model.set(images);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const settle = () => fixture.whenStable();
    const addButton = () =>
      Array.from(element.querySelectorAll('button')).find((button) =>
        button.textContent?.includes('Screenshot hinzufügen'),
      )!;
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    return { fixture, host: fixture.componentInstance, element, settle, addButton, button };
  }

  it('shows an empty hint and no entries for an empty list', async () => {
    const { element } = await render([]);

    expect(element.querySelectorAll('app-image-field')).toHaveLength(0);
    expect(element.textContent).toContain('Noch kein Screenshot.');
  });

  it('labels the first image as the cover and the others by number', async () => {
    const { element } = await render([image('a'), image('b')]);

    const legends = Array.from(
      element.querySelectorAll('app-image-field > fieldset > legend'),
      (legend) => legend.textContent?.trim(),
    );

    expect(legends).toEqual(['Screenshot 1 (Titelbild)', 'Screenshot 2']);
    expect(element.querySelector('legend')?.textContent?.trim()).toBe('Screenshots');
    expect(element.textContent).toContain('Beschreibung der Liste');
  });

  it('adds an empty image', async () => {
    const { host, addButton, settle, element } = await render([image('a')]);

    addButton().click();
    await settle();

    expect(host.model()).toHaveLength(2);
    expect(host.model()[1].media).toBeNull();
    expect(element.querySelectorAll('app-image-field')).toHaveLength(2);
  });

  it('disables the add button at max', async () => {
    const { addButton } = await render([image('a'), image('b')], 2);

    expect(addButton().disabled).toBe(true);
  });

  it('keeps the add button enabled below max', async () => {
    const { addButton } = await render([image('a')], 2);

    expect(addButton().disabled).toBe(false);
  });

  it('moves an image up and down, disabling the ends', async () => {
    const { host, button, settle } = await render([image('a'), image('b'), image('c')]);

    expect(button('Screenshot 1 nach oben').disabled).toBe(true);
    expect(button('Screenshot 3 nach unten').disabled).toBe(true);

    button('Screenshot 2 nach oben').click();
    await settle();
    expect(host.model().map((item) => item.media?.id)).toEqual(['b', 'a', 'c']);

    button('Screenshot 2 nach unten').click();
    await settle();
    expect(host.model().map((item) => item.media?.id)).toEqual(['b', 'c', 'a']);
  });

  it('removes an image, focuses the add button and marks the list touched', async () => {
    const { host, button, settle, addButton } = await render([image('a'), image('b')]);
    expect(host.isTouched()).toBe(false);

    button('Screenshot 1 entfernen').click();
    await settle();

    expect(host.model().map((item) => item.media?.id)).toEqual(['b']);
    expect(document.activeElement).toBe(addButton());
    expect(host.isTouched()).toBe(true);
  });

  it('shows list-level errors only after the list was touched', async () => {
    const { host, element, settle } = await render([]);
    expect(element.textContent).not.toContain('Mindestens ein Bild.');

    host.markTouched();
    await settle();

    expect(element.querySelector('.images-field__errors')?.textContent).toContain(
      'Mindestens ein Bild.',
    );
    expect(element.querySelector('fieldset')?.getAttribute('aria-describedby')).toContain(
      'images-field-',
    );
  });

  it('is accessible', async () => {
    const { element } = await render([image('a'), image('b')]);

    await expect(element).toBeAccessible();
  });
});
