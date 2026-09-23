# Task Manager App

A simple task management application.

## Features

- Add tasks with a low / medium / high priority badge.
- Tick a task off, or delete it; both persist immediately.
- Filter the list by **all**, **active** or **completed**.
- Live counters for total and completed tasks.
- Bilingual interface (English / French) driven by a JSON catalogue — the whole
  page retranslates on the fly, including rows already on screen.
- Tasks survive a reload via `localStorage`, and a corrupt or hand-edited store
  is discarded rather than crashing the page.

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

```bash
npm run test           # run the suite once
npm run test:coverage  # run it with a coverage report
```

The suite runs on [Vitest](https://vitest.dev/) in a `jsdom` environment.
Coverage counts `src/**/*.ts`.

**A pull request must keep statement coverage at 80% or above.** The threshold
is enforced by review, not by the runner: `npm run test:coverage` prints the
table but does not fail on its own, so read the number before you push.

Two conventions the existing tests rely on, worth keeping:

- The DOM fixture is read out of `index.html` rather than retyped, so a change
  to the page cannot silently drift away from what the tests assert.
- A translation is never asserted in the fallback language. English text is
  already present in the markup, so an English assertion would pass even if the
  translation pass were deleted. Assert in French, or seed a sentinel.

## Contributing

Before opening a pull request, every one of these must pass:

| Gate | Command | Bar |
|---|---|---|
| Tests | `npm run test` | exit 0, no failures |
| Coverage | `npm run test:coverage` | statements ≥ 80% |
| Lint | `npm run lint` | 0 errors, 0 warnings |
| Types | `npm run typecheck` | 0 errors |
| Formatting | `npm run format:check` | no file would be rewritten |

Run `npm run format` to apply formatting.

Notes for contributors:

- **Do not weaken a gate to get past it.** Lowering the threshold, deleting a
  failing test or adding an ignore directive turns a red build into a silent
  one. If a gate cannot be met, say so in the PR.
- **Never write user input into the DOM with `innerHTML`.** Task text goes
  through `textContent`; the only `innerHTML` in the codebase assigns a constant
  empty string to clear the list.
- **Keep `en.json` and `fr.json` aligned**, same keys in the same order. An
  element is translated by tagging it `data-i18n="<key>"`, or
  `data-i18n-placeholder="<key>"` for an input placeholder.
- The repository is checked out with **CRLF** line endings, and `.prettierrc`
  is set to match. Do not change `endOfLine`.
