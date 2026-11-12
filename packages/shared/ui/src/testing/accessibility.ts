import axe, { type AxeResults, type Result } from 'axe-core';
import { expect } from 'vitest';

/**
 * Runs axe-core against a rendered element and returns what it found. Colour contrast is left
 * out: jsdom computes no layout, so axe cannot measure it. The contrast of the theme tokens is
 * checked in `docs/frontend/styling.md` instead.
 */
export async function accessibilityViolations(element: HTMLElement): Promise<Result[]> {
  const results: AxeResults = await axe.run(element, {
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations;
}

/**
 * Adds `toBeAccessible()` to Vitest. Call it once from the `test-setup.ts` of a project, then
 * `await expect(element).toBeAccessible()` in a spec.
 */
export function registerAccessibilityMatcher(): void {
  expect.extend({
    async toBeAccessible(received: HTMLElement) {
      const violations = await accessibilityViolations(received);
      const summary = violations
        .map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`)
        .join('\n');
      return {
        pass: violations.length === 0,
        message: () =>
          violations.length === 0
            ? 'Expected the element to have accessibility violations, it has none'
            : `Accessibility violations:\n${summary}`,
      };
    },
  });
}

declare module 'vitest' {
  // Vitest's own `Matchers` takes the result type `R` and the received type `T`. The matcher is
  // async, so it always resolves with `Promise<void>`.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Matchers<R = void | Promise<void>, T = unknown> {
    toBeAccessible(): Promise<void>;
  }
}
