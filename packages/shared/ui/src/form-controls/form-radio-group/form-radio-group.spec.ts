import { TestBed } from '@angular/core/testing';
import { FormRadioGroup, FormRadioOption } from './form-radio-group';

describe('FormRadioGroup', () => {
  const options: FormRadioOption<string>[] = [
    { value: 'accepted', label: 'Bin dabei' },
    { value: 'declined', label: 'Klappt nicht', description: 'Schade' },
  ];

  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormRadioGroup<string>);
    fixture.componentRef.setInput('label', 'Antwort');
    fixture.componentRef.setInput('options', options);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      element,
      group: element.querySelector<HTMLElement>('[role="radiogroup"]')!,
      radios: [...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')],
    };
  }

  it('names the group with the label and every radio with its option', async () => {
    const { element, group, radios } = await render();

    expect(group.getAttribute('aria-labelledby')).toBe(element.querySelector('label')!.id);
    expect(radios).toHaveLength(2);
    expect(radios[1]!.closest('label')!.textContent).toContain('Klappt nicht');
    expect(radios[1]!.closest('label')!.textContent).toContain('Schade');
    expect(new Set(radios.map((radio) => radio.name)).size).toBe(1);
  });

  it('reflects and changes the value', async () => {
    const { fixture, radios } = await render({ value: 'accepted' });
    expect(radios[0]!.checked).toBe(true);

    radios[1]!.closest('label')!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('declined');
    expect(radios[1]!.checked).toBe(true);
  });

  it('focuses the selected option, or the first without one', async () => {
    const { fixture, radios } = await render();

    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios[0]);

    fixture.componentRef.setInput('value', 'declined');
    await fixture.whenStable();
    fixture.componentInstance.focus();
    expect(document.activeElement).toBe(radios[1]);
  });

  it('emits touch only when focus leaves the group', async () => {
    const { fixture, radios } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    radios[0]!.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: radios[1] }),
    );
    expect(touched).not.toHaveBeenCalled();

    radios[1]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(touched).toHaveBeenCalled();
  });

  it('shows the visible errors and disables every option', async () => {
    const errors = [{ kind: 'required', message: 'Bitte wählen.' }];
    const { element, radios } = await render({ errors, touched: true, disabled: true });

    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Bitte wählen.');
    expect(radios.every((radio) => radio.disabled)).toBe(true);
  });

  it('tells assistive tech that a choice is required', async () => {
    const { fixture, group } = await render();
    expect(group.hasAttribute('aria-required')).toBe(false);

    fixture.componentRef.setInput('required', true);
    await fixture.whenStable();

    expect(group.getAttribute('aria-required')).toBe('true');
  });

  it('sets the layout on the host', async () => {
    const { element } = await render({ layout: 'cards' });

    expect(element.getAttribute('data-layout')).toBe('cards');
  });

  it('has no accessibility violations while showing errors', async () => {
    const errors = [{ kind: 'required', message: 'Bitte wählen.' }];
    const { element } = await render({ errors, touched: true, description: 'Eine Antwort' });

    await expect(element).toBeAccessible();
  });
});
