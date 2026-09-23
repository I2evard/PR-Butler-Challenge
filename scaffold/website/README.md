# Task Manager App

A simple task management application.

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

- Add tasks with a low, medium or high priority badge.
- Tick a task off, or delete it; both are persisted immediately.
- Filter the list by **All**, **Active** or **Completed**.
- Live counters for total and completed tasks.
- **Bilingual interface (English / French).** Wording lives in
  `src/translations/*.json` and reaches the page through the `data-i18n` and
  `data-i18n-placeholder` attributes in `index.html`. Switching language repaints
  the static markup *and* the task rows, whose Delete button is built in code.
- Tasks survive a reload via `localStorage`, and what comes back is validated before
  it is trusted: entries that do not describe a task are discarded, duplicate ids are
  dropped, and the user is told on screen when anything was thrown away.

Two strings are deliberately **not** translated, because no catalogue key exists for
them: the "Your Tasks" heading and the priority badge. Adding a key for either is a
product decision, not a cleanup.

## Testing

```bash
npm run test           # run the suite once
npm run test:coverage  # run it with a coverage report
```

- Vitest on a `jsdom` environment. Tests live in `src/tests/`.
- **Coverage threshold: 80% statements.** The suite currently sits at **97.01%**.
- The DOM fixture is read from `index.html` at run time (`src/tests/fixture.ts`)
  rather than retyped, so a change to the page cannot silently drift away from the
  tests that assert on it.
- Coverage counts `src/**/*.ts` only. It says nothing about `index.html`, the CSS or
  the config files — read the number with that denominator in mind.

## Contributing

Before opening a pull request, these must all pass:

| Gate | Command | Passes when |
|---|---|---|
| Tests | `npm run test` | exit code 0, zero failures |
| Coverage | `npm run test:coverage` | statements ≥ 80% |
| Lint | `npm run lint` | zero errors, zero warnings |
| Types | `npm run typecheck` | zero errors |
| Formatting | `npm run format:check` | no file would be rewritten |

Run `npm run format` to fix formatting rather than hand-editing to match.

House rules:

- **Never weaken a gate to make it pass.** Do not lower the coverage threshold, delete
  a failing test or add an ignore directive. If a gate cannot be met, say so in the PR.
- **Never render user input as markup.** Task text goes into the DOM through
  `textContent`. `innerHTML` with user data is a stored-XSS hole.
- **No credentials, tokens or internal hostnames in the source** — including in
  comments. A secret in a comment is a secret in the repository, and history keeps it
  after the line is deleted.
- **Every new failure path has to be visible to the user.** A `catch` that only writes
  to the console turns a loud failure into a silent one; put a message on screen.
- Both translation catalogues carry the same keys in the same order. `en.json` is the
  reference; a key in `fr.json` that is absent from `en.json` is a typo.
