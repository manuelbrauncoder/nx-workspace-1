# vyte-contracts

The wire format between `vyte-api` and the vyte web app: the limits of events and guests, and the schemas of the event routes. The guest schemas follow with the guests. Like `contracts`, it imports nothing but `zod`.

| Item    | Value                                                        |
| ------- | ------------------------------------------------------------ |
| Folder  | [packages/vyte/contracts](../../packages/vyte/contracts/src) |
| Alias   | `@vyte/contracts/*`, e.g. `@vyte/contracts/events-limits`    |
| Tags    | `type:contract`, `scope:vyte`                                |
| Used by | `vyte-api` (events), `vyte-web` once it is built             |

## Contents

| File               | What it holds                                                                                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `events-limits.ts` | `EVENT_TITLE_MAX_LENGTH`, `EVENT_DESCRIPTION_MAX_LENGTH`, `EVENT_LOCATION_NAME_MAX_LENGTH`, `EVENT_ADDRESS_MAX_LENGTH`, `SAVE_THE_DATE_NOTE_MAX_LENGTH`, `EVENT_IMAGES_MAX`, `EVENT_EDITORS_MAX`, without Zod                  |
| `guests-limits.ts` | `GUEST_NAME_MAX_LENGTH`, `GUEST_NOTE_MAX_LENGTH`, `GUEST_MESSAGE_MAX_LENGTH`, `GUEST_COMPANIONS_MAX`, `EVENT_GUESTS_MAX`, `GUESTS_BULK_MAX`, without Zod                                                                       |
| `events.ts`        | Zod schemas of the event routes: create and update input, the image order, the params, the responses (`eventSchema` with `role`, `past`, `images`), the types `*Dto` and `*Input`, plus `isTimeZone()` and `eventTimesError()` |

The numbers come from section 3 of the [specification](../vyte/spec.md#3-domain-model). `events.ts` imports the limits from `events-limits.ts`. As in [dartomat-contracts](dartomat-contracts.md), the web app will import only the types from the schema files and the constants from the limits, so Zod stays out of its bundle.

Only projects with `scope:vyte` may import this lib.
