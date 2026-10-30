# portfolio-contracts

The contract between `portfolio-api` and `portfolio-web`: Zod schemas of the portfolio content, the media, the contact messages and the legal pages, and the DTO types derived from them. Like `contracts`, it runs in Node and in the browser and imports nothing but `zod`.

The sections of the start page are built with a helper that types them as `z.ZodType`, so no DTO types can be derived for them. `portfolio-web` keeps its hand-written `portfolio.dto.ts` for those.

Imported through `@portfolio/contracts/*`, e.g. `@portfolio/contracts/media`. Only the portfolio apps may use it (`scope:portfolio`).

Details: [docs/libs/portfolio-contracts.md](../../../docs/libs/portfolio-contracts.md)
