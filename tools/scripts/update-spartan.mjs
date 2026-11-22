// @ts-check
/**
 * Updates Spartan (brain and CLI) and merges the new helm components into every helm lib without
 * losing local changes.
 *
 * The helm components are generated code that lives in the repo. A plain regeneration would
 * overwrite every local change, so this script does a three-way merge per file:
 *
 * - base: the components as the CLI version in `spartan.json` of the lib generated them
 * - ours: the components in the lib today (base plus local changes)
 * - next: the components as the new CLI version generates them
 *
 * `git merge-file` takes the changes from base to next into ours. Lines changed only by Spartan are
 * taken over, lines changed only locally stay, and where both changed the same lines the file gets
 * conflict markers. All three are formatted with Prettier first, so formatting is never a change.
 *
 * Usage:
 *   node tools/scripts/update-spartan.mjs [version]       update to version (default: latest)
 *   node tools/scripts/update-spartan.mjs --customizations  only list local changes against base
 *   --keep  keep packages/.spartan-update (base, ours, next) for inspection
 *
 * Exit code 1 when a merge left conflicts. Details in docs/libs/helm.md.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative } from 'node:path';

// The CLI writes below `packages/` only and applies the style only to files git does not ignore,
// so this folder must not be in .gitignore. The script deletes it at the end (unless --keep).
const WORK_DIR = 'packages/.spartan-update';
const HELM_ROOT = 'packages/shared';
const VERSION_FILE = 'spartan.json';
const CLI = '@spartan-ng/cli';
const BRAIN = '@spartan-ng/brain';

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const onlyCustomizations = args.includes('--customizations');
const requestedVersion = args.find((arg) => !arg.startsWith('--'));

/** @param {string} command @param {string[]} commandArgs */
function run(command, commandArgs, quiet = false) {
  return execFileSync(command, commandArgs, {
    encoding: 'utf8',
    stdio: ['ignore', quiet ? 'pipe' : 'inherit', 'inherit'],
  });
}

/** @param {string} file @returns {any} */
const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** @param {string} file @param {unknown} value */
const writeJson = (file, value) => writeFileSync(file, JSON.stringify(value, null, 2) + '\n');

function installedVersion() {
  return readJson(`node_modules/${CLI}/package.json`).version;
}

/** @param {string} version */
function installCli(version) {
  if (installedVersion() === version) return;
  console.log(`Installing ${CLI}@${version}`);
  run('pnpm', ['add', '-D', '-w', '--save-exact', `${CLI}@${version}`], true);
}

/** Every file below dir, relative to it. @param {string} dir @returns {string[]} */
function listFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)));
}

/** @param {string} file */
const readOrNull = (file) => (existsSync(file) ? readFileSync(file, 'utf8') : null);

/** The helm libs with their style, components and the CLI version that generated them. */
function findHelmLibs() {
  return readdirSync(HELM_ROOT)
    .filter((name) => name.startsWith('helm-'))
    .map((name) => {
      const path = join(HELM_ROOT, name);
      const versionFile = join(path, VERSION_FILE);
      if (!existsSync(versionFile)) {
        throw new Error(`${versionFile} is missing. It names the CLI version of the lib.`);
      }
      const components = readdirSync(path, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);
      return {
        path,
        style: name.slice('helm-'.length),
        components,
        cliVersion: /** @type {string} */ (readJson(versionFile).cliVersion),
      };
    });
}

/**
 * Generates the given components with the installed CLI into outDir. The CLI reads the style and
 * folder from components.json and adds a path per component to tsconfig.base.json, both are
 * restored afterwards. Returns the components the CLI could not generate, with its output.
 *
 * A call right after installing another CLI version can fail once, so a failed component gets a
 * second try. One that still fails is either not from Spartan (in the base) or an error (in next).
 *
 * @param {string} style @param {string[]} components @param {string} outDir
 * @returns {{ component: string, output: string }[]}
 */
