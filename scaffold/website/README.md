# Task Manager App

A simple task management application built with TypeScript and Vite.

## Features

- **Add tasks** with a priority of low, medium or high.
- **Complete tasks** with a checkbox; completed tasks are styled distinctly and counted separately.
- **Delete tasks** individually from the list.
- **Filter the list** by All, Active or Completed.
- **Live counters** for total and completed tasks, updated on every change.
- **Bilingual interface (English / French).** Every catalogued string is marked up with
  `data-i18n` (or `data-i18n-placeholder` for inputs) and rewritten in place by
  `applyTranslations()` when the language changes — no reload required.
- **Persistence** — tasks are stored in `localStorage` and restored on the next visit.

Two strings are intentionally left untranslated because no key exists for them in
`src/translations/en.json`: the "Your Tasks" heading and the priority badge.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Testing

The suite runs on [Vitest](https://vitest.dev) in a `jsdom` environment.

```bash
npm run test            # run the suite once
npm run test:coverage   # run the suite and print the coverage table
```

**Coverage threshold: statements must stay at or above 80%.** Coverage is collected over
`src/**/*.ts` (see `vitest.config.ts`); `src/main.ts` is included, so a change there needs a
test like any other file.

Notes for writing tests:

- Call `localStorage.clear()` in `beforeEach` — state otherwise leaks between tests and makes
  failures order-dependent.
- `TaskManager.render()` returns early when `#tasks` is absent. Build the DOM it expects before
  asserting on rendered output.
- `saveToStorage` / `loadFromStorage` are private by design. Exercise them through the public
  API (`addTask()` writes, a fresh `new TaskManager()` reads back) rather than widening their
  visibility.
- `src/main.ts` runs `init()` at import time and exports nothing. Mount the DOM first, then use
  `vi.resetModules()` and a dynamic `await import('../main')`, and let the microtask queue drain
  before asserting.

## Contributing

Before opening a pull request, every one of these must pass. None of them may be weakened —
do not lower the coverage threshold, delete a failing test, or add an ignore directive to
silence a rule.

| # | Gate | Command | Passes when |
|---|---|---|---|
| 1 | Tests | `npm run test` | Exit code 0, zero failures |
| 2 | Coverage | `npm run test:coverage` | Statements ≥ 80% |
| 3 | Lint | `npm run lint` | Zero errors, zero warnings |
| 4 | Types | `npx tsc --noEmit` | Zero errors |
| 5 | Formatting | `npm run format:check` | No file would be rewritten |

Additional expectations:

- **Translations stay aligned.** Any key added to `src/translations/en.json` must be added to
  `fr.json` with the same key order. A key present in only one of the two files is a bug.
- **Never render user input as HTML.** Use `textContent`. Task text is user input and is
  displayed verbatim.
- **No secrets in source or comments**, including placeholders that look like real tokens.
- **Document the public surface** with TSDoc: a one-line summary of what the function is *for*,
  `@param` per argument, `@returns` when it returns something.
- Run `npm run format` before committing; the repo is checked out with CRLF line endings and
  `.prettierrc` sets `endOfLine: "crlf"` to match.
