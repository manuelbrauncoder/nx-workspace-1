import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiButton, UiButtonVariant } from './button';

@Component({
  imports: [UiButton],
  template: `
    <button
      [variant]="variant()"
      [disabled]="disabled()"
      [loading]="loading()"
      appUiButton
      type="button"
      loadingLabel="Wird gespeichert"
    >
      Speichern
    </button>
    <a [disabled]="disabled()" appUiButton href="/notes">Abbrechen</a>
  `,
})
class Host {
  readonly variant = signal<UiButtonVariant>('default');
  readonly disabled = signal(false);
  readonly loading = signal(false);
}

describe('UiButton', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      host: fixture.componentInstance,
      button: element.querySelector('button')!,
      link: element.querySelector('a')!,
    };
  }

  it('renders an enabled button by default', async () => {
    const { button } = await render();

    expect(button.disabled).toBe(false);
    expect(button.hasAttribute('aria-busy')).toBe(false);
    expect(button.querySelector('app-ui-spinner')).toBeNull();
  });

  it('applies the classes of the variant', async () => {
    const { fixture, host, button } = await render();
    expect(button.classList.contains('bg-primary')).toBe(true);

    host.variant.set('link');
    await fixture.whenStable();

    expect(button.classList.contains('bg-primary')).toBe(false);
    expect(button.classList.contains('underline-offset-4')).toBe(true);
  });

  it('replaces the primary colors with the brand colors', async () => {
    const { fixture, host, button } = await render();

    host.variant.set('brand');
    await fixture.whenStable();

    expect(button.classList.contains('bg-brand')).toBe(true);
    expect(button.classList.contains('text-brand-foreground')).toBe(true);
    expect(button.classList.contains('bg-primary')).toBe(false);
  });

  it('disables the native button', async () => {
    const { fixture, host, button } = await render();

    host.disabled.set(true);
    await fixture.whenStable();

    expect(button.disabled).toBe(true);
    expect(button.hasAttribute('data-disabled')).toBe(true);
  });

  it('shows a spinner while loading and keeps the button focusable', async () => {
    const { fixture, host, button } = await render();

    host.loading.set(true);
    await fixture.whenStable();

    expect(button.disabled).toBe(false);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.querySelector('app-ui-spinner [aria-hidden="true"]')).not.toBeNull();
    expect(button.querySelector('[aria-live="polite"]')?.textContent).toContain('Wird gespeichert');

    host.loading.set(false);
    await fixture.whenStable();

    expect(button.getAttribute('aria-disabled')).toBeNull();
    expect(button.querySelector('app-ui-spinner')).toBeNull();
    expect(button.querySelector('[aria-live="polite"]')?.textContent?.trim()).toBe('');
  });

  it('swallows the click on a loading button, so its form is not submitted', async () => {
    const { fixture, host, button } = await render();
    const later = vi.fn();
    button.addEventListener('click', later);

    host.loading.set(true);
    await fixture.whenStable();
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(click);

    expect(click.defaultPrevented).toBe(true);
    expect(later).not.toHaveBeenCalled();
  });

  it('swallows the click on a blocked link', async () => {
    const { fixture, host, link } = await render();
    const later = vi.fn();
    link.addEventListener('click', later);
    host.disabled.set(true);
    await fixture.whenStable();

    const event = new MouseEvent('click', { cancelable: true });
    link.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(later).not.toHaveBeenCalled();
    expect(link.getAttribute('aria-disabled')).toBe('true');
    expect(link.getAttribute('tabindex')).toBe('-1');
    expect(link.hasAttribute('disabled')).toBe(false);
  });
});
