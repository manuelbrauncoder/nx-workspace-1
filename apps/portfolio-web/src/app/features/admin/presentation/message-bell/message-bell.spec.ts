import { ApplicationRef, computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Failure } from '@core/failure/failure';
import { AsyncState, failed, success } from '@core/state/async-state';
import { InboxStore } from '../../application/inbox.store';
import { ReceivedMessage } from '../../domain/admin';
import { MessageBell } from './message-bell';

const message = (id: string): ReceivedMessage => ({
  id,
  name: `Name ${id}`,
  email: 'ada@example.com',
  message: 'Hallo!',
  read: false,
  createdAt: new Date('2026-10-20T08:15:00.000Z'),
});

describe('MessageBell', () => {
  const unread = signal<ReceivedMessage[]>([]);
  const messagesState = signal<AsyncState>(success());
  const store = {
    unread,
    unreadCount: computed(() => unread().length),
    messagesState,
    reload: vi.fn(),
    setRead: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    unread.set([]);
    messagesState.set(success());
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: '**', children: [] }]),
        { provide: InboxStore, useValue: store },
      ],
    });
  });

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function render() {
    const fixture = TestBed.createComponent(MessageBell);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector('button')!;
    return { element, trigger };
  }

  async function open(trigger: HTMLButtonElement) {
    trigger.click();
    await settle();
    return Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
  }

  it('has no badge without unread messages', async () => {
    const { element, trigger } = await render();

    expect(trigger.getAttribute('aria-label')).toBe('Nachrichten');
    expect(element.querySelector('.message-bell__count')).toBeNull();
  });

  it('shows the number of unread messages and names it', async () => {
    unread.set([message('1'), message('2')]);
    const { element, trigger } = await render();

    expect(element.querySelector('.message-bell__count')?.textContent?.trim()).toBe('2');
    expect(trigger.getAttribute('aria-label')).toBe('Nachrichten, 2 ungelesen');
  });

  it('caps the badge, not the name', async () => {
    unread.set(Array.from({ length: 12 }, (_, index) => message(String(index))));
    const { element, trigger } = await render();

    expect(element.querySelector('.message-bell__count')?.textContent?.trim()).toBe('9+');
    expect(trigger.getAttribute('aria-label')).toBe('Nachrichten, 12 ungelesen');
  });

  it('reloads when the menu opens and lists at most five messages', async () => {
    unread.set(Array.from({ length: 7 }, (_, index) => message(String(index))));
    const { trigger } = await render();
    expect(store.reload).not.toHaveBeenCalled();

    const items = await open(trigger);

    expect(store.reload).toHaveBeenCalled();
    expect(items).toHaveLength(6);
    expect(items[0].textContent).toContain('Name 0');
    expect(items[5].textContent).toContain('Alle Nachrichten');
  });

  it('says so when there is nothing new', async () => {
    const { trigger } = await render();

    const items = await open(trigger);

    expect(items).toHaveLength(1);
    expect(document.querySelector('.message-bell__status')?.textContent).toContain(
      'Keine neuen Nachrichten',
    );
  });

  it('describes the menu with the failure of the load, accessibly', async () => {
    messagesState.set(failed(new Failure('server', 'Broken')));
    const { trigger } = await render();

    await open(trigger);

    const menu = document.querySelector<HTMLElement>('[role="menu"]')!;
    const description = document.getElementById(menu.getAttribute('aria-describedby')!);
    expect(description?.textContent).toContain('Die Nachrichten konnten nicht geladen werden');
    await expect(menu).toBeAccessible();
  });

  it('marks a chosen message as read and goes to the messages', async () => {
    unread.set([message('1')]);
    const { trigger } = await render();
    const [item] = await open(trigger);

    item.click();
    await settle();

    expect(store.setRead).toHaveBeenCalledWith('1', true);
    expect(TestBed.inject(Router).url).toBe('/admin/messages');
  });

  it('reloads after a navigation', async () => {
    await render();

    await TestBed.inject(Router).navigateByUrl('/elsewhere');

    expect(store.reload).toHaveBeenCalledOnce();
  });

  it('is accessible, closed and open', async () => {
    unread.set([message('1')]);
    const { element, trigger } = await render();
    await expect(element).toBeAccessible();

    await open(trigger);

    await expect(document.querySelector<HTMLElement>('[role="menu"]')!).toBeAccessible();
  });
});
