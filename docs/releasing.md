# Releasing

Every app has its own version, kept in its `package.json` and in Git tags `nx1-<app>-v<version>`. `nx release` works out the next version of each app from the commit messages, writes a `CHANGELOG.md` per app, commits and tags. Pushing a tag builds the Docker image of that app, see [Deployment](deployment.md).

| App                | Version file                                                                | Changelog                            |
| ------------------ | --------------------------------------------------------------------------- | ------------------------------------ |
| `angular-base`     | [apps/angular-base/package.json](../apps/angular-base/package.json)         | `apps/angular-base/CHANGELOG.md`     |
| `express-api-base` | [apps/express-api-base/package.json](../apps/express-api-base/package.json) | `apps/express-api-base/CHANGELOG.md` |
| `portfolio-web`    | [apps/portfolio-web/package.json](../apps/portfolio-web/package.json)       | `apps/portfolio-web/CHANGELOG.md`    |
| `portfolio-api`    | [apps/portfolio-api/package.json](../apps/portfolio-api/package.json)       | `apps/portfolio-api/CHANGELOG.md`    |
| `dartomat-web`     | [apps/dartomat-web/package.json](../apps/dartomat-web/package.json)         | `apps/dartomat-web/CHANGELOG.md`     |
| `dartomat-api`     | [apps/dartomat-api/package.json](../apps/dartomat-api/package.json)         | `apps/dartomat-api/CHANGELOG.md`     |
| `vyte-web`         | [apps/vyte-web/package.json](../apps/vyte-web/package.json)                 | `apps/vyte-web/CHANGELOG.md`         |
| `vyte-api`         | [apps/vyte-api/package.json](../apps/vyte-api/package.json)                 | `apps/vyte-api/CHANGELOG.md`         |

Libs have no version of their own, they are released as part of the apps that use them.

## Commit messages

