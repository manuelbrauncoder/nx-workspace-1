# Pipeline review

Review of `.github/workflows/ci.yml`, the six `apps/*/Dockerfile` and the release flow, checked against the skills `ci-cd-and-automation` and `github-actions-templates`. Status: November 2026. Each finding says what is missing, why it matters and what to change. The order within a section is the suggested order of work.

## What is already good

These points need no change and should stay when the pipeline is reworked:

- Every gate the skills ask for runs on each PR and push to `main`: format, lint, typecheck (including specs), unit and API tests against a real Postgres, build. Angular budgets in `project.json` cover bundle size
- `nx affected` with `nrwl/nx-set-shas` keeps a typical run at about 1 minute. A release run takes about 7 minutes (checks 4.5, image 3)
- `concurrency` cancels outdated runs and never a release
- Minimal `permissions` at workflow level, `packages: write` only in the publish jobs
- Node from `.nvmrc`, pnpm from `packageManager`, `--frozen-lockfile`, pnpm store cache
- Commit messages checked with commitlint, because `nx release` derives versions from them
- One release tag per app, `pnpm release:push` works around the three-tag limit of GitHub
- Docker layer cache in GHA with one scope per app, `.dockerignore` keeps docs and agent folders out
- Images are environment-neutral, the step summary says what a deployment has to mount and set
- The Postgres password `app` in the service is fine as it is. The database only exists inside the job, and the value matches `docker-compose.yml`, which the Vitest configs expect. A GitHub secret would add nothing here

## High priority

### 1. A red pipeline does not block a merge

The repository is private on the GitHub Free plan. Branch protection and rulesets are not available there (the API answers 403), so nothing requires a passing `Quality checks` before a merge, and `main` accepts direct pushes and force pushes. The history shows such a direct merge (`Merge branch 'fix-media-test-timeout'`). CI only reports, it does not enforce.

**Change:** make the repository public or switch to GitHub Pro, then add a ruleset for `main`:

- Pull request required before merging (with no required approvals while you work alone)
- Required status check `Quality checks`
- Block force pushes and deletion
- Allow the release flow: `pnpm release:push` pushes the `chore(release): publish` commit straight to `main`. Either add yourself to the bypass list of the ruleset or move the release into a workflow (see 13)

While the plan stays as it is, the rule "only merge through a green PR" is a convention and should be written into `docs/releasing.md`.

### 2. No automatic dependency updates

There is no `.github/dependabot.yml` and no Renovate. Outdated npm packages, actions and base images (`node:24-alpine`, `postgres:18`) are only noticed by hand.

**Change:** add Dependabot for three ecosystems. Nx and Angular are updated with `nx migrate`, which also runs the code migrations, so Dependabot leaves them out:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule: { interval: weekly }
    open-pull-requests-limit: 5
    ignore:
      - dependency-name: 'nx'
      - dependency-name: '@nx/*'
      - dependency-name: '@angular/*'
      - dependency-name: '@angular-devkit/*'
      - dependency-name: '@schematics/angular'
    groups:
      dev-dependencies:
        dependency-type: development
        update-types: [minor, patch]
    commit-message: { prefix: 'build', include: scope }
  - package-ecosystem: github-actions
    directory: /
    schedule: { interval: monthly }
    commit-message: { prefix: 'ci' }
  - package-ecosystem: docker
    directories: ['/apps/*']
    schedule: { interval: monthly }
    commit-message: { prefix: 'build' }
```

The commit prefixes must pass `commitlint.config.mjs`, check the allowed scopes before enabling it. The `package.json` files of the API apps (`apps/*-api*/package.json`) carry the runtime dependencies a second time. Dependabot updates them separately, so they need their own entries or a check that both versions match.

### 3. The API images run as root

**Done:** the three API images run as `node` (uid 1000), see [Deployment](deployment.md#what-the-server-needs).

The three web images switch to `USER node`, the three API images (`express-api-base`, `portfolio-api`, `dartomat-api`) do not. A vulnerability in Express, `sharp` or a parser would then run with root rights inside the container.

**Change:** add `USER node` to the final stage of each API Dockerfile, after the `COPY` lines. The uploads folder (`/app/uploads`) is mounted from the host and must be writable by UID 1000. Existing deployments need a `chown 1000:1000` on that folder once, otherwise uploads fail after the update. That makes it a breaking change for the deployment in the sense of `docs/releasing.md` and belongs in `docs/deployment.md`.

### 4. No security scan

Neither the dependencies nor the finished images are checked for known vulnerabilities. Both skills list this as a gate.

**Change, two parts:**

- A scheduled workflow (weekly and on demand) runs `pnpm audit --prod --audit-level=high`. Not in the PR checks: a new advisory would otherwise turn unrelated PRs red overnight
- The publish job scans the image with Trivy before it pushes, and fails on `CRITICAL` with a fix available:

```yaml
- name: Build image
  uses: docker/build-push-action@v7
  with:
    load: true
    tags: local/${{ steps.app.outputs.name }}:scan
    # … file, cache-from, cache-to as today

