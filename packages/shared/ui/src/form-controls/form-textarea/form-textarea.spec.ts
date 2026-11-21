import { TestBed } from '@angular/core/testing';
import { FormTextarea } from './form-textarea';

describe('FormTextarea', () => {
  const errors = [{ kind: 'required', message: 'Bitte gib einen Inhalt ein.' }];

  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormTextarea);
    fixture.componentRef.setInput('label', 'Inhalt');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, textarea: element.querySelector('textarea')! };
  }

  it('links the label to the textarea and applies the rows', async () => {
    const { element, textarea } = await render({ rows: '8' });

    expect(element.querySelector('label')?.getAttribute('for')).toBe(textarea.id);
    expect(textarea.rows).toBe(8);
  });

  it('shows errors only once touched', async () => {
    const { fixture, element, textarea } = await render({ errors });
    expect(element.querySelector('[role="alert"]')).toBeNull();

    fixture.componentRef.setInput('touched', true);
    await fixture.whenStable();

    const alert = element.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Bitte gib einen Inhalt ein.');
    expect(textarea.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('updates the value while typing and emits touch on blur', async () => {
    const { fixture, textarea } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    textarea.value = 'Milch';
    textarea.dispatchEvent(new Event('input'));
    textarea.dispatchEvent(new Event('blur'));

    expect(fixture.componentInstance.value()).toBe('Milch');
    expect(touched).toHaveBeenCalledOnce();
  });

  it('marks the language of the text on the textarea, not on the label', async () => {
    const { element, textarea } = await render({ contentLang: 'de' });

    expect(textarea.getAttribute('lang')).toBe('de');
    expect(element.querySelector('[lang]')).toBe(textarea);
    await expect(element).toBeAccessible();
  });

  it('leaves the language to the page by default', async () => {
    const { textarea } = await render();

    expect(textarea.hasAttribute('lang')).toBe(false);
  });

  it('points the textarea at descriptions outside the control, before its own', async () => {
    const hint = document.createElement('p');
    hint.id = 'group-hint';
    hint.textContent = 'Gilt für beide Sprachen.';
    document.body.append(hint);
    try {
      const { fixture, element, textarea } = await render({
        description: 'Kurz halten.',
        errors,
        touched: true,
      });
      const description = element.querySelector('p[id$="-description"]')!;
      const alert = element.querySelector('[role="alert"]')!;

      // Added after the own description, still read first.
      fixture.componentRef.setInput('descriptionIds', ['group-hint']);
      await fixture.whenStable();

      expect(textarea.getAttribute('aria-describedby')).toBe(
        `group-hint ${description.id} ${alert.id}`,
      );
      await expect(element).toBeAccessible();

      fixture.componentRef.setInput('descriptionIds', []);
      await fixture.whenStable();

      expect(textarea.getAttribute('aria-describedby')).toBe(`${description.id} ${alert.id}`);
    } finally {
      hint.remove();
    }
  });
});
