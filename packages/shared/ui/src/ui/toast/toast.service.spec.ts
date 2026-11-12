import { TestBed } from '@angular/core/testing';
import { toast } from '@spartan-ng/brain/sonner';
import { UiToastService } from './toast.service';

describe('UiToastService', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(['success', 'info', 'warning'] as const)('shows a %s toast', (kind) => {
    const show = vi.spyOn(toast, kind).mockReturnValue(1);

    TestBed.inject(UiToastService)[kind]('Notiz gespeichert', { description: 'Einkauf' });

    expect(show).toHaveBeenCalledWith('Notiz gespeichert', { description: 'Einkauf' });
  });

  it('keeps an error until it is closed', () => {
    const show = vi.spyOn(toast, 'error').mockReturnValue(1);

    TestBed.inject(UiToastService).error('Abmelden fehlgeschlagen', { description: 'Einkauf' });

    expect(show).toHaveBeenCalledWith('Abmelden fehlgeschlagen', {
      description: 'Einkauf',
      duration: Infinity,
      closeButton: true,
    });
  });

  it('passes on the position of a single toast', () => {
    const show = vi.spyOn(toast, 'info').mockReturnValue(1);

    TestBed.inject(UiToastService).info('Entwurf wiederhergestellt', { position: 'bottom-center' });

    expect(show).toHaveBeenCalledWith('Entwurf wiederhergestellt', { position: 'bottom-center' });
  });

  it('announces the same message again as a new one', () => {
    vi.spyOn(toast, 'success').mockReturnValue(1);
    const service = TestBed.inject(UiToastService);

    service.success('Link kopiert');
    const first = service.status();
    service.success('Link kopiert');

    expect(service.status()?.text).toBe('Link kopiert');
    expect(service.status()?.id).not.toBe(first?.id);
  });
});
