// @ts-check
/**
 * Generates the Spartan helm components in another style as their own lib, next to helm-vega.
 *
 * The Spartan CLI writes the style into the generated code and reads it from components.json, so
 * this script switches components.json to the new style and folder, runs the CLI once per
 * component of helm-vega and restores components.json and tsconfig.base.json afterwards.
 *
 * Usage: node tools/scripts/add-helm-style.mjs <style>
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STYLES = ['nova', 'vega', 'lyra', 'maia', 'mira', 'luma'];
const REFERENCE_LIB = 'packages/shared/helm-vega';

const style = process.argv[2];
if (!style || !STYLES.includes(style)) {
  throw new Error(`Usage: add-helm-style.mjs <style>, one of ${STYLES.join(', ')}.`);
}

const lib = `packages/shared/helm-${style}`;
if (existsSync(lib)) {
  throw new Error(`${lib} exists already.`);
}

const components = readdirSync(REFERENCE_LIB, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const restore = ['components.json', 'tsconfig.base.json'].map((file) => ({
  file,
  content: readFileSync(file, 'utf8'),
}));

try {
  const config = JSON.parse(restore[0].content);
  writeFileSync(
    'components.json',
    JSON.stringify({ ...config, style, componentsPath: lib }, null, 2) + '\n',
  );

  for (const component of components) {
    console.log(`Generating ${component} (${style})`);
    // `--angularCli` keeps the components as folders of one lib instead of a project each.
    execFileSync(
      'pnpm',
      [
        'nx',
        'g',
        '@spartan-ng/cli:ui',
        component,
        '--angularCli=true',
        `--directory=${lib}`,
        '--installPeerDependencies=false',
        '--no-interactive',
      ],
      { stdio: ['ignore', 'ignore', 'inherit'] },
    );
  }
} finally {
  // The CLI adds a path per component. The wildcard `@spartan-ng/helm/*` stays the only one.
  for (const { file, content } of restore) {
    writeFileSync(file, content);
  }
}

for (const file of ['project.json', 'tsconfig.json', 'tsconfig.lib.json']) {
  const content = readFileSync(join(REFERENCE_LIB, file), 'utf8');
  writeFileSync(join(lib, file), content.replaceAll('helm-vega', `helm-${style}`));
}

// The CLI version that generated the lib, the base of the three-way merge in update-spartan.mjs.
const { version } = JSON.parse(readFileSync('node_modules/@spartan-ng/cli/package.json', 'utf8'));
writeFileSync(join(lib, 'spartan.json'), JSON.stringify({ cliVersion: version }, null, 2) + '\n');

console.log(`
Created ${lib}. To use it in an app:
- repeat the "paths" of tsconfig.base.json in the app's tsconfig.json and point
  "@spartan-ng/helm/*" to "./${lib}/*/src/index.ts"
- add "helm-${style}" to "implicitDependencies" in the app's project.json
- adjust colors, radius and fonts in the app's themes to the style`);
