import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiToggleGroup, type UiToggleGroupOption } from './toggle-group';

@Component({
  imports: [UiToggleGroup],
  template: `
    <app-ui-toggle-group [(value)]="value" [options]="options" ariaLabel="Multiplikator" />
  `,
})
class Host {
  readonly value = signal<number | null>(1);
  readonly options: UiToggleGroupOption<number>[] = [
    { value: 1, label: 'Single' },
    { value: 2, label: 'Double' },
    { value: 3, label: 'Triple', disabled: true },
  ];
}

describe('UiToggleGroup', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const buttons = [...element.querySelectorAll<HTMLButtonElement>('button')];
    return { fixture, element, buttons };
  }

  it('names the group and marks the selected option', async () => {
    const { element, buttons } = await render();

    const group = element.querySelector('[data-slot="toggle-group"]')!;
    expect(group.getAttribute('aria-label')).toBe('Multiplikator');
    expect(buttons.map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
  });

  it('selects another option and keeps the selected one on a second click', async () => {
    const { fixture, buttons } = await render();

    buttons[1]!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(2);

    buttons[1]!.click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe(2);
  });

  it('follows a value set from outside', async () => {
    const { fixture, buttons } = await render();

    fixture.componentInstance.value.set(2);
    await fixture.whenStable();

    expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
  });

  it('disables single options', async () => {
    const { buttons } = await render();

    expect(buttons[2]!.disabled).toBe(true);
  });
});
