import { TestBed } from '@angular/core/testing';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { EventDeleteButton } from './event-delete-button';

describe('EventDeleteButton', () => {
  const confirm = vi.fn();

  async function render() {
    TestBed.configureTestingModule({
      providers: [{ provide: UiConfirmDialogService, useValue: { confirm } }],
    });
    const fixture = TestBed.createComponent(EventDeleteButton);
    fixture.componentRef.setInput('title', 'Sommerfest');
    const confirmed = vi.fn();
    fixture.componentInstance.confirmed.subscribe(confirmed);
    await fixture.whenStable();
    return { element: fixture.nativeElement as HTMLElement, confirmed };
  }

  beforeEach(() => confirm.mockReset());

  it('names the event in its label and in the question', async () => {
    confirm.mockResolvedValue(false);
    const { element } = await render();

    element.querySelector('button')!.click();
    await Promise.resolve();

    expect(element.querySelector('button')?.getAttribute('aria-label')).toBe('Löschen: Sommerfest');
    expect(confirm).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', heading: 'Event löschen?' }),
    );
  });

  it('emits only after the deletion was confirmed', async () => {
    confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    const { element, confirmed } = await render();

    element.querySelector('button')!.click();
    await new Promise((resolve) => setTimeout(resolve));
    expect(confirmed).not.toHaveBeenCalled();

    element.querySelector('button')!.click();
    await new Promise((resolve) => setTimeout(resolve));
    expect(confirmed).toHaveBeenCalledOnce();
  });
});
