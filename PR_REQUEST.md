# fix(scaffold): repair stored XSS and complete the French locale

## Summary

This branch takes `scaffold/website` from "does not build a test run" to ship-ready.

The headline item is a **stored cross-site scripting hole**: `render()` wrote
user-supplied task text into the page with `innerHTML`, so anything typed into the task
field was parsed as markup — and because tasks are persisted in `localStorage`, the
payload re-fired on every subsequent page load. It now uses `textContent`. A second
security item, a `temp auth:` credential sitting in a source comment next to an internal
API endpoint, has been deleted. Neither of these appears in `scaffold/expected_fixes.json`.

The French locale was **half-built in two independent ways**, and fixing only one would
have looked like success while changing nothing a user sees. `fr.json` carried 2 of the
14 catalogue keys, so 12 were missing; separately, `switchLanguage()` moved the highlight
between the two language buttons and returned without ever calling `t()` — a comment on
its last line admitted as much. A fully populated `fr.json` would still have rendered
English. Both halves are fixed: the catalogue is complete, and `applyTranslations()` now
rewrites the marked-up DOM whenever the language changes.

The suite could not run at all before this branch — `vitest.config.ts` declared
`environment: 'jsdom'` while `package.json` did not depend on `jsdom`, so `npm run test`
aborted with `MISSING DEPENDENCY`. Baseline coverage was therefore not "low", it was
unobtainable until that was installed.

## Metrics

| | Before | After |
|---|---|---|
| Statements | **26.02%** | **100%** |
| Branches | 69.23% | 100% |
| Functions | 57.14% | 100% |
| Lines | 26.02% | 100% |
| Tests | 2 | **42** |
| Test files | 1 | 4 |
| Lint errors | n/a — no linter in the project | 0 across 5 files |
| Translation keys in `fr.json` | 2 of 14 | 14 of 14 |

Baseline measured at the preflight, immediately after installing `jsdom` and before any
source change. For the curious: coverage read 32.18% after Steps 1 and 2, before any test
was written — the cleanup alone moves the number, which is why the baseline is the
preflight figure and not a later one.

Coverage is reported over `src/**/*.ts`. `src/types.ts` does not appear in the table
because it contains only interfaces and type aliases — zero runtime statements.

## The coverage number is not the evidence

100% statement coverage says every line executed, not that any assertion would notice a
line going wrong. The suite was therefore checked by seeding defects into a throwaway
copy of `src/` outside the repository and confirming a **named** test dies for each.

**Score: 5 seeded, 5 caught. No survivors.**

| Seeded defect | Caught by |
|---|---|
| `textContent` → `innerHTML` in `render()` | `never turns task text into live markup` |
| `toggleTask` always sets `completed = true` | `returns a task to not-completed when toggled twice` |
| active/completed filters swapped | `shows only the incomplete task under the active filter` (+2 more) |
| `saveToStorage` made a no-op | `restores the saved tasks into a freshly constructed manager` (+3 more) |
| `t()` returns `''` instead of the key | `returns the key itself when the key is unknown` (+2 more) |

Each mutant took down only the tests that should care about it — the other 38–41 stayed
green — so these are targeted assertions, not a suite that collapses on any change. The
throwaway copy has been deleted.

## Checklist

- [x] All 14 French translation keys present in `fr.json` — validation command exits 0, both directions checked
- [x] Code formatted consistently — `npm run format:check` reports no file would be rewritten
- [x] No lint violations — `npm run lint` → 0 errors over 5 files
- [x] Test coverage ≥ 80% — measured 100% statements
- [x] All tests pass — 42/42, exit code 0
- [x] No type errors — `npx tsc --noEmit` exit code 0
- [x] TSDoc on every exported function and public method — 19 blocks across the three modules
- [x] `README.md` has Features, Testing and Contributing
- [x] `CHANGELOG.md` generated, reflecting this run
- [x] `PR_REQUEST.md` generated with measured coverage
- [x] Conventional commit message prepared
- [x] No check was weakened to pass — no lowered threshold, no deleted or skipped test, no ignore directive
- [x] The suite catches seeded defects — 5/5, no survivors
- [x] A second full run changes nothing — verified by content hash over the tree
- [x] No gate passed vacuously — the linter named 5 files, the suite ran 42 cases against a baseline of 2

## Files touched

**Modified**

