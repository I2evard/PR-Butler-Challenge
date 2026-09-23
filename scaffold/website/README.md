# Task Manager App

A small bilingual task manager written in TypeScript, built with Vite and tested with Vitest.
Tasks live in `localStorage`, so the list survives a reload without any backend.

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

- **Add, complete and delete tasks**, each with a low / medium / high priority.
- **Filter the list** by all, active or completed. The filter affects the display only; it is
  not persisted, so a reload returns to showing everything.
- **Live counters** for total and completed tasks.
- **Bilingual interface, English and French.** Every translatable element carries a `data-i18n`
  anchor, and switching language rewrites them in place — no reload. A key with no translation
  renders as the key itself, which makes a gap in the catalogue visible instead of silent.
- **Persistence in `localStorage`**, written after every change. Corrupt or foreign data is
  reported and discarded rather than crashing the app on boot.
- **Task text is never parsed as HTML.** It is written with `textContent`, so markup typed into
  the input is displayed literally.

## Testing

```bash
npm run test           # run the suite once
npm run test:coverage  # run it with a coverage report
```

The suite uses Vitest with the `jsdom` environment, so DOM-facing code is exercised for real
rather than mocked. Coverage is measured by `@vitest/coverage-v8` over `src/**/*.ts`.

**The project holds a coverage floor of 80% of statements.** It is a floor, not a target: the
way to raise it is to test behaviour that is not yet covered, never to narrow what coverage
counts. Lowering the threshold, deleting a failing test or adding an ignore directive to get a
green run defeats the purpose of having the gate.

Two conventions the existing tests follow, worth keeping:

- `localStorage.clear()` and a reset of `document.body` in `beforeEach`. Without them, state
  leaks between tests and failures become order-dependent — the hardest kind to diagnose.
- Assertions on observable behaviour rather than on call counts. `expect(manager.getTasks())
  .toHaveLength(1)` survives a refactor; an assertion on a spy does not.

## Contributing

Before opening a pull request, every one of these must pass:

| Gate | Command | Passes when |
|---|---|---|
| Tests | `npm run test` | Exit code 0, zero failures |
| Coverage | `npm run test:coverage` | Statements ≥ 80% |
| Lint | `npm run lint` | Zero errors, zero warnings |
| Types | `npm run typecheck` | Zero errors |
| Formatting | `npm run format:check` | No file would be rewritten |

`npm run format` applies the formatting; `npm run format:check` only reports. Both read
`.prettierrc`, whose settings match the style already in the repository — no semicolons, single
quotes, two-space indent — so formatting a file does not rewrite lines nobody touched.

Type checking is separate from the test run on purpose: Vitest transpiles without type-checking,
so a type error passes the entire suite and breaks the build. `npm run typecheck` catches it in
about two seconds.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/):
`<type>(<scope>): <subject>`, subject in the imperative and under 72 characters.
