# portfolio-contracts

The wire format between `portfolio-api` and `portfolio-web`: the schemas of the portfolio content, the media, the contact messages and the legal pages. Like `contracts`, it imports nothing but `zod`.

| Item    | Value                                                                  |
| ------- | ---------------------------------------------------------------------- |
| Folder  | [packages/portfolio/contracts](../../packages/portfolio/contracts/src) |
| Alias   | `@portfolio/contracts/*`, e.g. `@portfolio/contracts/media`            |
| Tags    | `type:contract`, `scope:portfolio`                                     |
| Used by | `portfolio-api`, `portfolio-web`                                       |

## Contents

| File           | What it holds                                                                   |
| -------------- | ------------------------------------------------------------------------------- |
| `portfolio.ts` | Section keys, languages, input, update and output schemas of the start page     |
| `media.ts`     | The media schema; `MediaDto` and response wrappers                              |
| `contact.ts`   | Send, update and message schemas; `SendMessageDto`, `ContactMessageDto`, …      |
| `legal.ts`     | Page keys, input, update and output schemas; `LegalPageDto`, `LegalPagesDto`, … |

The sections of the start page are built with a helper that types them as `z.ZodType`, so no DTO types can be derived for them. `portfolio-web` keeps its hand-written `portfolio.dto.ts` for those. Only projects with `scope:portfolio` may import this lib.
