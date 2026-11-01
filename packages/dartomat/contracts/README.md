# dartomat-contracts

The contract between `dartomat-api` and `dartomat-web`: Zod schemas of a darts game (creating it, throwing a dart, the game as the API returns it) and the DTO types derived from them. Like `contracts`, it runs in Node and in the browser and imports nothing but `zod`.

Imported through `@dartomat/contracts/*`, e.g. `@dartomat/contracts/games`. Only the dartomat apps may use it (`scope:dartomat`).

Details: [docs/libs/dartomat-contracts.md](../../../docs/libs/dartomat-contracts.md)
