# contracts

The wire format shared by the API apps and the Angular apps: Zod schemas of requests and responses, the DTO types derived from them, the limits both sides check and the rich text rules. Runs in Node and in the browser, so it imports nothing but `zod`.

| Item    | Value                                              |
| ------- | -------------------------------------------------- |
| Folder  | [packages/contracts](../../packages/contracts/src) |
| Alias   | `@contracts/*`, e.g. `@contracts/notes`            |
| Tags    | `type:contract`, `scope:shared`                    |
| Used by | all four apps, `ui`, `server-core`, `server-auth`  |

## Contents

| File              | What it holds                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `auth.ts`         | Sign-up, sign-in, user, role, admin update; `UserDto`, `SignInDto`, …                            |
| `notes.ts`        | Create, update, note, image, params; `NoteDto`, `NoteDraftDto`, response wrappers                |
| `notes-limits.ts` | `NOTE_TITLE_MAX_LENGTH`, `NOTE_DESCRIPTION_MAX_LENGTH`, `NOTE_IMAGE_TYPES`, without Zod          |
| `errors.ts`       | The error shape `{ error: { message, details? } }`                                               |
| `rich-text.ts`    | `RICH_TEXT_TAGS`, link `rel`/`target`, profiles `text`/`page` and their href checks, without Zod |

## Rules

- The APIs validate and document with the schemas. The Angular apps import only types (`import type`), so Zod stays out of their bundle; constants without Zod live in their own files
- In an Angular app only the API layer (`src/api`) imports `@contracts/*`, ESLint enforces it
- Relative imports inside the lib have no file ending, both bundlers resolve them
