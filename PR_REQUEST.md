# fix(website): close stored XSS, remove leaked credential, and make the French UI actually render

## Summary

The task manager shipped a stored XSS hole, a test-key credential and an internal hostname in
a source comment, and a French locale that could never appear on screen. This change closes
all three, hardens everything read back from `localStorage`, and puts real gates around the
result — a coverage threshold the runner enforces, a linter, a formatter and a type check,
none of which the repository had.

The suite could not run at all before this change: `vitest.config.ts` asks for `jsdom` and
`package.json` did not list it. The baseline was therefore **undefined**, not low — the
`current_coverage: 30` in `scaffold/expected_fixes.json` was never measurable. With `jsdom`
installed the real baseline measured 26.02% over 2 tests.

## What reviewers should look at first

1. `src/taskManager.ts` — `text.innerHTML = task.text` became `textContent`. This is the
   security fix; everything else can wait.
2. `src/taskManager.ts` — the credential removed from the `loadFromStorage()` comment. **The
   token must be rotated.** Deleting the line does not remove it from history, and this
   branch is not the place to pretend otherwise.
3. `src/tests/noEnglishLeft.test.ts` — the only check in the suite that can catch an English
   string which never had a key. Please read it before trusting the translation work.
4. `src/taskManager.ts` — `allocateId()`. The old `max + 1` saturates at
   `Number.MAX_SAFE_INTEGER` and issues duplicate ids, so deleting one task deletes another.

## Metrics

| | Before | After |
|---|---|---|
| Suite runs at all | no — `MISSING DEPENDENCY 'jsdom'` | yes |
| Statement coverage | undefined, then 26.02% once `jsdom` was installed | **99.53%** |
| Coverage enforced by the runner | no — printed a table, exited 0 at any coverage | yes — `thresholds: { statements: 80 }` |
| Test cases | 2 | **119** across 6 files |
| Keys in `fr.json` | 2 | 22 |
| Keys in `en.json` | 14 | 22 |
| Lint / format / typecheck | no such scripts | 0 errors, 15 files linted |
| `render()` | 50 lines | 9 lines, split in two |
| Mutants seeded / killed | — | 15 / 15 |

## Keys added beyond the 14 the brief required, and why

| Key | Why it was added |
|---|---|
| `page.title` | The document title `Task Manager` had no key, so a French page still carried an English browser tab. `applyTranslations()` now sets it. |
| `task.list` | `Your Tasks` sits directly beside `Add New Task`, which does have a key. That is an omission, not a decision to leave it English. |
| `badge.low` | The priority badge is built in TypeScript and displayed `priority.toUpperCase()`, which no `data-i18n` can reach. `priority.low` was unusable for it — it reads `Low Priority`, not a short badge. |
| `badge.medium` | Same, for medium priority. |
| `badge.high` | Same, for high priority. |
| `error.init` | New user-facing string: start-up failed. Every string a user can read needs a key. |
| `error.load` | New user-facing string: saved tasks could not be read and were discarded. |
| `error.save` | New user-facing string: tasks could not be saved, storage may be full. |

The two language buttons are deliberately left untranslated — each is already written in the
language it selects.

## Checklist

- [x] Stored XSS closed; a regression test injects `<img src=x onerror="alert(1)">` and
      asserts no element is created
- [x] Credential and internal hostname removed from source; bare `TODO` kept
- [ ] **Token rotated by whoever owns it** — cannot be done from this branch
- [x] `en.json` and `fr.json` hold identical key sets in identical order
- [x] No English left on the French page, proven by a walk over every text node and visible
      attribute, not by a key count
- [x] Every displayed string has a key; every new element has a CSS rule; `<html lang>` and
      `document.title` follow the language
- [x] `npm run test` — 119 passed
- [x] `npm run test:coverage` — 99.53% statements, gate enforced by the runner and proven to
      fail at 32.46%
- [x] `npm run lint` — 0 errors over 15 files
- [x] `npm run typecheck` — 0 errors
- [x] `npm run format:check` — clean, including `index.html`
- [x] `render()` split, suite green before and after, no test edited
- [x] No stale marker comment left behind
- [x] Nothing weakened — no lowered threshold, no deleted test, no ignore directive
- [x] Tests written by an independent agent; `src/tests/` is guarded and was never written
      from the implementation side
- [ ] Not committed, not pushed — this branch is prepared, not shipped

## How this was verified

Fifteen defects were seeded one at a time into a throwaway copy outside the repository —
`textContent`→`innerHTML`, `toggleTask` always completing, the filters swapped,
`saveToStorage` made a no-op, `t()` returning `''`, `applyTranslations()` dropped from
`init()` only, plus one per guard this change introduced. All fifteen were killed, every
failure was a named test rather than a collection error, the unseeded copy was green first,
and the case count stayed at 119 in every run.

The coverage gate was proven to fire, not assumed: with test files removed in the throwaway
copy, 61 cases still passed and the command exited 1 with
`ERROR: Coverage for statements (32.46%) does not meet global threshold (80%)`.

## Commit message

```
fix(website): close stored XSS in task rendering and harden persistence

The task list rendered user-supplied text with innerHTML, so a task named
<img src=x onerror="alert(1)"> executed on every render and survived a reload.
It now renders with textContent, and a regression test asserts that payload
creates no element.

Also removes a test-key credential and an internal hostname from a comment in
loadFromStorage(); the token must be rotated separately, as deleting it here
does not remove it from history.

Persistence is now treated as untrusted input: the stored payload is parsed
under guard, must be an array, and each entry is validated before use, with
duplicate ids dropped. Id allocation no longer uses max + 1, which saturates
at Number.MAX_SAFE_INTEGER and issues duplicate ids. Storage write failures
and start-up failures are surfaced to the user instead of only logged.

Completes the French locale and makes it render: switchLanguage() only moved
a CSS class, so a complete fr.json still displayed English. Adds
applyTranslations(), which also sets <html lang> and document.title.

Adds the missing quality tooling: prettier, eslint, format/format:check/lint/
typecheck scripts, and a coverage threshold the runner enforces. Coverage
moves from undefined (the suite could not run without jsdom) to 99.53% over
119 cases.
```

**Do not merge before the leaked token has been rotated.**
