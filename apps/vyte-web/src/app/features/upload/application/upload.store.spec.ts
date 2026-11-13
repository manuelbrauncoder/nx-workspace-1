import { ApplicationRef, PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Failure } from '@core/failure/failure';
import { Observable, of, Subject, throwError } from 'rxjs';
import { OwnPhoto, Upload, UploadLink } from '../domain/upload';
import { UploadUseCase } from '../domain/upload.usecase';
import { UploadStore } from './upload.store';

const STAND: UploadLink = { kind: 'stand', token: 'tok' };
const GUEST: UploadLink = { kind: 'guest', token: 'tok' };

const own = (id: string): OwnPhoto => ({
  id,
  width: 1600,
  height: 900,
  createdAt: new Date('2027-03-14T18:00:00.000Z'),
});

const upload = (left: number, photos: OwnPhoto[] = []): Upload => ({
  eventTitle: 'Sommerfest',
  guestName: null,
  photos,
  limit: 5,
  left,
  open: true,
  opensAt: new Date('2027-03-14T08:00:00.000Z'),
  closesAt: new Date('2027-03-16T08:00:00.000Z'),
});

const photo = (name: string, type = 'image/jpeg') => new File(['x'], name, { type });

/** An upload the test finishes by hand, so it can look at what runs in between. */
interface Pending {
  file: File;
  name: string;
  subject: Subject<Upload>;
}

class FakeUploadUseCase {
  calls: string[] = [];
  initial = upload(5);
  failGet: Error | undefined;
  pending: Pending[] = [];
  deleteResult: Observable<Upload> = of(upload(5));

  registerDevice(token: string): Observable<void> {
    this.calls.push(`registerDevice:${token}`);
    return of(undefined);
  }

  get(link: UploadLink): Observable<Upload> {
    this.calls.push(`get:${link.kind}`);
    return this.failGet ? throwError(() => this.failGet) : of(this.initial);
  }

  upload(_link: UploadLink, file: File, name: string): Observable<Upload> {
    const subject = new Subject<Upload>();
    this.calls.push(`upload:${file.name}`);
    this.pending.push({ file, name, subject });
    return subject;
  }

  deletePhoto(): Observable<Upload> {
    return this.deleteResult;
  }

  photoUrl(link: UploadLink, id: string): string {
    return `https://api.example.com/${link.kind}/${link.token}/photos/${id}`;
  }
}

