# API and runtime config

How the app talks to a backend: the API layer in `apps/angular-base/src/api`, and the runtime config that tells it where the backend is.

## The API layer

`apps/angular-base/src/api` stands on its own. It knows `core`, but no feature, and it is the only place in the project that makes HTTP calls. Each backend resource gets a folder with four parts:

| File                  | Role                                                     |
| --------------------- | -------------------------------------------------------- |
| `note.dto.ts`         | DTO: the wire format, types from `@contracts/notes`      |
| `note.ts`             | Model: what the app works with                           |
| `note-dto.mapper.ts`  | Mapper: translates between the two, in both directions   |
| `notes.repository.ts` | Repository: the HTTP calls. Hands out models, never DTOs |

### DTO and model

Keeping the two apart means a change in the wire format stops at the mapper. In `notes` the differences are the timestamps, ISO strings on the wire and `Date` objects in the app, and the images, which only get their `url` in the model.

The DTO is not written by hand. The API and the app share the zod schemas of the wire format in the `contracts` lib, and `note.dto.ts` re-exports the types derived from them:

[apps/angular-base/src/api/notes/note.dto.ts](../../apps/angular-base/src/api/notes/note.dto.ts)

```ts
export type {
  NoteDraftDto,
  NoteDto,
  NoteImageDto,
  NoteImagesResponseDto,
  NoteResponseDto,
  NotesResponseDto,
} from '@contracts/notes';
```

[packages/contracts/src/notes.ts](../../packages/contracts/src/notes.ts)

```ts
export const noteSchema = z.object({
  id: z.uuid(),
  title: z.string(),
  description: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  images: z.array(noteImageSchema),
});

export type NoteDto = z.output<typeof noteSchema>;
```

- A change in the wire format is a change in `contracts`. The API validates and documents with the schema, the app gets the new type and the compiler shows every place the mapper has to follow
- Only types are imported, so Zod does not end up in the bundle. The limits the forms check (`NOTE_TITLE_MAX_LENGTH`, …) are plain constants in `@contracts/notes-limits`, re-exported by `note.ts`
- `@contracts/*` is imported in the API layer only, the rest of the app works with models. ESLint enforces it
- A resource of another backend, without a shared contract, writes its DTO by hand as an interface

[apps/angular-base/src/api/notes/note.ts](../../apps/angular-base/src/api/notes/note.ts)

```ts
export interface NoteImage {
  id: string;
  /** Address of the file on the backend. It needs the session cookie, an `<img>` sends it. */
  url: string;
  width: number;
  height: number;
  createdAt: Date;
}

export interface Note {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  images: NoteImage[];
}

/** The fields a user can edit, used for both creating and updating a note. */
export interface NoteDraft {
  title: string;
  description: string;
}
```

The limits of the backend (`NOTE_TITLE_MAX_LENGTH`, `NOTE_IMAGES_MAX`, ...) sit next to the model, so a form can report them before sending.

### Mapper

A mapper is a class that extends `DtoMapper` from [apps/angular-base/src/api/dto-mapper.ts](../../apps/angular-base/src/api/dto-mapper.ts). Both directions are mandatory, `toModel` and `toDto`. The list variants `toModels` and `toDtos` come from the base class.

[apps/angular-base/src/api/notes/note-dto.mapper.ts](../../apps/angular-base/src/api/notes/note-dto.mapper.ts)

```ts
@Service()
export class NoteDtoMapper extends DtoMapper<NoteDto, Note> {
  private readonly _config = inject(AppConfigService);

  toModel(dto: NoteDto): Note {
    return {
      id: dto.id,
      title: dto.title,
      description: dto.description,
      createdAt: new Date(dto.createdAt),
      updatedAt: new Date(dto.updatedAt),
      images: this.toImageModels(dto.id, dto.images),
    };
  }

  toDto(note: Note): NoteDto { ... }

  /** An image record does not say which note it belongs to, its address needs both ids. */
  toImageModels(noteId: string, dtos: NoteImageDto[]): NoteImage[] { ... }

  /** Creating and updating send only the editable fields. */
  toDraftDto(draft: NoteDraft): NoteDraftDto {
    return { title: draft.title.trim(), description: draft.description };
  }
}
```

Additional shapes such as the draft or the images get their own method on the same mapper.

### Repository

The repository builds its URL from the runtime config, unwraps the envelope of the response and maps it before it leaves the layer:

[apps/angular-base/src/api/notes/notes.repository.ts](../../apps/angular-base/src/api/notes/notes.repository.ts)

