# Task Manager App

A simple task management application, written in TypeScript and bundled with Vite. Tasks live
in `localStorage`; the interface is available in English and French.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Features

- **Add, complete and delete tasks** — each task carries a priority (`low`, `medium`, `high`)
  and a creation date. `src/taskManager.ts` owns the list and the rendering.
- **Filter the list** — `All` / `Active` / `Completed`, driven by the `.filter-btn` buttons in
  `index.html`.
- **Live counters** — total and completed, kept in `#total-count` and `#completed-count`.
- **English and French interface** — every string in `index.html` that the user reads carries a
  `data-i18n` (or `data-i18n-placeholder`) attribute, and `applyTranslations()` in
  `src/i18n.ts` rewrites them on boot and on every language switch. The same pass moves
  `document.documentElement.lang`, so assistive technology follows the change, and
  `document.title`, so the browser tab does too. Strings the renderer owns — the delete button,
  the `FAIBLE`/`MOYENNE`/`ÉLEVÉE` priority chip, a pending storage notice — go through `t()` in
  `src/taskManager.ts` and repaint with the rest. The catalogues are
  `src/translations/en.json` and `src/translations/fr.json`; they must carry identical key sets
  in identical order.
- **Persistence that fails loudly** — `loadFromStorage()` validates every stored entry before
  restoring it (id must be a safe positive integer, duplicates are dropped) and
  `saveToStorage()` catches a rejected write. Either failure puts a visible `.app-notice` row
  in the task list rather than leaving the page silently wrong.

  **Exactly one thing on this page is allowed to stay in English**: the two language buttons,
  because each is already written in the language it selects — translating them would show
  "Anglais" to someone who reads only English. Everything else the user can see has a key.
  `src/tests/noEnglishLeft.test.ts` enforces that: it renders the real page in French and fails
  on any text node, `placeholder`, `title`, `aria-label` or `document.title` that is not a
  French catalogue value, is not on that allow-list, and is not what the user typed.

## Testing

The suite runs on Vitest in a `jsdom` environment. All test files live in `src/tests/`.

```bash
npm run test           # run the suite once
npm run test:coverage  # run it with the v8 coverage reporter
```

**Coverage threshold: 80% of statements.** It is enforced by the runner, not by prose —
`vitest.config.ts` declares `coverage.thresholds.statements = 80`, so `npm run test:coverage`
exits non-zero below the line. `coverage.include` is `src/**/*.ts`, which also counts the
shared DOM fixture `src/tests/fixture.ts`; that is deliberate, and it costs a few points.

The DOM fixture is read from `index.html` rather than retyped, so a change to the page that
breaks the `data-i18n` wiring fails the suite instead of drifting silently.

**One test deserves its own paragraph.** Counting catalogue keys exits 0. Comparing `en.json`
to `fr.json` exits 0. A suite of per-element assertions exits 0. All three can be green while
an English heading sits on the French page, because they check a proxy — *are the keys there* —
instead of the requirement, which is *is there any English left*.
`src/tests/noEnglishLeft.test.ts` checks the requirement. It renders the page, switches to
French, and walks every visible surface against an explicit allow-list. A new untagged string
breaks the suite the day it is added, rather than waiting for someone to look at the screen.

## Contributing

Every change must clear the same gates the CI does, in this order:

| Gate | Command | Passes when |
|---|---|---|
| Tests | `npm run test` | exit code 0, zero failures |
| Coverage | `npm run test:coverage` | statements ≥ 80% (enforced by the runner) |
| Lint | `npm run lint` | zero errors (`eslint src --max-warnings 0`) |
| Types | `npm run typecheck` | zero errors (`tsc --noEmit`) |
| Formatting | `npm run format:check` | no file would be rewritten |

`npm run format` applies the formatter. The repository is checked out with **CRLF** line
endings, and `.prettierrc` sets `endOfLine: "crlf"` to match; `src/styles.css` and `index.html`
are indented with four spaces and have a `tabWidth` override for that reason.

Two further rules this project holds to:

- **Never weaken a check to make it pass.** Do not lower the coverage threshold, delete a
  failing test or add an ignore directive to silence the linter.
- **Test files in `src/tests/` are written by a dedicated test author**, independently of
  whoever changes the production code. A test that existed before a fix, and that the fixer
  could not rewrite, is what proves the defect is gone.