describe('UploadStore', () => {
  let useCase: FakeUploadUseCase;
  let createObjectURL: ReturnType<typeof vi.fn>;
  let revokeObjectURL: ReturnType<typeof vi.fn>;

  const settle = () => TestBed.inject(ApplicationRef).whenStable();

  async function create(link: UploadLink = STAND, platform = 'browser') {
    TestBed.configureTestingModule({
      providers: [
        { provide: UploadUseCase, useValue: useCase },
        { provide: PLATFORM_ID, useValue: platform },
        UploadStore,
      ],
    });
    const store = TestBed.inject(UploadStore);
    store.select(link);
    await settle();
    return store;
  }

  /** Resolves the oldest unfinished upload with `answer`. */
  const finish = async (answer: Upload) => {
    const next = useCase.pending.shift()!;
    next.subject.next(answer);
    next.subject.complete();
    await settle();
  };
  const fail = async (failure: Failure) => {
    useCase.pending.shift()!.subject.error(failure);
    await settle();
  };
  const states = (store: UploadStore) => store.queue().map((item) => item.state);

  beforeEach(() => {
    useCase = new FakeUploadUseCase();
    let count = 0;
    createObjectURL = vi.fn(() => `blob:preview-${count++}`);
    revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }));
  });
  afterEach(() => vi.restoreAllMocks());

  describe('loading', () => {
    it('registers the device before it reads the page at the stand in the browser', async () => {
      const store = await create(STAND);

      expect(useCase.calls).toEqual(['registerDevice:tok', 'get:stand']);
      expect(store.uploadState().loadingState).toBe('success');
      expect(store.upload()?.left).toBe(5);
    });

    it('does not register a device on the server', async () => {
      const store = await create(STAND, 'server');

      expect(useCase.calls).toEqual(['get:stand']);
      expect(store.upload()).toBeDefined();
    });

    it('does not register a device for a guest page', async () => {
      await create(GUEST);

      expect(useCase.calls).toEqual(['get:guest']);
    });

    it('reports a failed load', async () => {
      useCase.failGet = new Failure('not-found', 'Nope');
      const store = await create();

      expect(store.uploadState().failure?.kind).toBe('not-found');
      expect(store.upload()).toBeUndefined();
      expect(store.free()).toBe(0);
    });

    it('builds the address of an own photo for the selected link', async () => {
      const store = await create(GUEST);

      expect(store.photoUrl('p1')).toBe('https://api.example.com/guest/tok/photos/p1');
    });

    it('has no photo address before a link is selected', () => {
      TestBed.configureTestingModule({
        providers: [{ provide: UploadUseCase, useValue: useCase }, UploadStore],
      });

      expect(TestBed.inject(UploadStore).photoUrl('p1')).toBeUndefined();
    });
  });

  describe('add', () => {
    it('queues the accepted files and gives back what was left out', async () => {
      useCase.initial = upload(2);
      const store = await create();

      const picked = store.add(
        [photo('a.jpg'), photo('b.gif', 'image/gif'), photo('c.jpg'), photo('d.jpg')],
        'Ada',
      );

      expect(picked.accepted.map((file) => file.name)).toEqual(['a.jpg', 'c.jpg']);
      expect(picked.wrongType.map((file) => file.name)).toEqual(['b.gif']);
      expect(picked.overLimit.map((file) => file.name)).toEqual(['d.jpg']);
      expect(store.queue().map((item) => item.file.name)).toEqual(['a.jpg', 'c.jpg']);
      expect(store.queue().map((item) => item.preview)).toEqual([
        'blob:preview-0',
        'blob:preview-1',
      ]);
    });

    it('queues nothing and uploads nothing when no file is accepted', async () => {
      const store = await create();

      store.add([photo('a.gif', 'image/gif')], '');

      expect(store.queue()).toEqual([]);
      expect(store.batch()).toEqual({ total: 0, done: 0 });
      expect(useCase.pending).toEqual([]);
      expect(createObjectURL).not.toHaveBeenCalled();
    });

    it('sends the name with every photo', async () => {
      const store = await create();

      store.add([photo('a.jpg')], 'Ada');

      expect(useCase.pending[0]!.name).toBe('Ada');
    });

    it('uploads strictly one after the other', async () => {
      const store = await create();

      store.add([photo('a.jpg'), photo('b.jpg'), photo('c.jpg')], '');

      expect(useCase.calls.filter((call) => call.startsWith('upload'))).toEqual(['upload:a.jpg']);
      expect(states(store)).toEqual(['uploading', 'waiting', 'waiting']);

      await finish(upload(4, [own('p1')]));
      await vi.waitFor(() =>
        expect(useCase.calls.filter((call) => call.startsWith('upload'))).toEqual([
          'upload:a.jpg',
          'upload:b.jpg',
        ]),
      );
      expect(states(store)).toEqual(['uploading', 'waiting']);

      await finish(upload(3, [own('p1'), own('p2')]));
      await vi.waitFor(() => expect(useCase.pending).toHaveLength(1));
      expect(useCase.calls.at(-1)).toBe('upload:c.jpg');
    });

    it('joins photos added while the queue runs to the same run', async () => {
      const store = await create();

      store.add([photo('a.jpg')], '');
      store.add([photo('b.jpg')], '');

      expect(useCase.pending).toHaveLength(1);
      expect(store.batch()).toEqual({ total: 2, done: 0 });
      await finish(upload(4, [own('p1')]));
      await vi.waitFor(() => expect(useCase.pending).toHaveLength(1));
      expect(useCase.pending[0]!.file.name).toBe('b.jpg');
    });

    it('replaces the upload with every answer and removes the item from the queue', async () => {
      const store = await create();
      store.add([photo('a.jpg'), photo('b.jpg')], '');

      await finish(upload(4, [own('p1')]));

      expect(store.upload()?.left).toBe(4);
      expect(store.upload()?.photos.map((item) => item.id)).toEqual(['p1']);
      expect(store.queue().map((item) => item.file.name)).toEqual(['b.jpg']);
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-0');
    });

    it('counts the batch and keeps the last count after the queue is empty', async () => {
      const store = await create();
      store.add([photo('a.jpg'), photo('b.jpg')], '');
      expect(store.batch()).toEqual({ total: 2, done: 0 });

      await finish(upload(4, [own('p1')]));
      await vi.waitFor(() => expect(store.batch()).toEqual({ total: 2, done: 1 }));

      await finish(upload(3, [own('p1'), own('p2')]));
      // Kept, so "2 of 2" is told after the last photo.
      await vi.waitFor(() => expect(store.batch()).toEqual({ total: 2, done: 2 }));
      expect(store.queue()).toEqual([]);
    });

    it('starts a new batch with the next choice', async () => {
      const store = await create();
      store.add([photo('a.jpg')], '');
      await finish(upload(4, [own('p1')]));
      await vi.waitFor(() => expect(store.batch()).toEqual({ total: 1, done: 1 }));

      store.add([photo('b.jpg')], '');

      expect(store.batch()).toEqual({ total: 1, done: 0 });
    });
  });

  describe('free', () => {
    it('is what is left minus the photos that are waiting or uploading', async () => {
      useCase.initial = upload(4);
      const store = await create();
      expect(store.free()).toBe(4);

      store.add([photo('a.jpg'), photo('b.jpg')], '');

      expect(store.free()).toBe(2);
    });

    it('does not count a failed photo', async () => {
      useCase.initial = upload(2);
      const store = await create();
      store.add([photo('a.jpg'), photo('b.jpg')], '');
      expect(store.free()).toBe(0);

      await fail(new Failure('server', 'Boom'));
      await vi.waitFor(() => expect(states(store)).toEqual(['failed', 'uploading']));

      expect(store.free()).toBe(1);
      await fail(new Failure('server', 'Boom'));
      await vi.waitFor(() => expect(states(store)).toEqual(['failed', 'failed']));
      expect(store.free()).toBe(2);
    });

    it('is never below 0', async () => {
      useCase.initial = upload(0);
      const store = await create();

      expect(store.free()).toBe(0);
      const picked = store.add([photo('a.jpg')], '');
      expect(picked.overLimit).toHaveLength(1);
      expect(store.queue()).toEqual([]);
    });
  });

  describe('a failure', () => {
    it('keeps the item as failed with its failure and goes on with the next', async () => {
      const store = await create();
      store.add([photo('a.jpg'), photo('b.jpg')], '');

      await fail(new Failure('conflict', 'Window closed'));
      await vi.waitFor(() => expect(states(store)).toEqual(['failed', 'uploading']));

      expect(store.queue()[0]!.failure?.kind).toBe('conflict');
      expect(store.upload()?.left).toBe(5);
      expect(store.batch()).toEqual({ total: 2, done: 0 });
      expect(useCase.pending[0]!.file.name).toBe('b.jpg');
    });

    it('keeps the batch while a failed item stays in the queue', async () => {
      const store = await create();
      store.add([photo('a.jpg')], '');

      await fail(new Failure('network', 'Offline'));

      expect(states(store)).toEqual(['failed']);
      expect(store.batch()).toEqual({ total: 1, done: 0 });
    });
  });

  describe('retry', () => {
    it('runs a failed item again with the given name and clears its failure', async () => {
      const store = await create();
      store.add([photo('a.jpg')], '');
      await fail(new Failure('network', 'Offline'));
      await vi.waitFor(() => expect(states(store)).toEqual(['failed']));

      store.retry(store.queue()[0]!.id, 'Ada');

      expect(states(store)).toEqual(['uploading']);
      expect(store.queue()[0]!.failure).toBeUndefined();
      expect(useCase.pending[0]!.name).toBe('Ada');

      await finish(upload(4, [own('p1')]));
      expect(store.queue()).toEqual([]);
      expect(store.upload()?.left).toBe(4);
    });

    it('fails again when the retry fails', async () => {
      const store = await create();
      store.add([photo('a.jpg')], '');
      await fail(new Failure('network', 'Offline'));
      await vi.waitFor(() => expect(states(store)).toEqual(['failed']));

      store.retry(store.queue()[0]!.id, '');
      await fail(new Failure('server', 'Boom'));

      expect(states(store)).toEqual(['failed']);
      expect(store.queue()[0]!.failure?.kind).toBe('server');
    });
  });

  describe('discard', () => {
    it('drops the item, revokes its object URL and resets an empty batch', async () => {
      const store = await create();
      store.add([photo('a.jpg')], '');
      await fail(new Failure('network', 'Offline'));
      await vi.waitFor(() => expect(states(store)).toEqual(['failed']));
      const { id, preview } = store.queue()[0]!;

      store.discard(id);

      expect(store.queue()).toEqual([]);
      expect(revokeObjectURL).toHaveBeenCalledWith(preview);
      expect(store.batch()).toEqual({ total: 0, done: 0 });
    });

    it('keeps the counts of the other photos of the batch', async () => {
      const store = await create();
      store.add([photo('a.jpg'), photo('b.jpg')], '');
      await fail(new Failure('network', 'Offline'));
      await vi.waitFor(() => expect(states(store)).toEqual(['failed', 'uploading']));

      store.discard(store.queue()[0]!.id);

      expect(store.queue().map((item) => item.file.name)).toEqual(['b.jpg']);
      expect(store.batch()).toEqual({ total: 1, done: 0 });
    });

    it('ignores an unknown id', async () => {
      const store = await create();

      store.discard(99);

      expect(revokeObjectURL).not.toHaveBeenCalled();
    });
  });

  describe('deletePhoto', () => {
    it('replaces the upload with the answer', async () => {
      useCase.initial = upload(3, [own('p1'), own('p2')]);
      useCase.deleteResult = of(upload(4, [own('p2')]));
      const store = await create();

      expect(await store.deletePhoto('p1')).toBe(true);

      expect(store.upload()?.photos.map((item) => item.id)).toEqual(['p2']);
      expect(store.upload()?.left).toBe(4);
    });

    it('puts a failure in deleteState and keeps the photos', async () => {
      useCase.initial = upload(4, [own('p1')]);
      useCase.deleteResult = throwError(() => new Failure('not-found', 'Gone'));
      const store = await create();

      expect(await store.deletePhoto('p1')).toBe(false);

      expect(store.deleteState().failure?.kind).toBe('not-found');
      expect(store.upload()?.photos).toHaveLength(1);
    });

    it('is reset by select()', async () => {
      useCase.deleteResult = throwError(() => new Failure('server', 'Boom'));
      const store = await create();
      await store.deletePhoto('p1');
      expect(store.deleteState().failure).toBeDefined();

      store.select(GUEST);

      expect(store.deleteState().loadingState).toBe('idle');
    });

    it('does nothing without a selected link', async () => {
      TestBed.configureTestingModule({
        providers: [{ provide: UploadUseCase, useValue: useCase }, UploadStore],
      });

      expect(await TestBed.inject(UploadStore).deletePhoto('p1')).toBe(false);
    });
  });

  it('revokes the previews that are left when the store is destroyed', async () => {
    const store = await create();
    store.add([photo('a.jpg'), photo('b.jpg')], '');

    TestBed.resetTestingModule();

    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-0');
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:preview-1');
  });
});
