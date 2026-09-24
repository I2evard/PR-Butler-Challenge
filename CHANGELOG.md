# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Security

- **Fixed a stored cross-site scripting hole in the task list.** `TaskManager.render()`
  assigned user-typed task text with `innerHTML`, so a task named
  `<img src=x onerror="alert(1)">` executed on every render — including after a reload, for
  anyone sharing the browser profile. It now uses `textContent`. A regression test adds that
  exact payload and asserts no `<img>` element reaches the DOM.
- **Removed a credential and an internal hostname from a source comment.** A `TODO` in
  `TaskManager.loadFromStorage()` carried an `sk_test_…` token and the internal endpoint
  `https://api.internal/tasks`. Both are gone; the bare `TODO: migrate to API backend`
  remains, because the migration is still outstanding. The token must be treated as
  disclosed and rotated — deleting it here does not remove it from history.

### Added

- French rendering that actually renders. `switchLanguage()` previously moved a CSS class
  and nothing else, so a complete `fr.json` still displayed English. Added
  `applyTranslations(root = document)` in `src/i18n.ts`, called from `init()` and from
  `switchLanguage()`, which also sets `<html lang>` and `document.title`.
- 20 translation keys added to `fr.json` (2 → 22) and 8 keys added to both catalogues for
  strings that had no key at all: `page.title`, `task.list`, `badge.low`, `badge.medium`,
  `badge.high`, `error.init`, `error.load`, `error.save`.
- `src/ui.ts` with `showError()` / `clearError()`, and an `#app-error` banner in
  `index.html` with its own CSS rule, so failures are visible to the user rather than only
  logged.
- Validation of everything read back from `localStorage`: the payload must parse, must be an
  array, and each entry must carry a safe positive integer id, a string text, a known
  priority and a boolean completed flag. Duplicate ids are dropped, first occurrence wins.
- Quality tooling the repository did not have: Prettier and ESLint, plus the `format`,
  `format:check`, `lint` and `typecheck` scripts.
- A coverage gate. `vitest.config.ts` gained `thresholds: { statements: 80 }`; before it,
  `vitest run --coverage` printed a table and exited 0 at any coverage.
- 117 test cases (2 → 119), including `src/tests/noEnglishLeft.test.ts`, which walks the
  rendered French page and fails on any English string left behind.

### Changed

- `TaskManager.render()` split into `filterTasks()` and `buildTaskRow()`; the method went
  from 50 lines to 9. Done after the suite was green, and no test was edited to accommodate
  it.
- The priority badge and the Delete button are now translated through `t()`, while the raw
  priority stays in the CSS class so styling does not depend on the language.
- Id allocation no longer uses `max + 1`, which **saturates** at `Number.MAX_SAFE_INTEGER`
  and hands out the same id twice — deleting one task would then delete another. Ids are now
  allocated against the ids actually in use.
- The whole source tree formatted with Prettier (`endOfLine: "crlf"`, 4-space override for
  CSS and HTML). `handleSubmit()` was the worst offender.
- `README.md` gained Features, Testing and Contributing sections; TSDoc added across the
  public surface of all five source modules.

### Fixed

- `init()` was an unawaited async call with nothing catching it, and `loadFromStorage()`
  parsed `localStorage` unguarded: a single corrupt entry threw inside the constructor and
  left a blank page with the error only in the console. Both are now guarded and both report
  to the user.
- `saveToStorage()` no longer lets a refused write (quota exceeded, private mode) pass
  silently — the page used to look normal while retaining nothing.
- Stale marker comments removed together with the work they described, rather than left
  behind as lies: `// Long function that should be refactored`,
  `// Note: Translation application is missing - deliberate issue`,
  `// Missing error handling`, `// Poor formatting and style`,
  `// Deliberately poor code quality for PR Butler to fix`.
- `Task.createdAt` is a real `Date` after a reload; it was previously a JSON string typed as
  a `Date`.

### Known gaps

- `scaffold/expected_fixes.json` lists an unused variable named `unusedVariable`. No such
  symbol exists anywhere in the source tree. Reported absent rather than invented.
- "0 lint violations" means none under the rules this change introduced — ESLint's and
  typescript-eslint's recommended sets, with nothing added and nothing disabled.
- Two lines of `TaskManager.allocateId()` are unreachable in practice (the wrap-around when
  the top of the id range is exhausted) and are not covered by a test.
