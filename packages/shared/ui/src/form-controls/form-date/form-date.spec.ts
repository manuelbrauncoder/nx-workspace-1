import { TestBed } from '@angular/core/testing';
import { FormDate } from './form-date';

describe('FormDate', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormDate);
    fixture.componentRef.setInput('label', 'Fällig am');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, trigger: element.querySelector('button')! };
  }

  it('links the label to the trigger and shows the placeholder', async () => {
    const { element, trigger } = await render();

    expect(element.querySelector('label')?.getAttribute('for')).toBe(trigger.id);
    expect(trigger.textContent).toContain('Datum wählen');
  });

  it('shows the selected date in German notation', async () => {
    const { trigger } = await render({ value: new Date(2026, 9, 5) });

    expect(trigger.textContent).toContain('05.10.2026');
  });

  it('describes the trigger with the errors once touched', async () => {
    const errors = [{ kind: 'required', message: 'Bitte wähle ein Datum.' }];
    const { fixture, element, trigger } = await render({ errors });
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(trigger.getAttribute('aria-invalid')).toBeNull();

    fixture.componentRef.setInput('touched', true);
    await fixture.whenStable();

    const alert = element.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Bitte wähle ein Datum.');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('emits touch when focus leaves the closed picker', async () => {
    const { fixture, trigger } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    expect(touched).toHaveBeenCalledOnce();
  });

  it('disables the trigger', async () => {
    const { trigger } = await render({ disabled: true });

    expect(trigger.disabled).toBe(true);
  });

  it('says in the label that a required date is required, the trigger button cannot', async () => {
    const { element } = await render({ required: true });

    const label = element.querySelector('label')!;
    expect(label.querySelector('.sr-only')?.textContent?.trim()).toBe('Pflichtfeld');
    expect(label.querySelector('[aria-hidden="true"]')?.textContent).toBe('*');
  });
});
