---
name: update-deps
description: Updates dependencies of this workspace that Dependabot leaves out. Spartan (brain, CLI and the generated helm components in packages/shared/helm-*) through a three-way merge that keeps local changes, and majors of Angular and Nx through nx migrate. Use when the user asks to update Spartan, the helm or hlm components, Angular, Nx or "the packages".
---

# Updating dependencies

Dependabot (`.github/dependabot.yml`) opens a weekly pull request for minor and patch updates of npm packages and GitHub Actions. Three things it leaves out, because an update needs more than a new version in `package.json`:

| What                                                     | How                                | Section                           |
| -------------------------------------------------------- | ---------------------------------- | --------------------------------- |
| `@spartan-ng/brain`, `@spartan-ng/cli` and the helm libs | `tools/scripts/update-spartan.mjs` | [Spartan](#spartan)               |
| Majors of Angular                                        | `pnpm nx migrate`                  | [Angular and Nx](#angular-and-nx) |
| Majors of Nx                                             | `pnpm nx migrate`                  | [Angular and Nx](#angular-and-nx) |

Before anything else:

- `git branch --show-current` must not be `main`. Create a branch first (`chore/update-spartan-1-10`)
- `git status` must be clean, so the diff of the update is the update and nothing else
- One update per branch: Spartan and an Angular major do not go into the same pull request
- pnpm only from the workspace root

## Spartan

The helm components in `packages/shared/helm-<style>/` are code the Spartan CLI generated into the repo. Spartan versions brain and helm together, so `@spartan-ng/brain`, `@spartan-ng/cli` and every helm lib always move to the same version at once. `spartan.json` in each helm lib names the CLI version that generated it.

Regenerating would overwrite local changes to the components. `update-spartan.mjs` merges instead: it generates the components with the old CLI (base) and with the new one (next), formats base, lib and next with Prettier and runs `git merge-file` per file. Spartan's changes are taken over, local changes stay, and where both changed the same lines the file gets conflict markers. Details in `docs/libs/helm.md` ("Updating Spartan").

### 1. Versions and release notes

```bash
cat packages/shared/helm-*/spartan.json
pnpm view @spartan-ng/cli version
```

`spartan.json` and the installed `@spartan-ng/cli` (`node_modules/@spartan-ng/cli/package.json`) must match. If they don't, someone bumped the CLI without the components. The script still works, it takes the base from `spartan.json`, but say so to the user.

Read the release notes of every version between the two, e.g. `gh release list -R spartan-ng/spartan` and `gh release view <tag> -R spartan-ng/spartan`. Note for the user:

- breaking changes of brain or helm (renamed inputs, outputs, selectors, removed components)
- migrations the release names (`pnpm nx g @spartan-ng/cli:migrate-…`)
- new peer dependencies (`pnpm view @spartan-ng/brain@<version> peerDependencies`), e.g. a newer `@angular/cdk`

Tell the user what you found and which version you will update to before running anything that changes files.

### 2. Local changes before the update (optional)

```bash
node tools/scripts/update-spartan.mjs --customizations
```

Lists every file of the helm libs that differs from what the CLI in `spartan.json` generates. Nothing is changed. Useful to know beforehand where conflicts can come from.

### 3. Update

```bash
node tools/scripts/update-spartan.mjs <version>
```

Without a version it takes the latest. It runs about 3 to 4 minutes (one `nx g` per component and version), so start it in the background. It installs brain and CLI at the new version, merges every helm lib, writes the new version into `spartan.json` and prints per lib:

- **Changed**: files with changes from Spartan
- **Local changes kept**: files that differed from the base and were merged
- **Added / Removed by Spartan**: new or dropped files of existing components
- **Notes**: files deleted locally (left out) or not from Spartan (kept)
- **CONFLICTS**: exit code 1
- **Available in Spartan but not in the lib**: new components, not added

Look at `git diff package.json` afterwards: the CLI adds the packages the new components import (1.10 added `cn`, which replaces `clsx` and `tailwind-merge`). Check each new package (`pnpm view <name> repository.url maintainers`) and name it to the user.

If the script fails, it restores `package.json` and `pnpm-lock.yaml`. It also stops when the new CLI cannot generate a component the old one generated, instead of deleting it from the lib. With `--keep` it leaves `packages/.spartan-update/<style>/{base,ours,next}` for inspection. Delete that folder before committing, it is not in `.gitignore` (the CLI skips ignored files when it applies the style).

### 4. Conflicts

A conflict means Spartan and a local change touched the same lines. For each one:

1. Show the user both sides (`<<<<<<< local` … `=======` … `>>>>>>> spartan`) and the reason of the local change. A `// custom: <reason>` comment above it names it, otherwise `git log -p` of the file
2. Propose a resolution: usually Spartan's new version with the local change applied again. Ask when the intent of the local change is unclear or Spartan's change makes it unnecessary
3. Resolve, then check that no marker is left:

```bash
grep -rn '^<<<<<<<\|^>>>>>>>' packages/shared/helm-*
```

"Removed by Spartan, changed locally" is a conflict too: the file is still there. Find what replaced it in the release notes and move the local change there, or keep the file as an own file if the user wants that.

### 5. Migrations of the wrappers

The wrappers in `packages/shared/ui` use the helm components and brain. Breaking changes land there:

```bash
pnpm nx g @spartan-ng/cli:healthcheck
```

lists outdated code without changing it (it asks whether to fix and gets "no" without a terminal). Never run it with `--autoFix`, it rewrites the whole workspace. Known false alarms in this workspace:

- **Scaffold integrity** ("… was never generated") always fails: it looks for a tsconfig path per component, the workspace has only the wildcard `@spartan-ng/helm/*`
- **Helm input id rename** (1.10) matches `<hlm-radio-group [id]="…">` because its pattern finds `hlm-radio` in `hlm-radio-group`. The group has no renamed input, the wrappers already use `inputId` on checkbox, switch and radio. Its fix would break `form-radio-group`

Check every other failed check by hand: search the code the check names, then run the matching `pnpm nx g @spartan-ng/cli:migrate-…` generator from the release notes. Afterwards `git diff --stat packages/shared/helm-*` must show only what step 3 and 4 changed: a migration that rewrites helm files means the merge is lost, revert those files.

### 6. Checks

```bash
pnpm format:check
pnpm nx affected -t lint typecheck test build
```

Then look at `/showcase/components` of `angular-base` in the browser (dev server through `preview_start`), light and dark: every wrapper is there. Changed classes or structure of the components are visual changes, so run the agents `ui-ux-reviewer` and `a11y-reviewer` on `packages/shared/ui` when the release notes or the diff touch styles, focus or ARIA.

### 7. Commit

One commit, `chore(deps): update spartan to <version>`, with `package.json`, `pnpm-lock.yaml`, the helm libs with their `spartan.json` and the migrated wrappers. If the user resolved conflicts or a component looks different, say so in the body. Use the `commit` skill.

## Angular and Nx

Majors of `@angular/*`, `@angular-devkit/*`, `@schematics/angular`, `nx` and `@nx/*` go through `nx migrate`, which also runs the code migrations of the packages. Check the flags with `pnpm nx migrate --help` first.

```bash
pnpm nx migrate latest          # or a version: nx@23.1.0, @angular/core@23.0.0
pnpm install
pnpm nx migrate --run-migrations
```

1. Before: read the update guide (https://angular.dev/update-guide for Angular) and tell the user what changes
2. `nx migrate` writes `package.json` and `migrations.json`. Look at both before `--run-migrations` and tell the user about migrations that touch many files
3. After the run: delete `migrations.json`, then the checks of step 6 above. Generated code in `packages/shared/helm-*` must stay untouched, revert it if a migration changed it
4. Spartan's peer dependencies (`@angular/cdk`, `@angular/core`) may not allow the new major yet: `pnpm install` warns. Then update Spartan first or wait for a release that supports it
5. Rules in `CLAUDE.md` that name versions ("Angular v22+") get the new version where it matters. The `docs-sync` agent checks the docs
6. Commit: `chore(deps): update angular to <version>` or `chore(deps): update nx to <version>`

## What this skill does not do

- Minor and patch updates: Dependabot's pull request. Review it, run the checks, merge
- Pushing, opening pull requests, releasing: only when the user asks
