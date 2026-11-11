/** Shortest admin password accepted in production. The config schema allows 8 for local use. */
export const MIN_PRODUCTION_ADMIN_PASSWORD_LENGTH = 16;

/**
 * Passwords from the committed config files of the API apps, known to anyone with the repo.
 * A test reads every `admin.password` in `apps/*\/config/*.json`, so a new one must be added here.
 */
const PLACEHOLDER_PASSWORDS = new Set([
  'change-me-before-deploying',
  'dev-admin-password',
  'test-admin-password',
  'unused-but-required',
  'unused-dev-password',
  'unused-test-password',
]);

/** The committed placeholders, e.g. to check an existing password hash against each of them. */
export const placeholderPasswords: readonly string[] = [...PLACEHOLDER_PASSWORDS];

/** Whether `password` is a committed placeholder, ignoring case and surrounding spaces. */
export function isPlaceholderPassword(password: string): boolean {
  return PLACEHOLDER_PASSWORDS.has(password.trim().toLowerCase());
}

/**
 * Why `password` must not become the first admin's password in `nodeEnv`, or `undefined` if it
 * may. Only production is checked: the committed development and test files use placeholders.
 */
export function adminPasswordProblem(password: string, nodeEnv: string): string | undefined {
  if (nodeEnv !== 'production') return undefined;
  if (isPlaceholderPassword(password)) {
    return 'admin.password is a placeholder from the example config';
  }
  if (password.length < MIN_PRODUCTION_ADMIN_PASSWORD_LENGTH) {
    return `admin.password must have at least ${MIN_PRODUCTION_ADMIN_PASSWORD_LENGTH} characters in production`;
  }
  return undefined;
}
