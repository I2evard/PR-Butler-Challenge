# Task Manager App

A simple task management application, in English and French.

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

- Add tasks with a low / medium / high priority.
- Mark a task complete, or delete it.
- Filter the list by all / active / completed. Filtering never removes anything — the
  counters keep reporting the full list.
- Full English and French interface. The language buttons repaint both the static markup
  and the parts the code builds (the priority badge and the Delete button), and they move
  `<html lang>` and the document title with them.
- Tasks persist in `localStorage` and are re-read on the next visit. That store is treated
  as untrusted input: anyone can edit it from the browser console, so entries are validated
  one by one and anything malformed is dropped instead of blanking the page.
- Failures are shown on the page, in a banner, not only in the console. A storage write that
  is refused, a saved list that cannot be read, or a start-up that fails all surface to the
  user in the current language.

## Testing

Vitest with jsdom. `jsdom` is required by `vitest.config.ts` — without it the suite cannot
run at all, so there is no coverage number to read.

```bash
npm run test           # 119 cases across 6 files
npm run test:coverage  # same suite, plus the coverage gate
```

**Coverage is enforced by the runner, not by reading the table.** `vitest.config.ts` sets
`thresholds: { statements: 80 }`, so `npm run test:coverage` exits non-zero when statement
coverage falls under 80% even though every test passes. Current statement coverage is
99.53%.

The other gates:

```bash
npm run lint          # eslint, 0 errors
npm run typecheck     # tsc --noEmit, 0 errors
npm run format:check  # prettier, rewrites nothing
npm run format        # prettier, applies the fixes
```

One test deserves naming: `src/tests/noEnglishLeft.test.ts` renders the page, switches to
French, walks every text node plus `placeholder`, `title`, `aria-label` and
`document.title`, and fails on any word-bearing string that is not a French catalogue value.
Counting keys or comparing catalogues cannot catch an English heading that never had a key
in the first place — this can.

## Contributing

- Line endings are **CRLF**. Prettier is configured with `endOfLine: "crlf"`; leave it alone.
  With the default (`lf`) a single format run rewrites every line of every file.
- Style is enforced, not argued: run `npm run format` before pushing, and `npm run lint`,
  `npm run typecheck` and `npm run test:coverage` must all exit 0.
- **Translations come in pairs.** `en.json` and `fr.json` must hold the same keys in the same
  order; the suite fails otherwise. Any string a user can read needs a key — including text
  built in TypeScript, which `data-i18n` cannot reach.
- A new element that carries a translated label needs a CSS rule as well. `.stats span` is
  styled as a counter, so a label span dropped in beside one inherits the wrong style.
- Never weaken a check to make it pass: no lowered threshold, no deleted test, no ignore
  directive. If a test is genuinely wrong, say so rather than editing it into agreement.
