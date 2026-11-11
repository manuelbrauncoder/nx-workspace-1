# vyte-contracts

The wire format between `vyte-api` and the vyte web app: the limits of events and guests, and the schemas of the event and guest routes. Like `contracts`, it imports nothing but `zod`.

| Item    | Value                                                                 |
| ------- | --------------------------------------------------------------------- |
| Folder  | [packages/vyte/contracts](../../packages/vyte/contracts/src)          |
| Alias   | `@vyte/contracts/*`, e.g. `@vyte/contracts/events-limits`             |
| Tags    | `type:contract`, `scope:vyte`                                         |
| Used by | `vyte-api` (events, guests, guest links), `vyte-web` once it is built |

## Contents

| File               | What it holds                                                                                                                                                                                                                                                                                                                                                               |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events-limits.ts` | `EVENT_TITLE_MAX_LENGTH`, `EVENT_DESCRIPTION_MAX_LENGTH`, `EVENT_LOCATION_NAME_MAX_LENGTH`, `EVENT_ADDRESS_MAX_LENGTH`, `SAVE_THE_DATE_NOTE_MAX_LENGTH`, `EVENT_IMAGES_MAX`, `EVENT_EDITORS_MAX`, without Zod                                                                                                                                                               |
| `guests-limits.ts` | `GUEST_NAME_MAX_LENGTH`, `GUEST_NOTE_MAX_LENGTH`, `GUEST_MESSAGE_MAX_LENGTH`, `GUEST_COMPANIONS_MAX`, `EVENT_GUESTS_MAX`, `GUESTS_BULK_MAX`, without Zod                                                                                                                                                                                                                    |
| `events.ts`        | Zod schemas of the event routes: create and update input, the image order, the params, the responses (`eventSchema` with `role`, `past`, `images`, `counts`), the types `*Dto` and `*Input`, plus `isTimeZone()` and `eventTimesError()`. `eventCountsSchema` is the guest list in numbers, see section 5 of the [specification](../vyte/spec.md#5-guest-list-overview)     |
| `guests.ts`        | Zod schemas of the guest routes for the hosts (`guestSchema` with the token, `companionsReduced`, the bulk and host answer inputs) and of the public guest link (`rsvpSchema`, `invitationSchema`: the event without guest list, the own guest, or only the title once the event is past), the types `*Dto` and `*Input`. `tokenSchema` checks the 43 characters of a token |

The numbers come from section 3 of the [specification](../vyte/spec.md#3-domain-model). `events.ts` imports the limits from `events-limits.ts`, `guests.ts` from `guests-limits.ts`. As in [dartomat-contracts](dartomat-contracts.md), the web app will import only the types from the schema files and the constants from the limits, so Zod stays out of its bundle.

Only projects with `scope:vyte` may import this lib.
