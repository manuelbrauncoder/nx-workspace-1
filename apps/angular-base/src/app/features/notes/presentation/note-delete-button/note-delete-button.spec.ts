import { TestBed } from '@angular/core/testing';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { NoteDeleteButton } from './note-delete-button';

describe('NoteDeleteButton', () => {
  const confirm = vi.fn<UiConfirmDialogService['confirm']>();

  async function clickDelete(answer: boolean) {
    confirm.mockReset().mockResolvedValue(answer);
    TestBed.configureTestingModule({
      providers: [{ provide: UiConfirmDialogService, useValue: { confirm } }],
    });
    const fixture = TestBed.createComponent(NoteDeleteButton);
    fixture.componentRef.setInput('title', 'Einkauf');
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    await fixture.whenStable();

    const button = (fixture.nativeElement as HTMLElement).querySelector('button')!;
    button.click();
    await fixture.whenStable();
    return { button, confirmed };
  }

  it('names the note in the button label and the confirmation', async () => {
    const { button } = await clickDelete(false);

    expect(button.getAttribute('aria-label')).toBe('Löschen: Einkauf');
    expect(confirm.mock.calls[0][0].description).toContain('„Einkauf“');
  });

  it('emits once the user confirmed', async () => {
    const { confirmed } = await clickDelete(true);

    expect(confirmed).toHaveBeenCalledOnce();
  });

  it('stays silent when the user cancels', async () => {
    const { confirmed } = await clickDelete(false);

    expect(confirmed).not.toHaveBeenCalled();
  });
});
