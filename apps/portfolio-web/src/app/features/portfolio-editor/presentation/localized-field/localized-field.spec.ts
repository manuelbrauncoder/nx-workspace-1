import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';
import { Localized } from '@core/i18n/localized';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { sectionEditorI18n } from '../section-editor/section-editor.i18n';
import { LocalizedField } from './localized-field';

@Component({
  imports: [LocalizedField],
  template: `
    <app-localized-field id="plain" [field]="_form" label="Titel" />
    <app-localized-field id="multi" [field]="_form" label="Text" multiline />
    <app-localized-field id="rich" [field]="_form" label="Beschreibung" richText />
    <app-localized-field id="both" [field]="_form" label="Beides" multiline richText />
  `,
})
class Host {
  protected readonly _form = form(
    signal<Localized<string>>({ de: '<p>Hallo</p>', en: '<p>Hi</p>' }),
  );
}

describe('LocalizedField', () => {
  async function render(): Promise<HTMLElement> {
    await loadI18nScopes(sectionEditorI18n);
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('renders a text line per language by default', async () => {
    const element = await render();

    const field = element.querySelector('#plain')!;

    expect(field.querySelectorAll('app-form-text')).toHaveLength(2);
    expect(field.querySelector('app-form-rich-text')).toBeNull();
    expect(field.querySelector('.localized-field__languages--stacked')).toBeNull();
  });

  it('renders a textarea per language when multiline', async () => {
    const element = await render();

    expect(element.querySelectorAll('#multi app-form-textarea')).toHaveLength(2);
  });

  it('renders a rich-text editor for German and English, stacked', async () => {
    const element = await render();

    const field = element.querySelector('#rich')!;
    const labels = Array.from(field.querySelectorAll('app-form-rich-text'), (editor) =>
      editor.textContent?.includes('Deutsch')
        ? 'de'
        : editor.textContent?.includes('Englisch')
          ? 'en'
          : '?',
    );

    expect(labels).toEqual(['de', 'en']);
    expect(field.querySelector('app-form-text, app-form-textarea')).toBeNull();
    expect(field.querySelector('.localized-field__languages--stacked')).not.toBeNull();
  });

  it('prefers rich text over multiline', async () => {
    const element = await render();

    const field = element.querySelector('#both')!;

    expect(field.querySelectorAll('app-form-rich-text')).toHaveLength(2);
    expect(field.querySelector('app-form-textarea')).toBeNull();
  });

  it('is accessible', async () => {
    const element = await render();

    await expect(element).toBeAccessible();
  });
});
