import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiText, UiTextVariant } from './text';

@Component({
  imports: [UiText],
  template: `<p class="text-sm" [appUiText]="variant()">Text</p>`,
})
class Host {
  readonly variant = signal<UiTextVariant>('lead');
}

describe('UiText', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, text: (fixture.nativeElement as HTMLElement).querySelector('p')! };
  }

  it('applies the classes of the variant', async () => {
    const { text } = await render();

    expect(text.classList.contains('text-muted-foreground')).toBe(true);
  });

  it('lets a class on the element win over the variant', async () => {
    const { text } = await render();

    expect(text.classList.contains('text-sm')).toBe(true);
    expect(text.classList.contains('text-xl')).toBe(false);
  });

  it('swaps the classes when the variant changes', async () => {
    const { fixture, text } = await render();

    fixture.componentInstance.variant.set('large');
    await fixture.whenStable();

    expect(text.classList.contains('text-muted-foreground')).toBe(false);
    expect(text.classList.contains('font-semibold')).toBe(true);
  });
});
