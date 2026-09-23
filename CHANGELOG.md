# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **Fixed a stored XSS hole in the task list.** `render()` in
  `scaffold/website/src/taskManager.ts` assigned user-supplied task text with
  `innerHTML`, so markup typed into the task field was parsed and executed on every
  render — and, because tasks are persisted, on every subsequent page load. Switched to
  `textContent`. Task text is never HTML in this application.
- **Removed a credential from a source comment.** `loadFromStorage()` in
  `scaffold/website/src/taskManager.ts` carried a `temp auth:` token beside an internal
  API endpoint. Deleting the line removes it from the working tree only; the value must
  still be treated as disclosed and rotated, because version-control history retains it.

### Added

- **French translations for the 12 missing catalogue keys** in
  `scaffold/website/src/translations/fr.json`: `task.placeholder`, `priority.low`,
  `priority.medium`, `priority.high`, `button.add`, `filter.all`, `filter.active`,
  `filter.completed`, `stats.total`, `stats.completed`, `button.delete` and
  `footer.text`. The file now carries all 14 keys, in the same order as `en.json`.
- **Runtime translation of the DOM.** New `applyTranslations(root = document)` in
  `scaffold/website/src/i18n.ts` walks `[data-i18n]` and `[data-i18n-placeholder]` and
  rewrites `textContent` and the `placeholder` attribute.
- **Translation markup in `scaffold/website/index.html`** — 12 `data-i18n` attributes and
  1 `data-i18n-placeholder`. The two stats labels and the footer caption were wrapped in
  their own `<span>` so that translating the label does not destroy the adjacent counter
  element.
- **A formatting and linting toolchain**, which the project previously lacked:
  `prettier`, `eslint`, `@eslint/js` and `typescript-eslint` in
  `scaffold/website/package.json`, with `scaffold/website/.prettierrc` and
  `scaffold/website/eslint.config.js`.
- **`format`, `format:check` and `lint` scripts** in `scaffold/website/package.json`.
- **`jsdom` as a dev dependency** in `scaffold/website/package.json`.
- **TSDoc on the public surface** of `scaffold/website/src/taskManager.ts`,
  `scaffold/website/src/main.ts` and `scaffold/website/src/i18n.ts`.
- **Features, Testing and Contributing sections** in `scaffold/website/README.md`.
- **This changelog** and `PR_REQUEST.md`, both at the repository root.

### Changed

- **The Delete button label is now translated.** `render()` in
  `scaffold/website/src/taskManager.ts` used the hard-coded string `'Delete'`; it now
  calls `t('button.delete')`.
- **`switchLanguage()` now repaints the interface.** In `scaffold/website/src/main.ts` it
  previously moved the `active` class between the two language buttons and returned — a
  comment on its last line admitted the translation step was missing — so a fully
  populated `fr.json` still rendered English. It now calls `applyTranslations()` and
  re-renders the task list. `init()` calls `applyTranslations()` on startup for the same
  reason.
- **Reformatted `scaffold/website/src/main.ts`, `scaffold/website/src/taskManager.ts` and
  `scaffold/website/src/styles.css`** with Prettier. `handleSubmit()` in `main.ts` had
  zero indentation and no spaces around `=`, `(` or `|`. `endOfLine` is set to `crlf` to
  match the checkout, so no file was rewritten purely for line endings.

### Fixed

- **`jsdom` was missing from `scaffold/website/package.json`** while
  `scaffold/website/vitest.config.ts` declared `environment: 'jsdom'`. The test suite
  could not start at all; `npm run test` aborted with `MISSING DEPENDENCY 'jsdom'`.

### Not changed (deliberately)

- The `<title>` element, the "Your Tasks" heading and the priority badge in
  `scaffold/website/index.html` / `taskManager.ts` have no key in `en.json` and were left
  in English rather than inventing catalogue entries nobody asked for.
- The language buttons read "English" and "Français"; language names are conventionally
  written in their own language and are not translated.
- `scaffold/expected_fixes.json` lists an unused variable named `unusedVariable`. No such
  symbol exists in the source, and none was invented to match.
