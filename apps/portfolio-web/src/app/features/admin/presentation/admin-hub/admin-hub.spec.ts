import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { AsyncState, failed, success } from '@core/state/async-state';
import { AdminStore } from '../../application/admin.store';
import { InboxStore } from '../../application/inbox.store';
import { AdminHub } from './admin-hub';
import { adminHubI18n } from './admin-hub.i18n';

describe('AdminHub', () => {
  async function render(messagesState: AsyncState = success()) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AdminStore,
          useValue: {
            users: signal([{}, {}, {}]),
            adminCount: signal(1),
            usersState: signal(success()),
            reloadUsers: vi.fn(),
          },
        },
        {
          provide: InboxStore,
          useValue: {
            messages: signal([{}, {}]),
            unreadCount: signal(2),
            messagesState: signal(messagesState),
            reload: vi.fn(),
          },
        },
      ],
    });
    await loadI18nScopes(adminHubI18n);
    const fixture = TestBed.createComponent(AdminHub);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  it('counts users and messages and links to every area', async () => {
    const element = await render();

    const links = Array.from(element.querySelectorAll('a'), (link) => link.getAttribute('href'));

    expect(element.textContent).toContain('3 Konten, davon 1 mit Admin-Rechten');
    expect(element.textContent).toContain('2 Nachrichten, davon 2 ungelesen');
    expect(links).toEqual(['/users', '/messages', '/admin/portfolio', '/admin/legal']);
  });

  it('shows a failure of one of the lists', async () => {
    const element = await render(failed(new Failure('forbidden', 'No admin rights')));

    expect(element.querySelector('app-failure-alert')?.textContent).toContain(
      'Die Übersicht konnte nicht geladen werden',
    );
  });
});
