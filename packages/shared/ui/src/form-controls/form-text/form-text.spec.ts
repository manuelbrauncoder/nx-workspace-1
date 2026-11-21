import { TestBed } from '@angular/core/testing';
import { FormText } from './form-text';

describe('FormText', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormText);
    fixture.componentRef.setInput('label', 'Titel');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, input: element.querySelector('input')! };
  }

  const errors = [{ kind: 'required', message: 'Bitte gib einen Titel ein.' }];

  it('links the label to the input', async () => {
    const { element, input } = await render();

    const label = element.querySelector('label')!;
    expect(label.textContent).toContain('Titel');
    expect(label.getAttribute('for')).toBe(input.id);
  });

  it('keeps errors hidden until the control was touched', async () => {
    const { element, input } = await render({ errors });

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('shows the errors of a touched control and points the input at them', async () => {
    const { element, input } = await render({ errors, touched: true, description: 'Kurz halten.' });

    const alert = element.querySelector('[role="alert"]')!;
    const description = element.querySelector('p')!;
    expect(alert.textContent).toContain('Bitte gib einen Titel ein.');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(`${description.id} ${alert.id}`);
  });

  it('updates the value while typing and emits touch on blur', async () => {
    const { fixture, input } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    input.value = 'Einkauf';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));

    expect(fixture.componentInstance.value()).toBe('Einkauf');
    expect(touched).toHaveBeenCalledOnce();
  });

  it('passes the field state on to the input', async () => {
    const { element, input } = await render({ disabled: true, required: true, value: 'Alt' });

    expect(input.disabled).toBe(true);
    expect(input.required).toBe(true);
    expect(input.value).toBe('Alt');
    expect(element.querySelector('label')?.textContent).toContain('*');
  });

  it('has no accessibility violations while showing errors', async () => {
    const { element } = await render({ errors, touched: true, description: 'Kurz halten.' });

    await expect(element).toBeAccessible();
  });

  it('marks the language of the text on the input, not on the label', async () => {
    const { element, input } = await render({ contentLang: 'en' });

    expect(input.getAttribute('lang')).toBe('en');
    expect(element.querySelector('[lang]')).toBe(input);
    await expect(element).toBeAccessible();
  });

  it('leaves the language to the page by default', async () => {
    const { input } = await render();

    expect(input.hasAttribute('lang')).toBe(false);
  });

  it('points the input at descriptions outside the control, before its own', async () => {
    const hint = document.createElement('p');
    hint.id = 'group-hint';
    hint.textContent = 'Gilt für beide Sprachen.';
    document.body.append(hint);
    try {
      const { fixture, element, input } = await render({
        descriptionIds: ['group-hint'],
        description: 'Kurz halten.',
        errors,
        touched: true,
      });

      const description = element.querySelector('p[id$="-description"]')!;
      const alert = element.querySelector('[role="alert"]')!;
      expect(input.getAttribute('aria-describedby')).toBe(
        `group-hint ${description.id} ${alert.id}`,
      );
      await expect(element).toBeAccessible();

      fixture.componentRef.setInput('descriptionIds', []);
      await fixture.whenStable();

      expect(input.getAttribute('aria-describedby')).toBe(`${description.id} ${alert.id}`);
    } finally {
      hint.remove();
    }
  });
});
