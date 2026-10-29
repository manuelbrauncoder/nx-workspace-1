import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { UiToastService } from './toast.service';

describe('UiToastService', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['success', 'info', 'warning', 'error'] as const)('shows a %s toast', (kind) => {
    const show = vi.spyOn(toast, kind).mockReturnValue(1);

    TestBed.inject(UiToastService)[kind]('Notiz gespeichert', { description: 'Einkauf' });

    expect(show).toHaveBeenCalledWith('Notiz gespeichert', { description: 'Einkauf' });
  });

  it('passes on the position of a single toast', () => {
    const show = vi.spyOn(toast, 'info').mockReturnValue(1);

    TestBed.inject(UiToastService).info('Entwurf wiederhergestellt', { position: 'bottom-center' });

    expect(show).toHaveBeenCalledWith('Entwurf wiederhergestellt', { position: 'bottom-center' });
  });
});
