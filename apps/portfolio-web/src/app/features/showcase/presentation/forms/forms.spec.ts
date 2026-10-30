import { TestBed } from '@angular/core/testing';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { Forms } from './forms';
import { showcaseFormsI18n } from './forms.i18n';

describe('Forms', () => {
  beforeEach(() => {
    // jsdom has no ResizeObserver, the select trigger measures itself with one.
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe = vi.fn();
        unobserve = vi.fn();
        disconnect = vi.fn();
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  async function render() {
    await loadI18nScopes(showcaseFormsI18n);
    const fixture = TestBed.createComponent(Forms);
    await fixture.whenStable();
    return fixture;
  }

  it('shows the error of a required field only after the field was left', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;
    const name = element.querySelector<HTMLInputElement>('app-form-text input')!;

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(name.getAttribute('aria-invalid')).toBeNull();

    name.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    const error = element.querySelector('app-form-text [role="alert"]');
    expect(error?.textContent).toContain('Bitte gib einen Namen ein.');
    expect(name.getAttribute('aria-invalid')).toBe('true');
    expect(name.getAttribute('aria-describedby')).toBe(error?.id);
  });

  it('writes typed text into the model and clears the error', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;
    const name = element.querySelector<HTMLInputElement>('app-form-text input')!;

    name.dispatchEvent(new Event('blur'));
    name.value = 'Ada';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(element.querySelector('pre')?.textContent).toContain('"name": "Ada"');
    expect(element.querySelector('app-form-text [role="alert"]')).toBeNull();
  });

  it('disables the control of a field disabled by the form logic', async () => {
    const element: HTMLElement = (await render()).nativeElement;

    const inputs = element.querySelectorAll<HTMLInputElement>('app-form-text input');

    expect(inputs[inputs.length - 1].disabled).toBe(true);
  });

  it('reveals every error on submit', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const messages = Array.from(element.querySelectorAll('[role="alert"]')).map((alert) =>
      alert.textContent?.trim(),
    );
    expect(messages).toEqual([
      'Bitte gib einen Namen ein.',
      'Bitte wähle ein Datum.',
      'Bitte wähle eine Rolle.',
      'Bitte stimme den Bedingungen zu.',
    ]);
  });

  it('toggles a checkbox through its label', async () => {
    const fixture = await render();
    const element: HTMLElement = fixture.nativeElement;

    element.querySelector<HTMLElement>('app-form-checkbox label')!.click();
    await fixture.whenStable();

    expect(element.querySelector('pre')?.textContent).toContain('"terms": true');
  });
});
