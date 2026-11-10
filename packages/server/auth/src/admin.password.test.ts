import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { adminPasswordProblem, isPlaceholderPassword } from './admin.password';

const root = join(import.meta.dirname, '../../../..');

/** `admin.password` of every committed config file of the API apps and of this lib. */
function committedAdminPasswords(): { file: string; password: string }[] {
  const files = readdirSync(join(root, 'apps'))
    .flatMap((app) => {
      try {
        return readdirSync(join(root, 'apps', app, 'config')).map((name) =>
          join('apps', app, 'config', name),
        );
      } catch {
        return [];
      }
    })
    .filter((file) => file.endsWith('.json'))
    .concat('packages/server/auth/src/testing/test-config.json');
  return files.flatMap((file) => {
    const json = JSON.parse(readFileSync(join(root, file), 'utf8')) as {
      admin?: { password?: string };
    };
    return json.admin?.password === undefined ? [] : [{ file, password: json.admin.password }];
  });
}

describe('adminPasswordProblem', () => {
  it('knows the admin password of every committed config file as a placeholder', () => {
    const passwords = committedAdminPasswords();
    expect(passwords.length).toBeGreaterThan(0);
    for (const { file, password } of passwords) {
      expect(isPlaceholderPassword(password), file).toBe(true);
    }
  });

  it('rejects a placeholder in production, ignoring case and surrounding spaces', () => {
    for (const password of ['change-me-before-deploying', ' Change-Me-Before-Deploying ']) {
      expect(adminPasswordProblem(password, 'production')).toMatch(/placeholder/);
    }
  });

  it('rejects a password shorter than 16 characters in production', () => {
    expect(adminPasswordProblem('fifteen-chars-1', 'production')).toMatch(/at least 16/);
  });

  it('accepts a long password in production', () => {
    expect(adminPasswordProblem('sixteen-chars-12', 'production')).toBeUndefined();
  });

  it.each(['development', 'test'])('accepts the placeholders in %s', (nodeEnv) => {
    expect(adminPasswordProblem('dev-admin-password', nodeEnv)).toBeUndefined();
    expect(adminPasswordProblem('short123', nodeEnv)).toBeUndefined();
  });
});
