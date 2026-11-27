import { ApplicationRef, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { loadI18nScopes } from '@core/i18n/testing/provide-i18n-testing';
import { idle, success } from '@core/state/async-state';
import { UiConfirmDialogService } from '@shared/ui/confirm-dialog/confirm-dialog.service';
import { UiToastService } from '@shared/ui/toast/toast.service';
import { InboxStore } from '../../application/inbox.store';
import { ReceivedMessage } from '../../domain/admin';
import { MessageList } from './message-list';
import { messageListI18n } from './message-list.i18n';

const MESSAGES: ReceivedMessage[] = [
  {
    id: 'm1',
    name: 'Ada',
    email: 'ada@example.com',
    message: 'Hallo!\nHast du Zeit?',
    read: false,
    createdAt: new Date('2026-10-20T08:15:00.000Z'),
  },
  {
    id: 'm2',
    name: 'Grace',
    email: 'grace@example.com',
    message: 'Danke!',
    read: true,
    createdAt: new Date('2026-10-18T17:00:00.000Z'),
  },
];

describe('MessageList', () => {
  const messages = signal(MESSAGES);
  const store = {
    messages,
    messagesState: signal(success()),
    mutationState: signal(idle()),
    unreadCount: computed(() => messages().filter((message) => !message.read).length),
    reload: vi.fn(),
    resetMutation: vi.fn(),
    setRead: vi.fn(),
    deleteMessage: vi.fn(),
  };
  const toast = { success: vi.fn(), error: vi.fn() };
  const confirm = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    messages.set(MESSAGES);
  });

  async function render() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: InboxStore, useValue: store },
        { provide: UiToastService, useValue: toast },
        { provide: UiConfirmDialogService, useValue: { confirm } },
      ],
    });
    await loadI18nScopes(messageListI18n);
    const fixture = TestBed.createComponent(MessageList);
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  it('marks unread messages and says how many there are', async () => {
    const element = await render();

    const cards = element.querySelectorAll('app-message-card');

    expect(element.textContent).toContain('1 ungelesen');
    expect(cards[0].classList).toContain('message-card--unread');
    expect(cards[0].querySelector('.sr-only')?.textContent).toContain('Ungelesen');
    expect(cards[1].classList).not.toContain('message-card--unread');
  });

  it('keeps the line breaks of a message and shows it as text', async () => {
    const element = await render();

    const text = element.querySelector('.message-card__text')!;

    expect(text.textContent).toBe('Hallo!\nHast du Zeit?');
    expect(text.children).toHaveLength(0);
  });

  it('marks a message as read or unread', async () => {
    const element = await render();

    element
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Nachricht von Grace als ungelesen markieren"]',
      )!
      .click();
    await settle();

    expect(store.setRead).toHaveBeenCalledWith('m2', false);
  });

  it('replies by email and counts the message as read', async () => {
    const element = await render();
    const reply = element.querySelector<HTMLAnchorElement>(
      'app-message-card a[href^="mailto:"][appUiButton]',
    )!;

    expect(reply.getAttribute('href')).toBe(
      'mailto:ada@example.com?subject=Deine%20Nachricht%20%C3%BCber%20das%20Kontaktformular',
    );

    // The browser would open the mail program, the test only needs the click handler.
    reply.addEventListener('click', (event) => event.preventDefault());
    reply.click();
    await settle();

    expect(store.setRead).toHaveBeenCalledWith('m1', true);
  });

  it('deletes a message only after confirmation', async () => {
    confirm.mockResolvedValue(true);
    store.deleteMessage.mockResolvedValue(true);
    const element = await render();

    element
      .querySelector<HTMLButtonElement>('button[aria-label="Nachricht von Ada löschen"]')!
      .click();
    await settle();

    expect(confirm).toHaveBeenCalledOnce();
    expect(store.deleteMessage).toHaveBeenCalledWith('m1');
    expect(toast.success).toHaveBeenCalledWith('Nachricht gelöscht');
  });

  it('says so when there are no messages', async () => {
    messages.set([]);
    const element = await render();

    expect(element.querySelector('app-ui-empty')?.textContent).toContain('Keine Nachrichten');
  });
});