- name: Scan image
  uses: aquasecurity/trivy-action@0.33.1
  with:
    image-ref: local/${{ steps.app.outputs.name }}:scan
    severity: CRITICAL
    ignore-unfixed: true
    exit-code: '1'
```

The push then follows as a second `build-push-action` step, which hits the layer cache and takes seconds. CodeQL and the GitHub security tab need GitHub Advanced Security on a private repository and are therefore not part of this suggestion.

## Medium priority

### 5. Six copies of the same publish job

The six `publish-*` jobs differ only in the app name and the text of the step summary, about 320 lines in total. A new app means copying a job and adding a tag pattern under `on.push.tags`, and a fix (for example the Trivy step) has to be made six times.

**Change:** one job that derives the app from the tag, a single tag pattern, and the summary text per app in a file next to the Dockerfile:

```yaml
on:
  push:
    branches: [main]
    tags: ['nx1-*-v*']

jobs:
  publish:
    name: Build and push image
    runs-on: ubuntu-latest
    needs: checks
    if: github.event_name == 'push' && github.ref_type == 'tag'
    permissions:
      contents: read
      packages: write
    steps:
      - uses: actions/checkout@v7

      # nx1-portfolio-api-v1.2.0 → portfolio-api, v1.2.0
      - name: Resolve app
        id: app
        run: |
          name="${GITHUB_REF_NAME#nx1-}"
          name="${name%-v*}"
          [ -f "apps/$name/Dockerfile" ] || { echo "No Dockerfile for $name" >&2; exit 1; }
          echo "name=$name" >> "$GITHUB_OUTPUT"
          echo "version=${GITHUB_REF_NAME#nx1-$name-}" >> "$GITHUB_OUTPUT"

      # … buildx, login, metadata (see 6), scan (see 4), push

      - name: Deployment summary
        run: cat "apps/${{ steps.app.outputs.name }}/deploy-notes.md" >> "$GITHUB_STEP_SUMMARY"
```

The `checks` job already derives the app the same way, so both can share the step or `checks` can expose the name as a job output. Adding an app then needs no change to the workflow.

### 6. Image metadata is hand-made

The tags are built in a shell step, the images carry no OCI labels. Without `org.opencontainers.image.source`, GHCR does not link the package to the repository, and a running container does not tell which commit it was built from. No provenance or SBOM is attached either.

**Change:** `docker/metadata-action` for tags and labels, plus attestations in `build-push-action`:

```yaml
- name: Image metadata
  id: meta
  uses: docker/metadata-action@v6
  with:
    images: ghcr.io/${{ github.repository_owner }}/nx1-${{ steps.app.outputs.name }}
    tags: |
      type=raw,value=${{ steps.app.outputs.version }}
      type=sha,prefix=sha-
      type=raw,value=latest
    labels: |
      org.opencontainers.image.version=${{ steps.app.outputs.version }}

- uses: docker/build-push-action@v7
  with:
    push: true
    tags: ${{ steps.meta.outputs.tags }}
    labels: ${{ steps.meta.outputs.labels }}
    provenance: mode=max
    sbom: true
```

`metadata-action` lowercases the owner itself, the `tr` step goes away. Check the exact major version of the action before switching.

### 7. No test of the finished image

Unit and API tests run against the source, the image itself is never started. A missing file in the `COPY` lines, a wrong `CMD` or a runtime package missing from `apps/*-api*/package.json` only shows up on the server.

**Change:** a smoke test in the publish job between build and push. Start the image with the local config and request a page:

- Web apps: `docker run -d -p 4000:4000 -e NG_ALLOWED_HOSTS=localhost …`, then `curl --fail --retry 10 --retry-connrefused http://localhost:4000/`
- APIs: against the Postgres service (the publish job then needs it too), `node dist/scripts/migrate.js` in the container, then `curl --fail http://localhost:3000/health`. `/health` also returns the version, which the test can compare with the tag

The Playwright plugin is registered in `nx.json`, but no app has an e2e project. A few Playwright journeys (sign-in, create a note) would be the next step after the smoke test, not before it.

