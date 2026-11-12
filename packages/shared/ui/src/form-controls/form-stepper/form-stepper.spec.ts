import { TestBed } from '@angular/core/testing';
import { FormStepper } from './form-stepper';

describe('FormStepper', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormStepper);
    fixture.componentRef.setInput('label', 'Ich bringe mit');
    fixture.componentRef.setInput('max', 2);
    fixture.componentRef.setInput('decreaseLabel', 'Eine Person weniger');
    fixture.componentRef.setInput('increaseLabel', 'Eine Person mehr');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const [decrease, increase] = [...element.querySelectorAll<HTMLButtonElement>('button')];
    return {
      fixture,
      element,
      decrease: decrease!,
      increase: increase!,
      output: element.querySelector('output')!,
    };
  }

  it('labels the number and names the buttons', async () => {
    const { element, decrease, increase, output } = await render();

    const label = element.querySelector('label')!;
    expect(label.getAttribute('for')).toBe(output.id);
    // The number is part of the name, so entering the group tells it.
    expect(element.querySelector('.form-stepper')!.getAttribute('aria-labelledby')).toBe(
      `${label.id} ${output.id}`,
    );
    expect(decrease.getAttribute('aria-label')).toBe('Eine Person weniger');
    expect(increase.getAttribute('aria-label')).toBe('Eine Person mehr');
    expect(output.getAttribute('aria-live')).toBe('polite');
  });

  it('counts up and down within min and max', async () => {
    const { fixture, decrease, increase, output } = await render();
    expect(decrease.disabled).toBe(true);

    increase.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(1);
    expect(output.textContent).toContain('1');

    increase.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(2);
    expect(increase.disabled).toBe(true);

    decrease.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(1);
  });

  it('keeps the focus inside when a button reaches its limit', async () => {
    const { fixture, decrease, increase } = await render({ value: 1 });

    increase.focus();
    increase.click();
    await fixture.whenStable();

    expect(increase.disabled).toBe(true);
    expect(document.activeElement).toBe(decrease);
  });

  it('emits touch only when focus leaves the control', async () => {
    const { fixture, decrease, increase } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    decrease.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: increase }));
    expect(touched).not.toHaveBeenCalled();

    increase.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: null }));
    expect(touched).toHaveBeenCalled();
  });

  it('disables both buttons', async () => {
    const { decrease, increase } = await render({ value: 1, disabled: true });

    expect(decrease.disabled).toBe(true);
    expect(increase.disabled).toBe(true);
  });

  it('has no accessibility violations while showing errors', async () => {
    const errors = [{ kind: 'max', message: 'Höchstens 2.' }];
    const { element } = await render({ errors, touched: true, description: 'Bis zu 2 Personen' });

    await expect(element).toBeAccessible();
  });
});
