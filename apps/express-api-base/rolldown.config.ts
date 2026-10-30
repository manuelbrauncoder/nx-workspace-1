import { readFileSync } from 'node:fs';
import { defineConfig } from 'rolldown';

const packageJson = readFileSync(new URL('./package.json', import.meta.url), 'utf8');

// Installed at runtime instead of bundled (native addons, dynamic requires).
const dependencies = Object.keys(JSON.parse(packageJson).dependencies);

export default defineConfig({
  // The output names stay `index.js` and `scripts/migrate.js`, which deployments run.
  input: {
    index: 'src/index.ts',
    'scripts/migrate': 'src/scripts/migrate.ts',
  },
  platform: 'node',
  tsconfig: 'tsconfig.json',
  external: (id) => dependencies.some((dep) => id === dep || id.startsWith(`${dep}/`)),
  plugins: [
    {
      name: 'package-json',
      // `type: module` makes Node load the output as ESM, the dependencies are what the image
      // installs.
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'package.json', source: packageJson });
      },
    },
  ],
  output: {
    dir: '../../dist/apps/express-api-base',
    cleanDir: true,
    format: 'esm',
    entryFileNames: '[name].js',
    sourcemap: true,
  },
});
