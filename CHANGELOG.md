# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **Fixed a stored XSS hole in the task list.** `render()` in
  `scaffold/website/src/taskManager.ts` wrote user-supplied task text with
  `innerHTML`, so a task named `<img src=x onerror=...>` executed on every paint.
  It now uses `textContent`; a regression test asserts the rendered node has no
  element children.
- **Removed a credential from a source comment** in
  `scaffold/website/src/taskManager.ts`. `loadFromStorage()` carried a `temp auth:`
  token. The token line is gone and the internal hostname has been stripped from the
  `TODO: migrate to API backend` line above it; the TODO itself is kept, because the
  intention to migrate is legitimate information for the next reader.
  Note for reviewers: deleting the line does not remove the token from git history.
- **Hardened restoration from `localStorage`** in
  `scaffold/website/src/taskManager.ts`. Stored data is now validated field by field
  before it is trusted: `id` must be a safe positive integer, duplicate ids are
  dropped, and `createdAt` is revived into a real `Date`. Two stored tasks sharing an
  id previously meant one click deleted both rows and a checkbox toggled the wrong one.

### Added

- **French locale completed** — `scaffold/website/src/translations/fr.json` went from
  2 keys to the full 14, in `en.json` key order.
- **Translations now reach the DOM.** `applyTranslations()` added to
  `scaffold/website/src/i18n.ts`; `scaffold/website/index.html` gained 12 `data-i18n`
  attributes and 1 `data-i18n-placeholder`. The two stats labels and the footer label
  were each wrapped in their own `<span>` so that translating them no longer wipes the
  counters or the year beside them.
- **Visible failure reporting.** `scaffold/website/src/main.ts` shows
  `<li class="app-error">` in the task list when start-up fails;
  `scaffold/website/src/taskManager.ts` shows `<li class="storage-notice">` when saved
  data had to be discarded.
- **Test suite** — `scaffold/website/src/tests/` gained `fixture.ts`, `i18n.test.ts`,
  `main.test.ts`, `taskManagerBehaviour.test.ts` and `translations.test.ts`: 55 new
  cases on top of the 2 that shipped. The DOM fixture is read from `index.html` rather
  than retyped.
- **Toolchain** — Prettier and ESLint added to `scaffold/website/package.json`, with
  `scaffold/website/.prettierrc` and `scaffold/website/eslint.config.js` matched to the
  style already in the repository. New scripts: `format`, `format:check`, `lint`,
  `typecheck`.
- **`jsdom` added as a dev dependency** in `scaffold/website/package.json`.
  `vitest.config.ts` declared `environment: 'jsdom'` without it, so the suite could not
  start at all.
- **Documentation** — `scaffold/website/README.md` gained **Features**, **Testing** and
  **Contributing**; TSDoc added to every exported function and public method in
  `scaffold/website/src/i18n.ts`, `main.ts` and `taskManager.ts`.

### Changed

- **`render()` split** in `scaffold/website/src/taskManager.ts`, from 50 lines doing
  five jobs into a short orchestrator plus `filterTasks()`, `buildTaskRow()` and
  `buildStorageNotice()`. Behaviour-preserving: the same 57 tests pass against both
  shapes, with no test edited.
- **Formatting** applied across `scaffold/website/index.html`, `src/i18n.ts`,
  `src/main.ts`, `src/styles.css`, `src/taskManager.ts` and
  `src/translations/fr.json`. `handleSubmit()` in `src/main.ts` — which had zero
  indentation and no spaces around operators — is reindented.
- **Marker comments removed together with the work they described**, in
  `scaffold/website/src/taskManager.ts` (`// Long function that should be refactored`)
  and `scaffold/website/src/main.ts` (`// Missing error handling`).

### Fixed

- **Start-up failures no longer disappear.** `init()` in
  `scaffold/website/src/main.ts` is `async` and its rejection was uncaught, so a
  failed boot left a blank page with nothing to explain it. It now has a `.catch` that
  logs *and* puts a message on screen.
- **`JSON.parse` in `loadFromStorage()` is guarded**, in
  `scaffold/website/src/taskManager.ts`. Corrupt `localStorage` used to throw out of
  the `TaskManager` constructor.
- **Task creation survives a saturated id.** `nextId` was `Math.max(...ids) + 1`; a
  stored id of `Number.MAX_SAFE_INTEGER` made it stop incrementing, so every task
  created afterwards got the same id. Ids are now allocated against the set in use.
- **The Delete button follows the chosen language.** It is built in code, so it was the
  one label the markup-based translation pass could not reach; it now uses
  `t('button.delete')`.

### Not changed, and why

- `scaffold/expected_fixes.json` lists an unused variable named `unusedVariable`. No
  such symbol exists anywhere in the source; it is reported as absent rather than
  invented to match the answer key.
- The "Your Tasks" heading and the priority badge have no key in `en.json` and are left
  in English. Inventing a key would put a string in the catalogue that no one asked for.
