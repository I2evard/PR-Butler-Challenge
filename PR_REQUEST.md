# fix(scaffold): repair stored XSS and complete the French locale

## Summary

The task-manager scaffold shipped with a stored XSS hole, a credential in a source
comment, a French locale that was 12 keys short and never reached the DOM anyway, an
unguarded `JSON.parse` on `localStorage`, an uncaught async boot, and a test suite that
could not start. This PR repairs all of it and puts gates in place so the next
regression is caught by a command rather than by a reviewer.

**Read these first, in this order:**

1. `scaffold/website/src/taskManager.ts` — the XSS fix, the removed credential, the
   storage validation, and the `render()` split.
2. `scaffold/website/src/main.ts` — the boot `.catch` and the translation wiring.
3. `scaffold/website/index.html` — the `data-i18n` attributes. Large diff; see
   *Reviewing the diff* below before you judge it.

### What changed, and why it matters

**Security — the two defects nobody was looking for.** Neither appears in
`scaffold/expected_fixes.json`; both were found by reading the code being formatted.

- `render()` assigned user-supplied task text with `innerHTML`. A task named
  `<img src=x onerror="...">` executed on every paint. Now `textContent`, with a
  regression test that asserts the rendered node has no element children.
- `loadFromStorage()` carried a `temp auth:` token in a comment, directly under a
  `TODO` naming an internal hostname. The token is gone and the hostname is stripped;
  the TODO is kept, because the intention to migrate is information the next reader
  needs. **The token remains in git history** — rotate it rather than assume this PR
  retired it.

**Storage is now validated, not merely parsed.** A type guard that only checks types
would not have been enough here. `id` is the key every destructive action routes
through: `deleteTask` filters on it and `toggleTask` finds on it, so two stored tasks
sharing an id meant one click deleted both rows. And `nextId = Math.max(...ids) + 1`
saturates — a stored `Number.MAX_SAFE_INTEGER` made the counter stop incrementing, so
every later task got the same id and the collision arrived on its own. Ids are now
validated as safe positive integers, duplicates are dropped as the list is restored,
`createdAt` is revived into a real `Date`, and ids are allocated against the set in use
rather than incremented.

**Failures are visible.** A bare `.catch(console.error)` would have been worse than the
crash it replaced: the static HTML still paints, no control is wired, and the page looks
normal while every click does nothing. The boot catch puts
`<li class="app-error">` in the task list; discarded storage puts
`<li class="storage-notice">` there.

**Translations reach the page.** `switchLanguage()` used to move the active button and
nothing else. `applyTranslations()` now walks `data-i18n` / `data-i18n-placeholder` and
is called from both `init()` and `switchLanguage()`, with the task list repainted after
so the code-built Delete button follows the language too. The two stats labels and the
footer label are each wrapped in their own `<span>`: tagging the parent `<p>` would have
wiped the counters and the year.

### Metrics

| | Before | After |
|---|---|---|
| Statement coverage | **26.02%** | **97.01%** |
| Branch coverage | 69.23% | 90.99% |
| Function coverage | 57.14% | 100% |
| Test cases | 2 | **57** (+55) |
| Test files | 1 | 5 |
| Lint errors | *no linter in the repo* | 0 over 10 files |
| Type errors | 0 | 0 |
| Files created / modified | — | 9 created, 10 modified |

The baseline was taken at the preflight, before any step ran. It is worth stating that
**26.02% is not the number the suite reported on arrival** — the suite could not run at
all. `vitest.config.ts` declared `environment: 'jsdom'` while `package.json` did not
depend on `jsdom`, so coverage was undefined, not low. 26.02% is the first honest
measurement, taken once that dependency was installed.

### Does the suite actually catch anything?

Coverage says which lines ran, never whether an assertion would notice them going wrong.
Six defects were seeded one at a time into a throwaway copy of the project outside the
repository. **6 seeded, 6 caught, 0 survivors:**

| Seeded defect | Caught by |
|---|---|
| `textContent` → `innerHTML` in `render()` | *renders task text as text, never as markup* |
| `toggleTask` always sets `completed = true` | *completes a task when toggled, and un-completes it when toggled again* |
| active / completed filters swapped | 3 filter tests, incl. one through the page |
| `saveToStorage` made a no-op | the two reload tests |
| `t()` returns `''` instead of the key | *returns the key itself when the key is missing* |
| `applyTranslations()` deleted from `init()` only | *applies the English translations on boot* |

The last one is the one that matters. English is the fallback language and the markup
already contains the English strings, so a boot assertion written the obvious way passes
whether the translation pass ran or was deleted entirely. The fixture therefore mounts
the page with every translatable slot replaced by a sentinel, so the English assertion
has something to replace. The seed was anchored to `init()` alone — there are two
`applyTranslations()` call sites — and the failure that came back was the **boot** test,
not the language-switch tests, which is what proves the anchoring was right.

### Reviewing the diff

