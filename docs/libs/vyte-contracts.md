# vyte-contracts

The wire format between `vyte-api` and the vyte web app: the limits of events and guests so far, and the schemas of the features to come. Like `contracts`, it imports nothing but `zod`.

| Item    | Value                                                          |
| ------- | -------------------------------------------------------------- |
| Folder  | [packages/vyte/contracts](../../packages/vyte/contracts/src)   |
| Alias   | `@vyte/contracts/*`, e.g. `@vyte/contracts/events-limits`      |
| Tags    | `type:contract`, `scope:vyte`                                  |
| Used by | none yet, `vyte-api` and `vyte-web` once their features use it |

## Contents

| File               | What it holds                                                                                                                                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `events-limits.ts` | `EVENT_TITLE_MAX_LENGTH`, `EVENT_DESCRIPTION_MAX_LENGTH`, `EVENT_LOCATION_NAME_MAX_LENGTH`, `EVENT_ADDRESS_MAX_LENGTH`, `SAVE_THE_DATE_NOTE_MAX_LENGTH`, `EVENT_IMAGES_MAX`, `EVENT_EDITORS_MAX`, without Zod |
| `guests-limits.ts` | `GUEST_NAME_MAX_LENGTH`, `GUEST_NOTE_MAX_LENGTH`, `GUEST_MESSAGE_MAX_LENGTH`, `GUEST_COMPANIONS_MAX`, `EVENT_GUESTS_MAX`, `GUESTS_BULK_MAX`, without Zod                                                      |

The numbers come from section 3 of the [specification](../vyte/spec.md#3-domain-model). The schemas for requests and responses are not written yet, they follow with the features. As in [dartomat-contracts](dartomat-contracts.md), the web app will import only the types from the schema files and the constants from the limits, so Zod stays out of its bundle.

Only projects with `scope:vyte` may import this lib.
