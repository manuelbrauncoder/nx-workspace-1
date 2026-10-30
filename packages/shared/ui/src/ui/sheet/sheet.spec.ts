import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiSheet } from './sheet';

@Component({
  imports: [UiSheet],
  template: `
    <app-ui-sheet
      [(open)]="open"
      [fullWidth]="fullWidth()"
      [hideHeading]="hideHeading()"
      heading="Filter"
    >
      <span appUiSheetHeader>Logo</span>
      Inhalt
    </app-ui-sheet>
  `,
})
class Host {
  readonly open = signal(false);
  readonly fullWidth = signal(false);
  readonly hideHeading = signal(false);
}

describe('UiSheet', () => {
  async function render() {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    return { fixture, host: fixture.componentInstance };
  }

  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

  it('renders nothing while closed', async () => {
    await render();

    expect(dialog()).toBeNull();
  });

  it('opens a dialog named by its heading with the projected content', async () => {
    const { fixture, host } = await render();

    host.open.set(true);
    await fixture.whenStable();

    const labelledBy = dialog()!.getAttribute('aria-labelledby')!;
    expect(document.getElementById(labelledBy)?.textContent).toBe('Filter');
    expect(dialog()!.textContent).toContain('Inhalt');

    host.open.set(false);
    await fixture.whenStable();
  });

  it('marks the panel as full width on request', async () => {
    const { fixture, host } = await render();
    host.fullWidth.set(true);
    host.open.set(true);
    await fixture.whenStable();

    expect(document.querySelector('hlm-sheet-content')?.hasAttribute('data-full-width')).toBe(true);

    host.open.set(false);
    await fixture.whenStable();
  });

  it('keeps a hidden heading as the name of the dialog next to the projected header', async () => {
    const { fixture, host } = await render();
    host.hideHeading.set(true);
    host.open.set(true);
    await fixture.whenStable();

    const heading = document.getElementById(dialog()!.getAttribute('aria-labelledby')!)!;
    expect(heading.textContent).toBe('Filter');
    expect(heading.classList).toContain('sr-only');
    expect(dialog()!.querySelector('.sheet-header')?.textContent).toContain('Logo');

    host.open.set(false);
    await fixture.whenStable();
  });

  it('sets open back to false when the close button is used', async () => {
    const { fixture, host } = await render();
    host.open.set(true);
    await fixture.whenStable();

    dialog()!.querySelector<HTMLButtonElement>('button[aria-label="Schließen"]')!.click();
    await fixture.whenStable();

    expect(host.open()).toBe(false);
  });
});
