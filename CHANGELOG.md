# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 2026-09-23

### Added

- `scaffold/website/src/translations/fr.json` — the 12 French labels that were
  missing, in `en.json` key order; the catalogue now carries all 14 keys.
- `scaffold/website/src/i18n.ts` — `applyTranslations()`, which rewrites the
  text and input placeholders of any subtree into the active language.
- `scaffold/website/index.html` — 12 `data-i18n` attributes and 1
  `data-i18n-placeholder`, the link between the page and the catalogue. The
  stats labels and the footer caption were each wrapped in their own `<span>`
  so translating them cannot wipe the counters or the year.
- `scaffold/website/src/tests/translations.test.ts` — 4 cases covering catalogue
  alignment, key order and value content.
- `scaffold/website/src/tests/i18n.test.ts` — 10 cases covering lookup,
  fallback and subtree translation.
- `scaffold/website/src/tests/taskManagerBehaviour.test.ts` — 17 cases covering
  toggle, delete, filters, rendering, storage round-trip and corrupt storage.
- `scaffold/website/src/tests/main.test.ts` — 16 cases covering boot, language
  switching, form submission and filter buttons.
- `scaffold/website/package.json` — `format`, `format:check`, `lint` and
  `typecheck` scripts; `jsdom`, `prettier`, `eslint`, `@eslint/js`,
  `typescript-eslint` and `globals` as dev dependencies.
- `scaffold/website/.prettierrc` and `scaffold/website/eslint.config.js` — the
  project had neither a formatter nor a linter.
- `scaffold/website/README.md` — Features, Testing and Contributing sections.
- TSDoc on the full public surface of `scaffold/website/src/taskManager.ts`,
  `scaffold/website/src/main.ts` and `scaffold/website/src/i18n.ts`.

### Changed

- `scaffold/website/src/taskManager.ts` — `render()` split into `filterTasks()`
  and `buildTaskRow()`; it is now a short orchestrator instead of a 50-line
  method doing five jobs. Behaviour is unchanged and no test was edited.
- `scaffold/website/src/taskManager.ts` — the Delete button label now comes from
  the catalogue via `t('button.delete')` instead of being hardcoded.
- `scaffold/website/src/main.ts` — `switchLanguage()` now applies translations
  and repaints the list; previously it moved the active button and nothing else,
  so a complete `fr.json` still rendered English.
- `scaffold/website/src/main.ts` — `handleSubmit()` reindented; it had zero
  indentation and no spaces around `=`, `(` or `|`.
- `scaffold/website/src/styles.css` — Prettier normalisation (spacing inside
  `rgba()`, one selector per line, quote style). Indentation left at 4 spaces to
  match the file.

### Fixed

- `scaffold/website/src/taskManager.ts` — `loadFromStorage()` no longer lets a
  corrupt `localStorage` entry escape the constructor. Invalid JSON, a non-array
  value and malformed entries are discarded instead of blanking the page.
- `scaffold/website/src/main.ts` — the top-level `init()` call now has a
  `.catch`; its rejection was previously unhandled.
- `scaffold/website/src/taskManager.ts` — removed the
  `// Long function that should be refactored` marker, with the refactor done.
- `scaffold/website/src/main.ts` — removed the `// Missing error handling`
  marker, with the handling added.

### Security

- `scaffold/website/src/taskManager.ts` — **stored XSS fixed.** Task text was
  written to the DOM with `innerHTML`, so any user-supplied markup executed on
  every render. It now goes through `textContent`.
- `scaffold/website/src/taskManager.ts` — **credential removed from a comment**
  in `loadFromStorage()`: a `temp auth:` token sitting beside an internal API
  endpoint. Both the token and the endpoint are gone from the source. Note that
  deleting the line does not remove it from the git history — treat the token as
  exposed and rotate it.
