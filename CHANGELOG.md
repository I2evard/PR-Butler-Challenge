# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased] — 2026-09-23

### Security

- **Closed a stored XSS hole in `scaffold/website/src/taskManager.ts`.** The task text was
  written to the DOM with `innerHTML`, so a task named `<img src=x onerror=...>` executed on
  every repaint. It is now written with `textContent`; there is no case in this application
  where task text should be parsed as markup.
- **Removed a credential from a comment in `scaffold/website/src/taskManager.ts`.** A
  `temp auth:` token sat in `loadFromStorage()`. The token line is gone and the internal
  hostname has been stripped from the `// TODO: migrate to API backend` line above it; the
  TODO itself is kept, because the intention to migrate is information the next reader needs.
- **Validated everything read back out of `localStorage`** in
  `scaffold/website/src/taskManager.ts`. Entries are rejected unless every field the `Task`
  interface declares type-checks, and `id` must be a safe positive integer. Duplicate ids are
  dropped on restore — `deleteTask` filters by id, so two tasks sharing one meant a single
  click deleted both.

### Added

- **French translations** for the twelve missing keys in
  `scaffold/website/src/translations/fr.json` (2 keys → 22).
- **Five keys for strings that had none**, in both `en.json` and `fr.json`: `task.list` for the
  "Your Tasks" heading, `badge.low` / `badge.medium` / `badge.high` for the priority chip, and
  `page.title` for the browser-tab title. They were the last English words on the French page.
  The heading in particular sat beside `Add New Task`, which *did* have a key — two sibling
  headings, one translated and one not.
- **`scaffold/website/src/tests/noEnglishLeft.test.ts`**, which renders the real page in French
  and fails on any text node, `placeholder`, `title`, `aria-label` or `document.title` that is
  not a French catalogue value and not on an explicit allow-list. The allow-list is the two
  language buttons and the text the user typed. Key counting and catalogue comparison both exit
  0 on a page with English on it; this test does not.
- **`applyTranslations()` in `scaffold/website/src/i18n.ts`**, which rewrites every
  `[data-i18n]` text and `[data-i18n-placeholder]` placeholder and sets both
  `document.documentElement.lang` and `document.title`. Before this, `switchLanguage()` moved
  the active button and nothing else, so a fully populated `fr.json` still rendered English.
- **Translation attributes in `scaffold/website/index.html`**: thirteen `data-i18n`, one
  `data-i18n-placeholder`, and three new `<span>` wrappers so that tagging the two stats
  labels and the footer text does not wipe the counters or the year.
- **Three new catalogue keys** in both `en.json` and `fr.json` — `error.storage.read`,
  `error.storage.write`, `error.boot` — for the sentences this change puts on screen.
- **Error handling on both storage paths and on boot**, in
  `scaffold/website/src/taskManager.ts` and `scaffold/website/src/main.ts`. A rejected read, a
  rejected write and a failed boot each put a visible `.app-notice` where the user is already
  looking, and a later successful write clears it.
- **`.app-notice`, `.stats-label` and `footer .footer-text` rules** in
  `scaffold/website/src/styles.css`, so every element this change adds to the page is styled.
- **81 test cases** across `scaffold/website/src/tests/` — `markup.test.ts`,
  `translations.test.ts`, `i18n.test.ts`, `main.test.ts`, `noEnglishLeft.test.ts` and the
  extended `taskManager.test.ts` — plus the shared DOM fixture `src/tests/fixture.ts`, which
  reads the page and its `<title>` out of `index.html` instead of retyping them.
- **A toolchain**: `prettier`, `eslint`, `@eslint/js` and `typescript-eslint`, with
  `scaffold/website/.prettierrc`, `scaffold/website/eslint.config.js`, and the `format`,
  `format:check`, `lint` and `typecheck` scripts in `scaffold/website/package.json`.
- **`jsdom`** as a dev dependency. `vitest.config.ts` declared `environment: 'jsdom'` and
  `package.json` did not list it, so the suite could not start at all.
- **An enforced coverage threshold** in `scaffold/website/vitest.config.ts`
  (`thresholds: { statements: 80 }`). `vitest run --coverage` exits 0 at any coverage, so the
  80% in the brief had never once been able to turn red.
- **`README.md` sections** in `scaffold/website/README.md`: Features, Testing, Contributing.

### Changed

- **Split `render()` in `scaffold/website/src/taskManager.ts`** from 50 lines doing five jobs
  into a 16-line orchestrator plus `filterTasks()`, `buildTaskRow()` and `buildNoticeRow()`.
  Behaviour-preserving: the suite was green before and after, with no test edited.
- **Replaced the `Math.max(...ids) + 1` id counter** in
  `scaffold/website/src/taskManager.ts` with `allocateId()`, which allocates against the ids in
  use and wraps at the edge of the safe range. A stored `Number.MAX_SAFE_INTEGER` passes
  validation, and `max + 1` then stopped incrementing — every task created afterwards got the
  same id.
- **Reformatted `scaffold/website/index.html`, `src/main.ts`, `src/taskManager.ts`,
  `src/i18n.ts` and `src/styles.css`** with Prettier. `handleSubmit()` in `main.ts` had zero
  indentation and no spaces around `=`, `(` or `|`.
- **`switchLanguage()` in `scaffold/website/src/main.ts`** now applies the translations and
  repaints the task list, instead of only moving the `active` class.
- **The priority chip is translated in `scaffold/website/src/taskManager.ts`.** It was
  `task.priority.toUpperCase()`, which reads `LOW` in every language; it is now
  `t('badge.' + priority)`. The `priority-*` class still carries the raw priority, because the
  colour must not move with the language.

### Fixed

- **`init()` in `scaffold/website/src/main.ts` is no longer an unhandled rejection.** It has a
  `.catch` that logs *and* shows a message on the page — inside the task list, or at the top of
  the body when the page has no task list.
- **`loadFromStorage()` no longer throws out of the constructor** on corrupt `localStorage`
  data. `JSON.parse` was unguarded, so a bad value gave the user a blank page with nothing in
  the interface to say why.
- **`saveToStorage()` no longer throws between the push and the repaint.**
  `localStorage.setItem` throws on a full quota and in Safari's private mode; the task used to
  end up in memory with the page unchanged and storage empty, and nothing said so.
- **Removed two marker comments, each with its work done**:
  `// Long function that should be refactored` and `// Missing error handling` in
  `scaffold/website/src/taskManager.ts` and `scaffold/website/src/main.ts`. Three further
  comments describing deliberate defects were removed with the defects.
