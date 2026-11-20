import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormCheckbox } from './form-checkbox';

@Component({
  imports: [FormCheckbox],
  template: `
    <app-form-checkbox [(checked)]="checked">
      <ng-template>Ich habe die <a href="/privacy">Datenschutzerklärung</a> gelesen.</ng-template>
    </app-form-checkbox>
  `,
})
class TemplateLabelHost {
  readonly checked = signal(false);
}

describe('FormCheckbox', () => {
  async function render(inputs: Record<string, unknown> = {}) {
    const fixture = TestBed.createComponent(FormCheckbox);
    fixture.componentRef.setInput('label', 'Erledigt');
    for (const [name, value] of Object.entries(inputs)) {
      fixture.componentRef.setInput(name, value);
    }
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return { fixture, element, button: element.querySelector<HTMLElement>('[role="checkbox"]')! };
  }

  it('links the label to exactly one control', async () => {
    const { element, button } = await render();

    const target = element.querySelector('label')!.getAttribute('for');
    expect(target).toBe(button.id);
    expect(element.querySelectorAll(`[id="${target}"]`).length).toBe(1);
  });

  it('reflects and toggles the checked state', async () => {
    const { fixture, button } = await render({ checked: true });
    expect(button.getAttribute('aria-checked')).toBe('true');

    button.click();
    await fixture.whenStable();

    expect(fixture.componentInstance.checked()).toBe(false);
    expect(button.getAttribute('aria-checked')).toBe('false');
  });

  it('emits touch when focus leaves the control', async () => {
    const { fixture, button } = await render();
    const touched = vi.fn();
    fixture.componentInstance.touch.subscribe(touched);

    button.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));

    expect(touched).toHaveBeenCalled();
  });

  it('describes the control with the description and the visible errors', async () => {
    const errors = [{ kind: 'required', message: 'Bitte bestätigen.' }];
    const { element, button } = await render({ errors, touched: true, description: 'Hinweis' });

    const alert = element.querySelector('[role="alert"]')!;
    expect(alert.textContent).toContain('Bitte bestätigen.');
    // Since Spartan 1.9 the invalid state sits on the button with role checkbox, where assistive
    // technology reads it, and no longer on the wrapper element.
    expect(button.getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('brn-checkbox')?.hasAttribute('aria-invalid')).toBe(false);
    expect(button.getAttribute('aria-describedby')).toBe(
      `${element.querySelector('p')!.id} ${alert.id}`,
    );
  });

  it('disables the control', async () => {
    const { button } = await render({ disabled: true });

    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  describe('with a label template', () => {
    async function renderTemplate() {
      const fixture = TestBed.createComponent(TemplateLabelHost);
      await fixture.whenStable();
      const element: HTMLElement = fixture.nativeElement;
      return { fixture, element, label: element.querySelector('label')! };
    }

    it('renders the template as the label, link included', async () => {
      const { label } = await renderTemplate();

      expect(label.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        'Ich habe die Datenschutzerklärung gelesen.',
      );
      expect(label.querySelector('a')?.getAttribute('href')).toBe('/privacy');
    });

    it('still links the label to the checkbox', async () => {
      const { element, label } = await renderTemplate();

      expect(label.getAttribute('for')).toBe(element.querySelector('[role="checkbox"]')?.id);
    });

    it('is accessible', async () => {
      const { element } = await renderTemplate();

      await expect(element).toBeAccessible();
    });
  });
});
