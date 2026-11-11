# vyte-contracts

The contract between `vyte-api` and `vyte-web`: Zod schemas of events, guests, answers and photos, the DTO types derived from them, and their limits as plain constants. Like `contracts`, it runs in Node and in the browser and imports nothing but `zod`.

Imported through `@vyte/contracts/*`, e.g. `@vyte/contracts/events-limits`. Only the vyte apps may use it (`scope:vyte`).

Details: [docs/libs/vyte-contracts.md](../../../docs/libs/vyte-contracts.md)