function generate(style, components, outDir) {
  const restore = ['components.json', 'tsconfig.base.json'].map((file) => ({
    file,
    content: readFileSync(file, 'utf8'),
  }));
  /** @param {string} component */
  const generateOne = (component) => {
    rmSync(join(outDir, component), { recursive: true, force: true });
    const result = spawnSync(
      'pnpm',
      [
        'nx',
        'g',
        `${CLI}:ui`,
        component,
        '--angularCli=true',
        `--directory=${outDir}`,
        '--installPeerDependencies=false',
        '--no-interactive',
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    const ok = result.status === 0 && listFiles(join(outDir, component)).length > 0;
    return ok ? null : { component, output: `${result.stdout}${result.stderr}`.trim() };
  };
  /** @type {{ component: string, output: string }[]} */
  const failed = [];
  try {
    writeJson('components.json', { ...readJson('components.json'), style, componentsPath: outDir });
    for (const component of components) {
      process.stdout.write(`  ${component}\n`);
      const failure = generateOne(component) && generateOne(component);
      if (failure) failed.push(failure);
    }
  } finally {
    for (const { file, content } of restore) writeFileSync(file, content);
  }
  return failed;
}

/**
 * Three-way merge of one lib. Writes the result into the lib and returns what happened per file.
 *
 * @param {{ path: string }} lib @param {string} work @param {string[]} components
 */
function mergeLib(lib, work, components) {
  const report = {
    /** @type {string[]} */ updated: [],
    /** @type {string[]} */ keptLocal: [],
    /** @type {string[]} */ conflicts: [],
    /** @type {string[]} */ added: [],
    /** @type {string[]} */ removed: [],
    /** @type {string[]} */ notes: [],
  };

  for (const component of components) {
    const files = new Set(
      ['base', 'ours', 'next'].flatMap((side) => listFiles(join(work, side, component))),
    );
    for (const file of [...files].sort()) {
      const rel = join(component, file);
      const base = readOrNull(join(work, 'base', rel));
      const ours = readOrNull(join(work, 'ours', rel));
      const next = readOrNull(join(work, 'next', rel));
      const target = join(lib.path, rel);
      const local = ours !== base;

      if (ours === null && base === null) {
        // New in Spartan.
        mkdirSync(dirname(target), { recursive: true });
        writeFileSync(target, /** @type {string} */ (next));
        report.added.push(rel);
      } else if (ours === null) {
        report.notes.push(`${rel}: deleted locally, left out`);
      } else if (next === null && base === null) {
        report.notes.push(`${rel}: own file, kept`);
      } else if (next === null) {
        if (local) {
          report.conflicts.push(`${rel} (removed by Spartan, changed locally)`);
        } else {
          rmSync(target);
          report.removed.push(rel);
        }
      } else if (base === null) {
        // Exists locally and in next, but not in base: merge against an empty base.
        report.conflicts.push(...mergeFile(rel, target, work, ours, '', next, report));
      } else {
        report.conflicts.push(...mergeFile(rel, target, work, ours, base, next, report));
        if (local) report.keptLocal.push(rel);
      }
    }
  }
  return report;
}

/**
 * @param {string} rel @param {string} target @param {string} work
 * @param {string} ours @param {string} base @param {string} next
 * @param {{ updated: string[] }} report
 */
function mergeFile(rel, target, work, ours, base, next, report) {
  const tmp = join(work, 'merge');
  mkdirSync(tmp, { recursive: true });
  const files = /** @type {const} */ (['ours', 'base', 'next']).map((side, index) => {
    const file = join(tmp, side);
    writeFileSync(file, [ours, base, next][index]);
    return file;
  });
  const result = spawnSync(
    'git',
    ['merge-file', '-p', '-L', 'local', '-L', 'base', '-L', 'spartan', ...files],
    { encoding: 'utf8' },
  );
  // The exit code is the number of conflicts, 255 an error.
  if (result.status === null || result.status === 255) {
    throw new Error(`git merge-file failed for ${rel}: ${result.stderr}`);
  }
  const merged = result.stdout;
  // Write even when nothing changed, the lib may still have had a different formatting.
  writeFileSync(target, merged);
  if (merged !== ours) report.updated.push(rel);
  return result.status > 0 ? [rel] : [];
}

/** @param {string} title @param {string[]} items */
function printList(title, items) {
  if (items.length === 0) return;
  console.log(`\n${title} (${items.length}):`);
  for (const item of items) console.log(`  ${item}`);
}

const libs = findHelmLibs();
const originalPackageFiles = ['package.json', 'pnpm-lock.yaml'].map((file) => ({
  file,
  content: readFileSync(file, 'utf8'),
}));
const startVersion = installedVersion();
const target =
  requestedVersion ??
  (onlyCustomizations ? startVersion : run('pnpm', ['view', CLI, 'version'], true).trim());

let done = false;
let conflicts = 0;
rmSync(WORK_DIR, { recursive: true, force: true });

try {
  // base and ours
  for (const lib of libs) {
    const work = join(WORK_DIR, lib.style);
    installCli(lib.cliVersion);
    console.log(`\nGenerating base of ${lib.path} with ${CLI}@${lib.cliVersion}`);
    const unknown = generate(lib.style, lib.components, join(work, 'base')).map(
      ({ component }) => component,
    );
    lib.components = lib.components.filter((component) => !unknown.includes(component));
    if (unknown.length > 0) console.log(`  not from Spartan, left alone: ${unknown.join(', ')}`);
    for (const component of lib.components) {
      cpSync(join(lib.path, component), join(work, 'ours', component), { recursive: true });
    }
  }

  if (!onlyCustomizations) {
    console.log(`\nInstalling ${CLI} and ${BRAIN} ${target}`);
    run('pnpm', ['add', '-w', '--save-exact', `${BRAIN}@${target}`], true);
    installCli(target);
    for (const lib of libs) {
      console.log(`\nGenerating ${lib.path} with ${CLI}@${target}`);
      // A component the old CLI generated and the new one does not is an error, not a removal:
      // merging would delete it from the lib.
      const failed = generate(lib.style, lib.components, join(WORK_DIR, lib.style, 'next'));
      if (failed.length > 0) {
        for (const { component, output } of failed) console.error(`\n${component}:\n${output}`);
        throw new Error(
          `${CLI}@${target} could not generate ${failed.map(({ component }) => component).join(', ')}.`,
        );
      }
    }
  }

  console.log('\nFormatting base, ours and next');
  run('pnpm', ['exec', 'prettier', '--write', '--log-level', 'warn', WORK_DIR]);

  for (const lib of libs) {
    const work = join(WORK_DIR, lib.style);
    console.log(`\n=== ${lib.path} (${lib.cliVersion} → ${onlyCustomizations ? '-' : target})`);

    if (onlyCustomizations) {
      const diff = spawnSync(
        'git',
        ['diff', '--no-index', '--stat=200', join(work, 'base'), join(work, 'ours')],
        { encoding: 'utf8' },
      );
      console.log(diff.stdout.trim() || 'No local changes against the generated components.');
      continue;
    }

    const report = mergeLib(lib, work, lib.components);
    conflicts += report.conflicts.length;
    writeJson(join(lib.path, VERSION_FILE), {
      ...readJson(join(lib.path, VERSION_FILE)),
      cliVersion: target,
    });

    printList('Changed', report.updated);
    printList('Local changes kept', report.keptLocal);
    printList('Added by Spartan', report.added);
    printList('Removed by Spartan', report.removed);
    printList('Notes', report.notes);
    printList('CONFLICTS, resolve the markers <<<<<<< local / >>>>>>> spartan', report.conflicts);

    const supported = Object.keys(
      readJson(`node_modules/${CLI}/src/generators/ui/supported-ui-libraries.json`),
    );
    printList(
      'Available in Spartan but not in the lib',
      supported.filter((name) => !lib.components.includes(name)),
    );
  }

  done = true;
} finally {
  // --customizations only borrows the old CLI. A failed update leaves nothing half done.
  if (!done || onlyCustomizations) {
    if (!done) console.error('\nFailed. Restoring package.json and pnpm-lock.yaml.');
    for (const { file, content } of originalPackageFiles) writeFileSync(file, content);
    run('pnpm', ['install', '--frozen-lockfile'], true);
  }
  if (!keep) rmSync(WORK_DIR, { recursive: true, force: true });
}

if (!onlyCustomizations) {
  console.log(`
Next steps:
- resolve conflicts, then check with: pnpm nx run-many -t lint typecheck test build
- run the migrations of the new version for the ui wrappers: pnpm nx g ${CLI}:healthcheck
- look at /showcase/components`);
}
process.exit(conflicts > 0 ? 1 : 0);
