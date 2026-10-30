# State management

State lives in plain signals. There is no state library and no store base class. Each feature has one store that reads through `rxResource`, writes through `mutation()` and exposes every asynchronous operation in the same shape, `AsyncState`.

The building blocks are in [packages/shared/core/src/state/](../../packages/shared/core/src/state). The reference store is [notes.store.ts](../../apps/angular-base/src/app/features/notes/application/notes.store.ts).

## `AsyncState`

Every read and every write is described by the same two fields:

[packages/shared/core/src/state/async-state.ts](../../packages/shared/core/src/state/async-state.ts)

```ts
export type LoadingState = 'idle' | 'loading' | 'success' | 'failure';

export interface AsyncState {
  loadingState: LoadingState;
  /** Set exactly when `loadingState` is `'failure'`. */
  failure: Failure | undefined;
}
```

Create states only through `idle()`, `loading()`, `success()` and `failed(failure)`. These helpers keep the two fields consistent, so there is never a `'success'` that carries a failure.

Because every operation looks the same, the template side is the same everywhere too: one component, `app-async-content`, renders any `AsyncState`. See [Error handling](error-handling.md#showing-failures).

## A store

A store is a service that is not provided in root. It is listed in the `providers` of the feature routes, so it is created with the feature and its state is gone when the user leaves:

```ts
@Service({ autoProvided: false })
export class NotesStore {
  private readonly _useCase = inject(NotesUseCase);
  // ...
}
```

```ts
// notes.routes.ts
providers: [NotesUseCase, NotesStore],
```

A store uses only the `domain` layer of its feature. It never sees HTTP, DTOs or the repository.

### Reading

Reads are resources. `asyncState(resource)` derives the `AsyncState` from the resource status:

```ts
private readonly _list = rxResource({
  stream: () => this._useCase.getAll(),
  defaultValue: [] as Note[],
});

private readonly _selectedId = signal<string | undefined>(undefined);
private readonly _detail = rxResource({
  params: () => this._selectedId(),
  stream: ({ params: id }) => this._useCase.getById(id),
});

// Reading `value()` of a failed resource throws, hence the `hasValue()` guards.
readonly notes = computed(() => (this._list.hasValue() ? this._list.value() : []));
readonly isEmpty = computed(() => this.notes().length === 0);
readonly listState = asyncState(this._list);

readonly selected = computed(() => (this._detail.hasValue() ? this._detail.value() : undefined));
readonly detailState = asyncState(this._detail);
```

Points to note:

- Resources stay private. The store hands out readonly signals and `computed` values, so components cannot write to the state
- `value()` of a resource in the error state throws. Always guard it with `hasValue()`
- A resource with `params` loads when the params change and stays `idle` while they are `undefined`. `select(id)` only sets a signal, the resource does the rest
- `asyncState()` maps `reloading` to `loading`

### Writing

Writes are `async` methods that send their operation through a `Mutation`:

[packages/shared/core/src/state/mutation.ts](../../packages/shared/core/src/state/mutation.ts)

```ts
export interface Mutation {
  readonly state: Signal<AsyncState>;
  /** Runs a write. Resolves with its result, or with `undefined` when it failed. */
  run<T>(operation: Observable<T>): Promise<T | undefined>;
  /** Back to `idle`, e.g. to drop the failure of an earlier write. */
  reset(): void;
}
```

`run()` sets the state to `loading`, awaits the observable, and ends in `success` or `failure`. It does not throw. A failed write resolves with `undefined` and the failure is in `state`. That is why a store contains no `try/catch`:

```ts
private readonly _mutation = mutation();

/** State of the most recent create, update or delete. */
readonly mutationState = this._mutation.state;

async create(draft: NoteDraft): Promise<Note | undefined> {
  const note = await this._mutation.run(this._useCase.create(draft));
  if (note) {
    patchResource(this._list, (notes) => [note, ...notes]);
  }
  return note;
}
```

The caller gets the result back and decides what happens next:

[apps/angular-base/src/app/features/notes/presentation/note-editor/note-editor.ts](../../apps/angular-base/src/app/features/notes/presentation/note-editor/note-editor.ts)

```ts
private async _save(): Promise<void> {
  const id = this.id();
  const draft = this._draft();
  const saved = id ? await this._store.update(id, draft) : await this._store.create(draft);
  if (saved) {
    this._toast.success('Notiz gespeichert');
    await this._router.navigate(['/notes']);
  }
}
```

An operation without a result needs a value to tell success from failure, since both would be `undefined`. Map it to `true`:

```ts
async remove(id: string): Promise<boolean> {
  const removed = await this._mutation.run(this._useCase.delete(id).pipe(map(() => true)));
  // ...
  return removed ?? false;
}
```

### One mutation or several

A store normally has one `mutation()` and exposes its state as `mutationState`. The state then describes the most recent write, which is enough when only one write runs at a time, as with a form that is submitted.

Writes that can run in parallel and must not overwrite each other's state each get their own `mutation()`, for example a background autosave next to an explicit delete. `NotesStore` keeps one for images (`imageMutationState`): they are uploaded after the note itself, and a failed upload must not hide that the note was saved.

Call `reset()` when an old failure should no longer be shown. `NotesStore.select()` does this, so a failed save does not reappear when the user opens another note.

### Updating the list after a write

After a successful write, update the loaded data locally instead of fetching it again:

[packages/shared/core/src/state/patch-resource.ts](../../packages/shared/core/src/state/patch-resource.ts)

```ts
export function patchResource<T>(resource: WritableResource<T>, change: (value: T) => T): void {
  const status = resource.status();
  if (status === 'resolved' || status === 'local') {
    resource.update(change);
  } else {
    resource.reload();
  }
}
```

`patchResource()` applies the change only when the resource holds loaded data. Writing to a resource that is still loading would cancel that load, so in every other state it reloads instead. Use it for every local update of a list:

```ts
patchResource(this._list, (notes) => notes.filter((note) => note.id !== id));
```

The change function must be pure and return a new array. Signals are never mutated in place.

### Waiting for data before a page opens

Normally a page opens at once and `app-async-content` shows a spinner. When the content must be there the moment the page opens, a route guard can wait for it with `settled(resource, injector)` ([settled.ts](../../packages/shared/core/src/state/settled.ts)), which resolves once the resource is no longer loading, whether it failed or not. In `portfolio-web` `PortfolioStore.load()` uses it, so the router finds the section of a `/#projects` link. Route providers outlive the page, so such a store loads again on every visit and keeps the old data on screen while it does.

## In the component

Components inject the store, read its signals and call its methods. They hold no copy of the store's state.

[apps/angular-base/src/app/features/notes/presentation/notes-list/notes-list.html](../../apps/angular-base/src/app/features/notes/presentation/notes-list/notes-list.html)

<!-- prettier-ignore -->
```html
@if (_store.mutationState().failure; as failure) {
  <app-failure-alert class="mt-6" [failure]="failure" heading="Die Aktion ist fehlgeschlagen" />
}

<app-async-content
  [state]="_store.listState()"
  (retry)="_store.reload()"
  failureHeading="Die Notizen konnten nicht geladen werden"
  loadingIndicator="skeleton"
  retryable
>
  <ng-template>
    @for (note of _store.notes(); track note.id) {
      <li><app-note-card [note]="note" (remove)="_remove(note.id)" /></li>
    }
  </ng-template>
</app-async-content>
```

Derived values for a single component, such as "is the save button busy", are a `computed` in that component:

```ts
private readonly _saving = computed(() => this._store.mutationState().loadingState === 'loading');
```

## Rules in short

- One store per feature, `@Service({ autoProvided: false })`, provided in the feature routes
- Read with `rxResource`, expose `asyncState(resource)` and guarded `computed` values
- Write with `async` methods through `mutation().run()`, no `try/catch` in the store
- After a successful write call `patchResource()` instead of reloading
- Create `AsyncState` values only through `idle()`, `loading()`, `success()`, `failed()`
- Use `set` and `update` on signals, never mutate their value
- No store base class. Shared behavior becomes a function in `packages/shared/core/src/state/`
