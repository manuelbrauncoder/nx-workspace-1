import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiSeparator } from './separator';

@Component({
  imports: [UiSeparator],
  template: `
    <h2>Beschreibung</h2>
    <div id="horizontal" appUiSeparator></div>
    <h2>Bilder</h2>
    <p class="flex">
      <span>Links</span>
      <span id="vertical" appUiSeparator orientation="vertical"></span>
      <span>Rechts</span>
    </p>
  `,
})
class Host {}

describe('UiSeparator', () => {
  async function render(): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('draws a horizontal line that screen readers skip', async () => {
    const line = (await render()).querySelector<HTMLElement>('#horizontal')!;

    expect(line.getAttribute('data-slot')).toBe('separator');
    expect(line.getAttribute('data-orientation')).toBe('horizontal');
    expect(line.getAttribute('role')).toBe('none');
    expect(line.classList.contains('bg-border')).toBe(true);
  });

  it('passes the orientation on', async () => {
    const line = (await render()).querySelector<HTMLElement>('#vertical')!;

    expect(line.getAttribute('data-orientation')).toBe('vertical');
    expect(line.getAttribute('aria-orientation')).toBeNull();
  });

  it('has no accessibility violations', async () => {
    await expect(await render()).toBeAccessible();
  });
});
