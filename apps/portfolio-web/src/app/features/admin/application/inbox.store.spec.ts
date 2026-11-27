import { ApplicationRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { AuthStore } from '@features/auth/public-api';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ReceivedMessage } from '../domain/admin';
import { InboxUseCase } from '../domain/inbox.usecase';
import { InboxStore } from './inbox.store';

const message = (id: string, read = false): ReceivedMessage => ({
  id,
  name: 'Ada',
  email: 'ada@example.com',
  message: 'Hallo!',
  read,
  createdAt: new Date('2026-10-20T08:15:00.000Z'),
});

const MESSAGES = [message('m1'), message('m2', true), message('m3')];

describe('InboxStore', () => {
  const isAdmin = signal(true);
  const useCase = {
    getMessages: vi.fn<() => Observable<ReceivedMessage[]>>(),
    setRead: vi.fn<(id: string, read: boolean) => Observable<ReceivedMessage>>(),
    deleteMessage: vi.fn<(id: string) => Observable<void>>(),
  };

  beforeEach(() => {
    vi.resetAllMocks();
    isAdmin.set(true);
    useCase.getMessages.mockReturnValue(of(MESSAGES));
    useCase.setRead.mockImplementation((id, read) => of(message(id, read)));
    useCase.deleteMessage.mockReturnValue(of(undefined));
  });

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: InboxUseCase, useValue: useCase },
        { provide: AuthStore, useValue: { isAdmin } },
      ],
    });
    const store = TestBed.inject(InboxStore);
    await settle();
    return store;
  }

  it('loads the messages of an admin and counts the unread ones', async () => {
    const store = await create();

    expect(store.messages()).toHaveLength(3);
    expect(store.unread().map((existing) => existing.id)).toEqual(['m1', 'm3']);
    expect(store.unreadCount()).toBe(2);
  });

  it('requests nothing for anybody else', async () => {
    isAdmin.set(false);
    const store = await create();

    expect(useCase.getMessages).not.toHaveBeenCalled();
    expect(store.messages()).toEqual([]);
  });

  it('drops the messages on sign-out', async () => {
    const store = await create();

    isAdmin.set(false);
    await settle();

    expect(store.messages()).toEqual([]);
  });

  it('updates the unread count when a message is marked as read', async () => {
    const store = await create();

    await store.setRead('m1', true);

    expect(store.unreadCount()).toBe(1);
  });

  it('removes a deleted message from the list', async () => {
    const store = await create();

    await store.deleteMessage('m3');

    expect(store.messages().map((existing) => existing.id)).toEqual(['m1', 'm2']);
  });

  it('keeps the list and reports the failure when a write fails', async () => {
    useCase.setRead.mockReturnValue(throwError(() => new Failure('server', 'Broken')));
    const store = await create();

    expect(await store.setRead('m1', true)).toBeUndefined();

    expect(store.mutationState().failure?.kind).toBe('server');
    expect(store.unreadCount()).toBe(2);
  });

  it('stays successful while a loaded list reloads, and keeps a write made meanwhile', async () => {
    const store = await create();
    expect(store.messagesState().loadingState).toBe('success');
    const reload = new Subject<ReceivedMessage[]>();
    useCase.getMessages.mockReturnValue(reload);

    store.reload();
    TestBed.tick();
    expect(store.messagesState().loadingState).toBe('success');
    expect(store.messages()).toHaveLength(3);

    await store.setRead('m1', true);
    // The answer of the reload still has the message unread.
    reload.next(MESSAGES);
    reload.complete();
    await settle();

    expect(store.unreadCount()).toBe(1);
  });
});
