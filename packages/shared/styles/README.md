# styles

Global SCSS every app shares: SCSS helpers (`abstracts/`), base styles (`base/`) and layout building blocks (`layout/`). Uses theme tokens only. Colors, radius and fonts stay in each app (`src/styles/themes/`, `src/styles/base/_fonts.scss`, `@theme` in `tailwind.css`), because they belong to its brand and its Spartan style.

Apps put `packages/shared` into `stylePreprocessorOptions.includePaths`. Then `styles.scss` uses `@use 'styles/base/global';`, and component SCSS uses `@use 'styles/abstracts' as *;`.
