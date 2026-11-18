import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { AuthStore } from '../application/auth.store';
import { AccountActions, injectAccountActions } from './account-actions';

describe('injectAccountActions', () => {
  const signOut = vi.fn();
  const toast = { success: vi.fn(), error: vi.fn() };
  let actions: AccountActions;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthStore, useValue: { signOut } },
        { provide: UiToastService, useValue: toast },
      ],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    actions = TestBed.runInInjectionContext(() => injectAccountActions());
  });

  it('opens the admin area', async () => {
    await actions.openAdmin();

    expect(navigate).toHaveBeenCalledWith('/admin');
  });

  it('signs out, confirms with a toast and opens the sign-in page', async () => {
    signOut.mockResolvedValue(true);

    await actions.signOut();

    expect(toast.success).toHaveBeenCalledWith('Du bist abgemeldet');
    expect(navigate).toHaveBeenCalledWith('/sign-in');
  });

  it('reports a failed sign-out and stays on the page', async () => {
    signOut.mockResolvedValue(false);

    await actions.signOut();

    expect(toast.error).toHaveBeenCalledWith('Abmelden fehlgeschlagen');
    expect(toast.success).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
