import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { UiConfirmDialogService } from './confirm-dialog.service';

describe('UiConfirmDialogService', () => {
  async function open() {
    const result = TestBed.inject(UiConfirmDialogService).confirm({
      heading: 'Notiz löschen?',
      description: 'Das lässt sich nicht rückgängig machen.',
      confirmLabel: 'Löschen',
      variant: 'destructive',
    });
    await TestBed.inject(ApplicationRef).whenStable();
    const dialog = document.querySelector<HTMLElement>('[role="alertdialog"]')!;
    const [cancel, confirm] = Array.from(dialog.querySelectorAll('button'));
    return { result, dialog, cancel, confirm };
  }

  it('opens an alert dialog named and described by its texts', async () => {
    const { dialog, cancel, confirm, result } = await open();

    const labelledBy = dialog.getAttribute('aria-labelledby')!;
    const describedBy = dialog.getAttribute('aria-describedby')!;
    expect(document.getElementById(labelledBy)?.textContent).toBe('Notiz löschen?');
    expect(document.getElementById(describedBy)?.textContent).toBe(
      'Das lässt sich nicht rückgängig machen.',
    );
    expect(cancel.textContent?.trim()).toBe('Abbrechen');
    expect(confirm.textContent?.trim()).toBe('Löschen');

    cancel.click();
    await result;
  });

  it('resolves to true when the user confirms', async () => {
    const { confirm, result } = await open();

    confirm.click();

    await expect(result).resolves.toBe(true);
  });

  it('resolves to false when the user cancels', async () => {
    const { cancel, result } = await open();

    cancel.click();

    await expect(result).resolves.toBe(false);
  });

  it('resolves to false when the dialog is dismissed with Escape', async () => {
    const { dialog, result } = await open();

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    await expect(result).resolves.toBe(false);
  });
});