- `scaffold/website/src/taskManager.ts` — XSS fix, credential removed, translated Delete label, TSDoc, reformatted
- `scaffold/website/src/main.ts` — translation wiring in `init()` and `switchLanguage()`, TSDoc, reformatted
- `scaffold/website/src/i18n.ts` — new `applyTranslations()`, TSDoc
- `scaffold/website/src/translations/fr.json` — 12 keys added, order matching `en.json`
- `scaffold/website/index.html` — 12 `data-i18n` + 1 `data-i18n-placeholder`
- `scaffold/website/src/styles.css` — formatting only
- `scaffold/website/package.json` — `jsdom` + toolchain; `format`, `format:check`, `lint` scripts
- `scaffold/website/package-lock.json` — dependency install
- `scaffold/website/README.md` — Features, Testing, Contributing

**Added**

- `scaffold/website/.prettierrc`, `scaffold/website/eslint.config.js`
- `scaffold/website/src/tests/taskManagerBehaviour.test.ts` (21), `i18n.test.ts` (10), `main.test.ts` (9)
- `CHANGELOG.md`, `PR_REQUEST.md`

**Deliberately unchanged** — `src/types.ts`, `src/tests/taskManager.test.ts` (its 2 original
tests kept intact), `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`.

## Reviewer notes

- **`endOfLine` is set to `crlf`** in `.prettierrc`. This checkout uses CRLF and Prettier
  defaults to LF; without the override the first format pass rewrites every line of every
  file and buries the real changes. `src/types.ts` was verified byte-identical afterwards.
- **The linter is new, so it is grading rules written in this same change.** "0 violations"
  means none under `@typescript-eslint/no-unused-vars`, `prefer-const`, `no-var` and
  `eqeqeq` plus the two recommended sets — not that the code is perfect. A stricter config
  would find more.
- **`expected_fixes.json` names an unused variable `unusedVariable`.** No such symbol
  exists in the source and none was invented. It could not exist: `tsconfig.json` sets
  `noUnusedLocals` and `noUnusedParameters`, and `tsc --noEmit` passes.
- **Three strings stay in English by design** — the `<title>`, the "Your Tasks" heading and
  the priority badge have no key in `en.json`. The language buttons keep reading "English"
  and "Français"; language names belong in their own language.
- **The removed credential must still be rotated.** Deleting the line clears the working
  tree, not the history.

## Known issues, reported rather than silently fixed

These are real but out of scope for this change, and locking them into a test would freeze
behaviour nobody has arbitrated:

- `createdAt` survives the `localStorage` round trip as a **string**, not a `Date`. Nothing
  reads it today, so nothing breaks yet.
- `loadFromStorage()` calls `JSON.parse` with no guard. Corrupted storage throws inside the
  constructor and takes the whole app down.
- `handleSubmit()` decides with `input.value.trim()` but stores `input.value`, so leading
  and trailing whitespace is persisted.

## Prepared commit message

```
fix(scaffold): repair stored XSS and complete the French locale

render() wrote user-supplied task text with innerHTML, so markup typed
into the task field was parsed as HTML. Because tasks persist in
localStorage, the payload re-fired on every later page load. Use
textContent instead; task text is never markup in this app.

Also remove a temp auth credential left in a comment in
loadFromStorage() beside an internal API endpoint. The value still has
to be rotated: deleting the line clears the working tree, not history.

The French locale was broken in two independent ways, and fixing either
alone would have changed nothing a user sees. fr.json carried 2 of the
14 catalogue keys, and switchLanguage() moved the active highlight
without ever calling t(). Add the 12 missing keys, and add
applyTranslations(), called from init() and switchLanguage() and driven
by data-i18n / data-i18n-placeholder markup in index.html.

The suite could not start at all: vitest.config.ts declared environment
'jsdom' while package.json did not depend on it. Add jsdom, then take
coverage from 26.02% to 100% statements over 42 tests. The suite was
checked by seeding five defects into a throwaway copy outside the
repository; all five were caught by a named test.

Add prettier and eslint, which the project lacked, with format,
format:check and lint scripts. endOfLine is crlf to match the checkout.
Document the public surface with TSDoc and add README sections.

refs: scaffold/expected_fixes.json
```

## Not committed

Nothing has been committed, pushed, or opened as a pull request. This branch is prepared
for review only.