### 8. Commit messages on `main` are only checked locally

`commitlint` runs in CI for pull requests only. A direct push to `main` (possible while finding 1 is open) is only checked by the Husky hook, which `--no-verify` skips. A wrong message then leads to a wrong version in `nx release`.

**Change:** also check pushes to `main`. `github.event.before` is all zeros for a new branch, so only run it when it is set:

```yaml
- name: Commit messages
  if: github.event_name == 'pull_request' || (github.ref == 'refs/heads/main' && github.event.before != '0000000000000000000000000000000000000000')
  env:
    FROM: ${{ github.event.pull_request.base.sha || github.event.before }}
    TO: ${{ github.event.pull_request.head.sha || github.sha }}
  run: pnpm exec commitlint --from "$FROM" --to "$TO" --verbose
```

This becomes unnecessary once finding 1 is solved and every change goes through a PR.

### 9. `--parallel=4` assumes four cores

The comment says "one per core of the runner". The standard `ubuntu-latest` runner has 4 vCPUs for public repositories, but 2 vCPUs and 7 GB RAM for private ones. With four tasks at once, Angular builds and Vitest compete for two cores and memory.

**Change:** check with `nproc` in a run. If it reports 2, compare the run time with `--parallel=2` or `--parallel=3` and keep the faster one. Should the repository go public for finding 1, 4 is right.

### 10. No timeouts

No job sets `timeout-minutes`, so the default of 6 hours applies. A hanging test or a stuck Docker build uses up the free minutes of the private repository.

**Change:** `timeout-minutes: 20` on `checks` and `timeout-minutes: 20` on the publish job, about three times the current run time.

### 11. Rollback is not written down

Every image is kept under its version, so going back means deploying an older tag. That works for the web apps. For the APIs, migrations only go forward: an older image on a migrated database can fail.

**Change:** a section "Rolling back" in `docs/deployment.md`:

- Web: set the previous version in the stack and redeploy
- API without new migration since then: the same
- API with new migration: back up the database before each release that contains a migration (`docs/releasing.md` already counts an irreversible migration as breaking), and restore the backup together with the older image

## Low priority

### 12. Expressions inline in `run` scripts

`${{ github.event.pull_request.base.sha }}`, `${{ github.ref_type }}` and `${{ github.repository_owner }}` are written directly into shell scripts. All three values are safe today (SHAs, a fixed keyword, a GitHub login), so this is not a vulnerability. The rule of thumb from the skill is still to pass every expression via `env:`, so that a later edit with a branch name or PR title does not open a script injection. Findings 5, 6 and 8 already move most of them.

### 13. Actions pinned to major tags

`actions/checkout@v7`, `pnpm/action-setup@v6`, `nrwl/nx-set-shas@v4` and others follow their major tag. The skill calls that sufficient. Pinning to the commit SHA (with the version as a comment) protects against a hijacked tag of a third-party action and costs nothing once Dependabot keeps the SHAs current (finding 2). Worth it for the third-party actions `pnpm/action-setup`, `nrwl/nx-set-shas` and the Docker actions first.

A further step: run `nx release` itself in a `workflow_dispatch` workflow instead of locally. It would remove the local `release:push` and the need for a bypass in finding 1, but would need a token that may push to `main` and is a larger change.

### 14. No Nx cache between runs

Without Nx Cloud (`NX_NO_CLOUD` in the Dockerfiles, no `actions/cache` for `.nx/cache`), every run builds the affected projects from scratch, and a release builds its app twice: in `checks` and in the Docker image. With runs of 1 to 7 minutes, the skill's limit of 10 minutes is far away. Only worth doing if run times grow, then with Nx Cloud or `actions/cache` on `.nx/cache` keyed by the lockfile.

### 15. `latest` moves with every release

Each publish job sets `latest`, including a hotfix of an older version. Deployments should pin a version anyway, `latest` is a convenience for pulling by hand. Either drop `latest` or document that no stack may use it.

### 16. Merged branches stay

`delete_branch_on_merge` is off in the repository settings. Turning it on keeps the branch list short, a deleted branch can be restored from the PR.

## Suggested order

1. Dependabot (2) and `USER node` for the APIs (3): small, independent, high value
2. One publish job (5) with metadata (6), Trivy (4), smoke test (7) and timeout (10): one PR, since all of them touch the same job
3. Scheduled `pnpm audit` (4) and `--parallel` measured (9)
4. Branch protection (1), once the plan question is settled. Finding 8 is then obsolete
5. Rollback doc (11) and the small points from the low section