```ts
@Service()
export class NotesRepository {
  private readonly _http = inject(HttpClient);
  private readonly _config = inject(AppConfigService);
  private readonly _mapper = inject(NoteDtoMapper);

  private get _url(): string {
    return `${this._config.apiBaseUrl}/notes`;
  }

  getAll(): Observable<Note[]> {
    return this._http
      .get<NotesResponseDto>(this._url)
      .pipe(map((response) => this._mapper.toModels(response.notes)));
  }

  create(draft: NoteDraft): Observable<Note> {
    return this._http
      .post<NoteResponseDto>(this._url, this._mapper.toDraftDto(draft))
      .pipe(map((response) => this._mapper.toModel(response.note)));
  }

  uploadImages(id: string, files: File[]): Observable<NoteImage[]> {
    const body = new FormData();
    for (const file of files) {
      body.append('images', file, file.name);
    }
    return this._http
      .post<NoteImagesResponseDto>(`${this._urlFor(id)}/images`, body)
      .pipe(map((response) => this._mapper.toImageModels(id, response.images)));
  }
  // ...
}
```

Files go to the backend as multipart form data. A note with images is therefore saved in two steps: the note as JSON, then the files to `/notes/{id}/images`. The backend stores all files of one upload or none.

The backend describes itself at `/docs/openapi.json`.

Repositories return observables and do no error handling. Failed requests are already a `Failure` when they arrive, see [Error handling](error-handling.md).

### Adding an API resource

1. Create `apps/angular-base/src/api/<resource>/` with the DTO, the model, a mapper extending `DtoMapper` and the repository. For an endpoint of an API app of the workspace, define the schemas in `packages/contracts` and re-export their types as the DTO
2. Read the base URL from `AppConfigService.apiBaseUrl`, never hard-code it
3. Return models from every repository method
4. Add specs for the mapper and the repository, following [note-dto.mapper.spec.ts](../../apps/angular-base/src/api/notes/note-dto.mapper.spec.ts) and [notes.repository.spec.ts](../../apps/angular-base/src/api/notes/notes.repository.spec.ts)
5. Consume the repository from the use case of a feature. Features reach the API layer only through their `domain` folder, see [Architecture](architecture.md#domain)

## Runtime config

The backend URL is not part of the build. The app loads `/config/app-config.json` when it starts, so the same build runs in every environment and only the mounted file differs.

- Locally the file is [config/app-config.json](../../apps/angular-base/config/app-config.json). The build copies the `apps/angular-base/config/` folder into the output
- In a container the file is mounted over the one in the image

```json
{
  "apiBaseUrl": "http://localhost:3000",
  "environment": "local",
  "logLevel": "debug",
  "siteUrl": "http://localhost:4000",
  "allowIndexing": false
}
```

| Key             | Meaning                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `apiBaseUrl`    | Base URL of the backend. A trailing slash is removed on load                                                 |
| `environment`   | Name of the deployment, e.g. `local` or `production`                                                         |
| `logLevel`      | `debug`, `info`, `warn`, `error` or `off`. See [Logging](logging.md)                                         |
| `siteUrl`       | Public origin of the app, e.g. `https://example.com`. A trailing slash is removed on load. See [SEO](seo.md) |
| `allowIndexing` | Whether search engines may index this deployment. `true` in production only                                  |

### Reading the config

Access goes through `AppConfigService` in [packages/shared/core/src/config/app-config.ts](../../packages/shared/core/src/config/app-config.ts) only:

```ts
private readonly _config = inject(AppConfigService);

private get _url(): string {
  return `${this._config.apiBaseUrl}/notes`;
}
```

`provideAppConfig()` registers an app initializer that loads the file before the first render. Code that runs after startup can therefore read the values synchronously. The loaded file is checked by the type guard `isAppConfig`. If the file is missing or invalid, loading throws and the app does not start, which is intended: a half-configured app is worse than none.

`logLevel` is the one value that never throws. It falls back to `info` until the config is there, so logging works during startup.

### Adding a config value

1. Add the property to the `AppConfig` interface
2. Check it in the `isAppConfig` type guard and extend the error message in `load()`
3. Add a getter to `AppConfigService`
4. Add the value to `apps/angular-base/config/app-config.json` and to the config of every deployment

### Caching

The Express server serves `/config` with `Cache-Control: max-age=0, must-revalidate`, unlike the hashed assets next to it, which are cached for a year. A changed config is picked up on the next page load. The server itself reads the file once at startup, so a changed `logLevel` needs a restart to apply to server logs.
