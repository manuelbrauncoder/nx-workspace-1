import { TestBed } from '@angular/core/testing';
import { FormToggleGroup } from './form-toggle-group';

describe('FormToggleGroup', () => {
  const options = [
    { value: 'double', label: 'Double-Out' },
    { value: 'straight', label: 'Straight-Out' },
  ];

  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormToggleGroup<string>);
    fixture.componentRef.setInput('label', 'Spielende');
    fixture.componentRef.setInput('options', options);
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')];
    return {
      fixture,
      element,
      buttons,
      group: element.querySelector('[data-slot="toggle-group"]')!,
    };
  }

  it('names the group with the label', async () => {
    const { element, group } = await render();

    const label = element.querySelector('label')!;
    expect(group.getAttribute('aria-labelledby')).toBe(label.id);
  });

  it('reflects and changes the value', async () => {
    const { fixture, buttons } = await render({ value: 'double' });
    expect(buttons[0]!.getAttribute('aria-pressed')).toBe('true');

    buttons[1]!.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('straight');
  });

  it('emits touch when focus leaves the group', async () => {
    const { fixture, buttons } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    buttons[0]!.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: buttons[1] }),
    );
    expect(touched).not.toHaveBeenCalled();

    buttons[1]!.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(touched).toHaveBeenCalled();
  });

  it('shows the visible errors', async () => {
    const errors = [{ kind: 'required', message: 'Bitte wählen.' }];
    const { element } = await render({ errors, touched: true });

    expect(element.querySelector('[role="alert"]')!.textContent).toContain('Bitte wählen.');
  });
});
