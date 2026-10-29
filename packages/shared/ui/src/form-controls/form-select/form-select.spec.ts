import { TestBed } from '@angular/core/testing';
import { FormSelect, FormSelectOption } from './form-select';

describe('FormSelect', () => {
  const options: FormSelectOption<string>[] = [
    { value: 'low', label: 'Niedrig' },
    { value: 'high', label: 'Hoch' },
  ];

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

  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormSelect<string>);
    fixture.componentRef.setInput('label', 'Priorität');
    fixture.componentRef.setInput('options', options);
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
    expect(trigger.textContent).toContain('Bitte wählen');
  });

  it('shows the label of the selected option', async () => {
    const { trigger } = await render({ value: 'high' });

    expect(trigger.textContent).toContain('Hoch');
  });

  it('marks the trigger invalid and describes it once touched', async () => {
    const errors = [{ kind: 'required', message: 'Bitte wähle eine Priorität.' }];
    const { fixture, element, trigger } = await render({ errors });
    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(trigger.getAttribute('aria-invalid')).not.toBe('true');

    fixture.componentRef.setInput('touched', true);
    await fixture.whenStable();

    const alert = element.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Bitte wähle eine Priorität.');
    expect(trigger.getAttribute('aria-invalid')).toBe('true');
    expect(trigger.getAttribute('aria-describedby')).toBe(alert.id);
  });

  it('emits touch when focus leaves the closed select', async () => {
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
});