Every commit follows [Conventional Commits](https://www.conventionalcommits.org):

```
<type>(<scope>): <description>
```

```
fix(dartomat-api): checkout route for 115 adds up again
feat(dartomat-web): copy the game link from the options menu
feat(ui): toggle group with a brand variant
refactor(core): split the failure interceptor
docs: deployment guide for dartomat
feat(dartomat-api)!: players are sent as objects instead of names
```

| Type                                                                          | For                                        | Next version              |
| ----------------------------------------------------------------------------- | ------------------------------------------ | ------------------------- |
| `fix`                                                                         | A bug fix                                  | patch (`1.2.3` → `1.2.4`) |
| `feat`                                                                        | A new feature                              | minor (`1.2.3` → `1.3.0`) |
| `!` after the type, or `BREAKING CHANGE:` in the body                         | A change that breaks something (see below) | major (`1.2.3` → `2.0.0`) |
| `build`, `chore`, `ci`, `docs`, `perf`, `refactor`, `revert`, `style`, `test` | Everything else                            | none                      |

- **Scope** is optional. If set, it is the name of an Nx project (`dartomat-web`, `ui`, `server-core` …) or one of `workspace`, `deps`, `ci`, `docs`, `release`. The list is in [commitlint.config.mjs](../commitlint.config.mjs)
- **Description** in English, lowercase, imperative or as a statement, no period at the end
- **Breaking** for an app means: an older frontend can no longer talk to the API, the deployment has to change (new required config value, new environment variable), a migration cannot be undone, or the app works fundamentally differently for its users
- Below `1.0.0` (`express-api-base`) a breaking change raises the minor and a feature the patch, as SemVer intends for `0.x`

A commit-msg hook ([.husky/commit-msg](../.husky/commit-msg)) rejects messages that do not follow the format, it is installed by `pnpm install`. The CI checks every commit of a pull request again. Merge commits (`Merge pull request …`) are allowed and ignored.

### Which apps a commit counts for

The **files** a commit changes decide which apps it counts for, not its scope:

- A commit in `apps/dartomat-web/` counts for `dartomat-web` only
- A commit in a lib counts for every app that uses the lib. `feat(ui): …` raises the minor of `angular-base`, `portfolio-web` and `dartomat-web`, `fix(server-core): …` the patch of every API. In the changelog of such an app the entry reads "No changes in this app itself, only in the shared libs it uses."
- A commit in files of no project (root config, docs) counts for no app

When a pull request has commits of several types, the highest wins: one `feat` and three `fix` make a minor release.

## Releasing

On an up-to-date `main` with a clean working tree:

```bash
git switch main && git pull
```

1. See what would happen. Nothing is written:

   ```bash
   pnpm nx release --dry-run
   ```

   For each app it shows the current version (from its last tag, or from its `package.json` before its first `nx1-` tag), the next one, and the changelog entry. Apps without a `fix` or `feat` since their last tag are left out.

2. Release:

   ```bash
   pnpm nx release
   ```

   Writes the new versions into the `package.json` files, the entries into the `CHANGELOG.md` files, makes one commit `chore(release): publish` and one tag per released app. Nothing is pushed. Only some apps: `pnpm nx release --projects=dartomat-web,dartomat-api`.

   At the end Nx asks whether to publish. Either answer is fine: publishing does nothing here (the target `nx-release-publish` of every app is `nx:noop`), the images are built by CI from the tags.

3. Push the commit and the tags:

   ```bash
   pnpm release:push
   ```

   [tools/scripts/push-release.sh](../tools/scripts/push-release.sh) pushes `main` and then each tag of the release commit in a push of its own. Do not use `git push --follow-tags`: GitHub starts no workflow for tags when more than three are pushed at once, so no image would be built.

   Each new tag starts the pipeline for its app: the checks of that app only (the commit was checked on `main` already), then the publish job in the [pipeline](deployment.md#the-pipeline). The image tag is the version: `nx1-dartomat-web-v1.3.0` becomes `ghcr.io/<owner>/nx1-dartomat-web:v1.3.0`.

4. Deploy: raise the image tag in the stack of the app in the `server-setup` repo and deploy it there.

**Forcing a version**, e.g. a major the commits do not show: `pnpm nx release major --projects=dartomat-web` (or `minor`, `patch`, `2.0.0`).

**A tag that started no pipeline** (e.g. pushed together with more than three others): delete it on GitHub and push it again on its own. Pushing an existing tag again starts nothing.

```bash
git push origin :refs/tags/nx1-dartomat-web-v1.3.0
git push origin refs/tags/nx1-dartomat-web-v1.3.0
```

**A mistake before pushing:** `git reset --hard HEAD~1` and delete the local tags with `git tag -d <tag>`. After pushing, do not move a tag; release a new patch instead.

## Seeing the running version

- **Frontend:** every Angular app provides its version as the token `APP_VERSION` (`@core/app-version`) from its `package.json` in `app.config.ts`. It is shown as "Version 1.3.0": in the footer of `angular-base` and `portfolio-web`, in Dartomat below the start button and in the options sheet
- **API:** `GET /health` answers `{ "status": "ok", "version": "1.3.0" }`. The version is passed to `createServer({ version })` from the `package.json` of the API, the OpenAPI document shows it as well

After a deploy, `curl https://<host>/health` shows which API version runs.

## Configuration

The `release` block in [nx.json](../nx.json):

| Setting                                              | Effect                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `projectsRelationship: "independent"`                | Each app has its own version and tag                                                                               |
| `releaseTag.pattern: "nx1-{projectName}-v{version}"` | The tag format the pipeline reacts to                                                                              |
| `version.conventionalCommits`                        | Next version from the commit messages since the last tag                                                           |
| `version.fallbackCurrentVersionResolver: "disk"`     | Before the first `nx1-` tag of an app, its version comes from its `package.json`                                   |
| `conventionalCommits.useCommitScope: false`          | A commit counts for the apps whose files it changes, whatever its scope                                            |
| `changelog.automaticFromRef`                         | The first changelog of an app starts at the first commit (older commits do not follow the format and are left out) |
| `git.push: false`                                    | `nx release` never pushes, you do                                                                                  |
| `nx-release-publish: nx:noop` in each `project.json` | Nothing to publish, `nx release` ends without an error. Without the target Nx stops with exit code 1 after tagging |

A new app is added to `release.projects`, gets `name`, `version` and `private: true` in its `package.json`, the target `"nx-release-publish": { "executor": "nx:noop" }` in its `project.json` and its scope in `commitlint.config.mjs`.
