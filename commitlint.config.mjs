// Commit messages follow Conventional Commits: `nx release` reads them to decide the next version
// of each app (`fix` → patch, `feat` → minor, `!` or `BREAKING CHANGE:` → major). See
// docs/releasing.md. Checked by the commit-msg hook (.husky/commit-msg) and in CI.

/** Nx projects, plus scopes for changes that belong to no single project. */
const scopes = [
  // apps
  'angular-base',
  'express-api-base',
  'portfolio-web',
  'portfolio-api',
  'dartomat-web',
  'dartomat-api',
  'vyte-web',
  'vyte-api',
  // libs
  'core',
  'ui',
  'styles',
  'helm-vega',
  'contracts',
  'server-core',
  'server-auth',
  'portfolio-contracts',
  'dartomat-contracts',
  'vyte-contracts',
  // across the workspace
  'workspace',
  'deps',
  'ci',
  'docs',
  'release',
];

export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // The scope is optional, but if there is one it must be known.
    'scope-enum': [2, 'always', scopes],
  },
};
