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
    <app-localized-field
      id="described-plain"
      [field]="_form"
      [description]="_hint"
      label="Wörter"
    />
    <app-localized-field
      id="described-multi"
      [field]="_form"
      [description]="_hint"
      label="Liste"
      multiline
    />
    <app-localized-field
      id="described-rich"
      [field]="_form"
      [description]="_hint"
      label="Text"
      richText
    />
  `,
})
class Host {
  protected readonly _hint = 'Rolle, übrige Wörter';
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

  const kinds = [
    ['plain', 'input'],
    ['multi', 'textarea'],
    ['rich', '[role="textbox"]'],
  ] as const;

  it.each(kinds)('marks the language of each %s field on its input', async (kind, control) => {
    const element = await render();

    const inputs = element.querySelectorAll<HTMLElement>(`#${kind} ${control}`);
    expect(Array.from(inputs, (input) => input.getAttribute('lang'))).toEqual(['de', 'en']);
    // The labels "Deutsch" and "Englisch" stay in the language of the page.
    expect(element.querySelector(`#${kind} label[lang]`)).toBeNull();
  });

  it.each(kinds)('points each %s field at the description of the group', async (kind, control) => {
    const element = await render();

    const group = element.querySelector(`#described-${kind} fieldset`)!;
    const descriptionId = group.getAttribute('aria-describedby')!;
    expect(element.querySelector(`#${descriptionId}`)?.textContent).toBe('Rolle, übrige Wörter');
    const inputs = group.querySelectorAll<HTMLElement>(control);
    expect(inputs).toHaveLength(2);
    for (const input of inputs) {
      expect(input.getAttribute('aria-describedby')?.split(' ')).toContain(descriptionId);
    }
  });

  it('adds no description to the fields of a group without one', async () => {
    const element = await render();

    expect(element.querySelector('#plain [aria-describedby]')).toBeNull();
  });

  // One field per axe run: the whole host with its rich-text editors is too slow for CI.
  it.each([
    'plain',
    'multi',
    'rich',
    'both',
    'described-plain',
    'described-multi',
    'described-rich',
  ])('is accessible as %s', async (id) => {
    const element = await render();

    await expect(element.querySelector<HTMLElement>(`#${id}`)!).toBeAccessible();
  });
});