- **`index.html` is reformatted top to bottom, and that is expected.** It was not
  Prettier-clean as delivered, and it is now inside the `format:check` glob. Prettier
  indents `<head>` and `<body>` under `<html>`, which the file did not, so the
  structural reindent touches nearly every line. The substantive change is 12
  `data-i18n` attributes, 1 `data-i18n-placeholder` and 3 wrapper `<span>`s.
- **`src/styles.css` changes by 7 lines, not 244.** Prettier's `tabWidth` default of 2
  would have rewritten a 4-space-indented file end to end; a `*.css` override at
  `tabWidth: 4` and `endOfLine: "crlf"` keep the diff to the three things that genuinely
  differ from Prettier's output.
- **`src/types.ts`, `src/translations/en.json`, `tsconfig.json`, `vite.config.ts` and
  `vitest.config.ts` are byte-for-byte untouched.** That was verified at the byte level
  rather than with `git diff`: with `core.autocrlf=true` git normalises line endings in
  the index and would report a CRLF→LF flip as clean.

## Checklist

- [x] All 14 French translation keys present in `fr.json`, both files aligned
- [x] Code formatted consistently — `npm run format:check` reports nothing to rewrite
- [x] No lint violations — `npm run lint` → 0 errors over 10 files
- [x] Test coverage ≥ 80% statements — 97.01%
- [x] All tests pass — 57/57
- [x] No type errors — `npm run typecheck` → 0
- [x] TSDoc on every exported function and public method
- [x] `README.md` has Features, Testing and Contributing
- [x] `CHANGELOG.md` generated, reflecting this run
- [x] `PR_REQUEST.md` generated with the measured coverage
- [x] Conventional commit message prepared
- [x] `functions_needing_refactor` addressed — `render()` split, suite green against
      both shapes, no test edited
- [x] No marker comment left describing work that is now done
- [x] Storage guard validates `id`, not just its type
- [x] Every new failure path is visible to the user
- [x] `index.html` passes the formatter
- [x] Tests read in the repository's language (English)
- [x] No check was weakened to pass
- [x] The suite catches seeded defects — 6 seeded, 6 caught
- [ ] **A second full run changes nothing** — verified by content manifest, *not* by
      `git status --porcelain`. See *Known limitations*.
- [x] No gate passed vacuously — the linter named 10 files, the suite ran 57 cases
      against a baseline of 2

## Known limitations

- **Idempotence was verified by content hash, not by `git status`.** The working tree
  already carried staged changes against `HEAD` when this run began, so
  `git status --porcelain` was non-empty before Step 1 and could not answer the
  question. A recursive SHA-256 manifest of the tree, taken before and after a second
  full pass, is used instead.
- **`scaffold/expected_fixes.json` names an unused variable `unusedVariable`.** No such
  symbol exists in the source. Reported as absent rather than invented to match.
- **"0 lint violations" means "none under the rules this PR introduces."** The
  repository had no linter, so this PR is writing the rules that judge it. They are
  deliberately conventional — unused variables, `prefer-const`, `no-var`, `eqeqeq`,
  plus `typescript-eslint` recommended. A stricter config would find more.
- **Coverage counts `src/**/*.ts` only.** `index.html`, the CSS and the config files are
  in no denominator. The test fixture reads `index.html` at run time precisely because
  its divergence would otherwise cost zero percent.
- **`src/tests/fixture.ts` appears in the coverage table** because it matches the
  include glob. It was left there rather than excluded: narrowing a measurement to
  improve the number it reports is the one thing this PR refuses to do.
- **The `.app-error` and `.storage-notice` lines carry no CSS of their own.** They are
  readable text in the task list, so the failure is visible, but styling them would make
  them look less like a task. Out of scope for this PR; worth a follow-up.

## Not committed

Nothing has been committed, pushed or opened upstream. The changes are in the working
tree for review.

### Proposed commit message

```
fix(scaffold): repair stored XSS and complete the French locale

Task text was written into the DOM with innerHTML, so any task whose
text contained markup executed on every paint. It now goes through
textContent, covered by a regression test.

Restoration from localStorage is validated rather than trusted: the
JSON.parse is guarded, entries that do not describe a task are
discarded, duplicate ids are dropped, and ids are allocated against
the set in use instead of Math.max(...ids) + 1, which saturated on a
stored Number.MAX_SAFE_INTEGER and then handed out the same id
forever. The async init() call finally has a .catch, and both that
catch and the discard path put a message on screen rather than only
in the console.

fr.json was 12 keys short and no translation ever reached the DOM;
applyTranslations() now walks data-i18n / data-i18n-placeholder from
both init() and switchLanguage(), with the task list repainted after.

render() is split into filterTasks(), buildTaskRow() and
buildStorageNotice(); the same 57 tests pass against both shapes.

Adds jsdom, without which the suite could not start at all, plus
Prettier and ESLint with format/lint/typecheck scripts.

Coverage: 26.02% -> 97.01% statements, 2 -> 57 test cases.

A temp auth token was removed from a comment in taskManager.ts. It
remains in git history and must be rotated.
```
