import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiBadge } from './badge';

@Component({
  imports: [UiBadge],
  template: `
    <p>
      <span id="default" appUiBadge>Du</span>
      <span id="secondary" appUiBadge variant="secondary">Admin</span>
    </p>
  `,
})
class Host {}

describe('UiBadge', () => {
  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('is an outline badge by default', async () => {
    const badge = (await render()).querySelector<HTMLElement>('#default')!;

    expect(badge.getAttribute('data-slot')).toBe('badge');
    expect(badge.classList.contains('border-border')).toBe(true);
    expect(badge.classList.contains('bg-secondary')).toBe(false);
    expect(badge.textContent?.trim()).toBe('Du');
  });

  it('puts the secondary variant on the soft ground', async () => {
    const badge = (await render()).querySelector<HTMLElement>('#secondary')!;

    expect(badge.classList.contains('bg-secondary')).toBe(true);
    expect(badge.classList.contains('text-secondary-foreground')).toBe(true);
    expect(badge.classList.contains('border-border')).toBe(false);
  });

  it('has no accessibility violations', async () => {
    await expect(await render()).toBeAccessible();
  });
});
