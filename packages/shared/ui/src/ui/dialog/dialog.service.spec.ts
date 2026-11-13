import { ApplicationRef, Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiDialog } from './dialog';
import { injectUiDialogData, injectUiDialogRef } from './dialog-ref';
import { UiDialogService } from './dialog.service';

@Component({
  imports: [UiDialog],
  template: `
    <app-ui-dialog heading="Gast hinzufügen">
      <p class="data">{{ _data }}</p>
      <button (click)="_ref.close('done')" type="button">Fertig</button>
    </app-ui-dialog>
  `,
})
class TestDialog {
  protected readonly _data = injectUiDialogData<string>();
  protected readonly _ref = injectUiDialogRef<string>();
}

describe('UiDialogService', () => {
  async function open(options: { closeButton?: boolean } = {}) {
    const ref = TestBed.inject(UiDialogService).open<string, string>(TestDialog, {
      data: 'Hallo',
      ...options,
    });
    await TestBed.inject(ApplicationRef).whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="dialog"]')!;
    return { ref, dialog };
  }

  it('opens the component with its data', async () => {
    const { ref, dialog } = await open();

    expect(dialog.querySelector('.data')?.textContent).toBe('Hallo');
    ref.close();
    await ref.closed;
  });

  it('lets a dialog taller than the screen scroll inside', async () => {
    const { ref, dialog } = await open();

    const content = dialog.querySelector('hlm-dialog-content')!;
    expect(content.classList.contains('overflow-y-auto')).toBe(true);
    expect(content.classList.contains('max-h-[calc(100dvh-2rem)]')).toBe(true);
    ref.close();
    await ref.closed;
  });

  it('resolves closed with the result of the component', async () => {
    const { ref, dialog } = await open();

    dialog.querySelector<HTMLButtonElement>('.data + button')!.click();

    await expect(ref.closed).resolves.toBe('done');
  });

  it('resolves closed with undefined when dismissed with Escape', async () => {
    const { ref, dialog } = await open();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect(ref.closed).resolves.toBeUndefined();
  });
});
