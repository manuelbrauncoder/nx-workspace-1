# contracts

The contract between the API apps and the Angular apps: Zod schemas of the wire format, the limits both sides check and the rich text rules. Runs in Node and in the browser, so it imports nothing but `zod`.

- The API validates requests and documents its endpoints with these schemas.
- The Angular apps take their DTO types from the exported types (`import type`), so Zod does not end up in their bundle. The limits and rich text rules are plain constants without Zod.

Imported through `@contracts/*`, e.g. `@contracts/notes`.

Details: [docs/libs/contracts.md](../../docs/libs/contracts.md)
