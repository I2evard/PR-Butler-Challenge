---
name: PR Butler
description: Automate comprehensive pre-commit / PR preparation — translations, code cleanup, tests, documentation, and quality gates.
---

## Overview

The PR Butler automates the complete pre-commit checklist for web projects, ensuring code is ship-ready before PR submission. It orchestrates translation fixes, code cleanup, test generation, documentation updates, and quality validation in a single pass.

### When to Invoke

- User runs "prepare for PR" or "pre-commit check"
- User asks to "fix the scaffold" or "make this PR-ready"
- Before any pull request submission

### Operating Rules

These hold for every step. They exist because an unattended agent fails in ways a human would not.

| Rule | Why |
|---|---|
| **Work from `scaffold/website/`.** Every path below is relative to it. | Running npm from the repo root finds no `package.json` and reports a confusing failure. |
| **Measure before and after.** Record coverage, test count and lint count at the start; compare at the end. | The Report Card asks for `X% → Y%`. A number you did not measure is a number you invented. |
| **Never weaken a check to make it pass.** Do not lower the coverage threshold, delete a failing test, or add an ignore comment to silence a linter. | This is the one failure mode that looks like success. If a gate cannot be met, stop and report — that is a passing outcome for the Butler, not a failure. |
| **Stop at the first failing gate in Step 5.** Report what failed and why; do not continue to Step 6. | A PR prepared on top of a failed gate is worse than no PR. |
| **Fix the root cause, not the symptom.** | Formatting a file that does not compile wastes the run. |
| **Repair what the six steps name, plus any defect that makes one of them a lie.** Everything else you find gets written down, not patched. | The scope has to end somewhere, and "use your judgement" leaves the line in a different place on every run. A security hole in the code you are formatting makes Step 2 a lie; a latent bug elsewhere does not. |
| **If a guard in the repository refuses you an action the workflow needs, delegate it — never route around it.** Test files in particular may be reserved for a dedicated test agent. | An automation that defeats the repository's own controls to finish is worse than one that stops and says what it needs. Report the delegation in the Report Card. |

**Measure the baseline once, at the preflight, and report that one.** Steps 1 and 2 change the code, so a second measurement taken later will differ — the cleanup alone moves coverage by several points. The Report Card's `X% → Y%` means *preflight → final*. Mention any intermediate figure in `PR_REQUEST.md` if it is interesting, never in place of the baseline.
| **Report honestly.** If a step was skipped or partially done, say so. | The evaluator verifies the Report Card against actual file contents. |

### Preflight

Run once, before Step 1. It costs seconds and prevents every downstream step from failing for the same reason.

```bash
cd scaffold/website
node --version          # 18+ required
npm install             # install declared dependencies
npm run test            # confirm the suite actually starts
```

**If `npm run test` reports `MISSING DEPENDENCY 'jsdom'`:** `vitest.config.ts` declares `environment: 'jsdom'`, but `jsdom` is absent from `package.json`. The suite cannot run at all — baseline coverage is not low, it is undefined. Install it before doing anything else:

```bash
npm install --save-dev jsdom
```

Record the baseline once the suite runs:

```bash
npm run test:coverage
```

---

## Instructions

### Step 1: Translation Detection & Fix

**Goal:** `src/translations/fr.json` carries every key that `en.json` carries, with real French values.

1. Read both files and compare their key sets:

   ```bash
   node -e "const en=require('./src/translations/en.json'),fr=require('./src/translations/fr.json');const m=Object.keys(en).filter(k=>!(k in fr));console.log(m.length+' missing:',m.join(', '))"
   ```

2. For each missing key, write a French value using the English value **and the key name** as context. The key names carry the UI role — `button.add` is a button label, `stats.total` is a counter label, `footer.text` is a caption. Translate for that role, not word by word.

3. **Keep the key order identical to `en.json`.** A diff that only adds lines is reviewable; a reordered file is not.

4. Preserve the existing two entries — do not regenerate them.

5. Validate:

   ```bash
   node -e "const en=require('./src/translations/en.json'),fr=require('./src/translations/fr.json');const m=Object.keys(en).filter(k=>!(k in fr));const e=Object.keys(fr).filter(k=>!(k in en));if(m.length||e.length)throw new Error('missing: '+m+' | extra: '+e);console.log('OK — '+Object.keys(fr).length+' keys, both files aligned')"
   ```

   Both directions matter: a key in `fr.json` that is absent from `en.json` is a typo, not a translation.

**Expected on this scaffold:** 2 keys present, 12 missing, 14 after the fix.

> **Do not stop at the JSON — wiring the rendering is part of this step, not an option.** `switchLanguage()` in `src/main.ts` changes the active button and nothing else; the comment on its last line admits it. Translated strings never reach the DOM, so a fully populated `fr.json` still renders English.
>
> Do it this way, so two runs produce the same structure:
>
> 1. Add `data-i18n="<key>"` to every element in `index.html` whose text comes from the catalogue, and `data-i18n-placeholder="<key>"` to the task input. **12 of the first, 1 of the second, 13 attributes in all**: the page title heading, the Add-New-Task heading, the three priority options, the submit button, the three filter buttons, the two stats labels, the footer text — and the input's placeholder.
>
>    **Two of those cannot take the attribute as the markup stands**, because `textContent` would destroy what sits beside the label:
>
>    ```html
>    <p><span data-i18n="stats.total">Total tasks</span>: <span id="total-count">0</span></p>
>    <p><span data-i18n="footer.text">Built with TypeScript</span> • 2026</p>
>    ```
>
>    Wrap the label in its own `<span>` and tag that. Writing the key onto the parent `<p>` wipes the counter and the year.
> 2. Add `applyTranslations(root = document)` to `src/i18n.ts`: walk both attribute sets and rewrite `textContent` and `placeholder`.
> 3. Call it from `init()` and from `switchLanguage()`, and repaint the task list after — the Delete button is built in `taskManager.ts` and must use `t('button.delete')`.
>
> Two elements have no key in `en.json`: the "Your Tasks" heading and the priority badge. **Leave them in English and say so.** Inventing a key puts a string in the catalogue that no one asked for.

### Step 2: Code Cleanup

**Goal:** consistent formatting, no lint errors, no dead code.

1. **Check what exists first.** This scaffold ships with neither a formatter nor a linter, and no `lint` script. `npm run lint` will fail with "missing script" — that is not a lint failure, it is an absent toolchain. Install one:

   ```bash
   npm install --save-dev prettier eslint @eslint/js typescript-eslint
   ```

2. Add the scripts to `package.json`:

   ```json
   "format": "prettier --write \"src/**/*.{ts,css,json}\"",
   "format:check": "prettier --check \"src/**/*.{ts,css,json}\"",
   "lint": "eslint src --max-warnings 0",
   "typecheck": "tsc --noEmit"
   ```

   All four, not just the first two: Gate 4 calls `typecheck` and Gate 6 calls `format:check`. Add them here or those gates die on "missing script".

3. Add a minimal `eslint.config.js` and a `.prettierrc` that match the code already in the repo. **Match the existing style; do not impose a new one.** A formatter that rewrites every untouched line buries the real changes in the diff.

   ```json
   { "semi": false, "singleQuote": true, "tabWidth": 2, "printWidth": 100,
     "trailingComma": "none", "arrowParens": "avoid", "endOfLine": "crlf" }
   ```

   > **`endOfLine` is the setting that decides whether this step helps or ruins the diff, and its default is wrong here.** Prettier defaults to `"lf"`. This scaffold is checked out with **CRLF**, so the default rewrites *every line of every file* — including files whose content does not change by a single character. The diff then shows hundreds of modified lines and hides the four that matter.
   >
   > Do not guess. Measure the repo first, then set the value to match:
   >
   > ```bash
   > node -e "const b=require('fs').readFileSync('src/types.ts');console.log(b.includes('\r\n')?'crlf':'lf')"
   > ```
   >
   > **Verify after formatting** — a file you did not intend to touch must show no change:
   >
   > ```bash
   > git diff --numstat src/types.ts   # expect no output, or 0 0
   > ```
   >
   > A non-zero count on an untouched file means the line endings flipped. Fix `endOfLine` and restore before going further.

4. Run them:

   ```bash
   npm run format
   npm run lint
   ```

5. **`handleSubmit()` in `src/main.ts` is the worst offender** — zero indentation, no spaces around `=`, `(`, or `|`. The formatter fixes it. Confirm it did.

6. Remove unused variables and dead code the linter reports. If the answer key names a symbol you cannot find in the source, **do not invent one to match** — report it as not present.

   > Note the circularity and say so in the report: with no linter in the repo, **you are writing the rules that judge you**. Keep them close to what a TypeScript project would normally enforce — unused variables, `prefer-const`, `no-var`, `eqeqeq` — and state that "0 violations" means "none under these rules", not "the code was already perfect". A stricter config would have found more.

**Expected on this scaffold:** `handleSubmit` reindented; `src/main.ts`, `src/taskManager.ts`, `src/i18n.ts` reformatted.

> **Two planted defects that no formatter will catch.** Both are in `src/taskManager.ts`:
>
> - **`text.innerHTML = task.text`** in `render()` injects user input straight into the DOM — a stored XSS hole. Use `textContent`. There is no case in this app where task text should be parsed as HTML.
> - **A credential in a comment** in `loadFromStorage()`: a `temp auth:` token beside an internal endpoint. Remove it. A secret in a comment is a secret in the repository, and the git history keeps it after the line is deleted.
>
> Neither appears in `scaffold/expected_fixes.json`. A cleanup pass that only chases the listed items misses both.

### Step 3: Test Automation

**Goal:** every public behaviour covered, suite green, coverage above 80%.

1. Establish the baseline — you cannot report `X% → Y%` without an X:

   ```bash
   npm run test:coverage
   ```

2. Read the coverage table's **Uncovered Line #s** column. It names what to write, which is more reliable than guessing from function names.

3. Write tests for the uncovered behaviour. On this scaffold: `toggleTask`, `deleteTask`, `setFilter`, `render`, `saveToStorage`, `loadFromStorage`.

   > ⚠️ **Those six are not enough to clear the gate, and the arithmetic is worth doing before you start.** All six live in `src/taskManager.ts`, which is roughly **58% of the statements** counted by `coverage.include: ['src/**/*.ts']`. Testing that one file to 100% therefore caps the total near 58% — and Gate 2 fails at 80%.
   >
   > **`src/i18n.ts` and `src/main.ts` must be covered too.** `i18n.ts` is easy. `main.ts` is the hard one and the reason to plan for it rather than meet it by surprise: it runs `init()` at import time and exports nothing, so a test has to mount the DOM **before** importing it, then use `vi.resetModules()` and a dynamic `await import('../main')`, and let the microtask queue drain before asserting.
   >
   > Read the coverage table's per-file rows, not just the total: they tell you which file is holding the number down.

   **Three of these need care:**

   | Function | The problem | What to do |
   |---|---|---|
   | `render` | Touches the DOM. Returns early when `#tasks` is absent, so a naive test covers the guard clause and nothing else. | Build the DOM the function expects (`document.body.innerHTML = '<ul id="tasks"></ul><span id="total-count"></span><span id="completed-count"></span>'`), then assert on the rendered nodes. |
   | `saveToStorage` · `loadFromStorage` | Both are `private`. | Exercise them **through the public API** — `addTask()` writes, a fresh `new TaskManager()` reads back. Testing through the public surface is the point, not a workaround. Do not widen their visibility to make them testable. |
   | Anything using `localStorage` | State leaks between tests and makes failures order-dependent. | `localStorage.clear()` in `beforeEach`, as the existing suite already does. |

4. **Assert on behaviour, not on call counts.** `expect(manager.getTasks()).toHaveLength(1)` survives a refactor; a spy assertion does not. Coverage that only executes lines without checking results is the number going up while the safety net stays empty.

5. Re-run until green, then confirm the threshold:

   ```bash
   npm run test
   npm run test:coverage
   ```

6. **Check that the net catches something.** Coverage says which lines ran, never whether an assertion would have noticed them going wrong. A suite of hollow assertions reports 100% and protects nothing.

   Copy `src/` to a throwaway directory **outside the repository**, seed one defect at a time there, and run the suite against the copy. Five is enough, chosen where a silent break would hurt most:

   | Seed | A named test must fail |
   |---|---|
   | `textContent` → `innerHTML` in `render()` | the XSS regression test |
   | `toggleTask` always sets `completed = true` | the toggle-twice test |
   | the active/completed filters swapped | the filter tests |
   | `saveToStorage` made a no-op | the reload tests |
   | `t()` returns `''` instead of the key | the missing-key test |

   **Report the score: N seeded, M caught.** A survivor is either a missing test or an equivalent mutant — say which, do not leave it ambiguous. Delete the copy when done.

   This is the difference between a coverage number and a safety net, and it is cheap: two suites can both report 100% while differing sixfold in what they actually assert.

**Expected on this scaffold:** baseline ≈26% statements over 2 tests; target ≥80%.

### Step 4: Documentation Updates

**Goal:** every public function documented, and the three generated documents written.

| Target | What to write |
|---|---|
| **Docstrings** | TSDoc on all 9 undocumented public functions: `addTask`, `toggleTask`, `deleteTask`, `setFilter`, `render` in `src/taskManager.ts`; `init`, `setupEventListeners`, `handleSubmit`, `switchLanguage` in `src/main.ts`. Each gets a one-line summary, `@param` per argument with its meaning, and `@returns` when it returns something. **Say what the function is for, not what its name already says** — `/** Adds a task. */` on `addTask` is noise. |
| **`README.md`** (in `scaffold/website/`) | Add **Features**, **Testing**, **Contributing**. Testing carries the real commands (`npm run test`, `npm run test:coverage`) and the coverage threshold. Contributing states the quality gates a contributor must pass. |
| **`CHANGELOG.md`** | Keep a Changelog format, grouped under `Added` / `Changed` / `Fixed` / `Security`. One line per real change, each naming the file it touched. The XSS fix and the removed credential go under **`Security`** — that is the heading a reviewer scans first. |
| **`PR_REQUEST.md`** | Conventional title, a summary a reviewer can act on, a checklist mirroring the success criteria, and the before/after coverage numbers. |

**Where each file goes.** This is the one place the "every path is relative to `scaffold/website/`" rule does not hold, so it is spelled out:

| File | Path |
|---|---|
| Docstrings | `scaffold/website/src/*.ts` |
| `README.md` | `scaffold/website/README.md` — the scaffold's, not the root's |
| `CHANGELOG.md` | **repository root**, two levels up from `scaffold/website/` |
| `PR_REQUEST.md` | **repository root** |

The root is the directory that contains `scaffold/`. Find it with `git rev-parse --show-toplevel`, or walk up until you see that folder. Do not identify it by whatever other files happen to sit there.

> Generate these from what actually changed in this run, not from a template. A changelog listing changes that were not made is worse than no changelog.

### Step 5: Quality Gates

**Goal:** refuse to proceed unless the work is genuinely ship-ready.

Run in this order and stop at the first failure:

| # | Gate | Command | Passes when |
|---|---|---|---|
| 1 | Suite green | `npm run test` | Exit code 0, zero failures |
| 2 | Coverage | `npm run test:coverage` | Statements ≥ 80% |
| 3 | Lint | `npm run lint` | Zero errors |
| 4 | Types | `npx tsc --noEmit` | Zero errors |
| 5 | Translations | the Step 1 validation command | Both files aligned |
| 6 | Formatting | `npm run format:check` | No file would be rewritten |
| 7 | Deliverables | the four files below exist and are non-empty | All four present |
| 8 | Idempotence | run every step again | Nothing changes |

The four deliverables of Gate 7: `scaffold/website/README.md`, `CHANGELOG.md`, `PR_REQUEST.md`, and `src/translations/fr.json`.

> **Gate 8 is the one nobody writes, and it is the cheapest real check here.** A pre-commit tool that is not idempotent is dangerous: run it twice and it should produce an empty diff.
>
> Re-running means **confirming each step's goal state still holds**, not regenerating its output. Do not rewrite `CHANGELOG.md` and `PR_REQUEST.md` on the second pass — Step 6 writes, so make a third pass after it to prove that write was idempotent too.
>
> ```bash
> git status --porcelain     # expect no output
> ```
>
> **If this is not a git checkout**, that command fails and the gate is unrunnable as written — nothing else in this workflow assumes git, so do not assume it here either. Fall back to a content manifest taken before and after, honouring `.gitignore`:
>
> ```bash
> node -e "const{createHash}=require('crypto'),fs=require('fs'),p=require('path');const skip=new Set(['node_modules','dist','coverage','.git']);const h=createHash('sha256');(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){if(skip.has(e.name))continue;const f=p.join(d,e.name);e.isDirectory()?w(f):h.update(f+fs.readFileSync(f))}})('.');console.log(h.digest('hex'))"
> ```
>
> Same hash before and after means nothing moved. A second run that still changes files means something is churning — a formatter fighting the line endings, a test generator appending duplicates, a CHANGELOG rewriting its own entries. Each of those ships noise into a reviewer's diff.

> ⚠️ **A gate can pass because it checked nothing.** `npm run lint` over a glob that matches no file exits 0 and reports clean. A suite that collects zero test files exits 0. An empty pass is indistinguishable from a real one in the exit code, and it is the failure mode a quality gate exists to prevent — so confirm the work was seen, not only that nothing complained:
>
> - the linter names the files it examined, and the count is greater than zero
> - the test run reports more cases than the baseline, not merely "no failures"
> - coverage lists every source file, not a subset

**On failure:** report which gate failed, its exact output, and what would fix it. **Then stop — do not run Step 6.** Do not lower a threshold, skip a test, or add an ignore directive to get past a gate. A Butler that reports "coverage 74%, gate failed, here is the uncovered list" has done its job correctly.

Gate 4 is not in the brief and is worth the two seconds: `vitest` transpiles without type-checking, so a type error passes the whole suite and breaks the build.

### Step 6: PR Preparation

**Goal:** a commit message and a PR description that a reviewer can act on without opening the diff.

1. Generate a Conventional Commits message from what actually changed:

   ```
   <type>(<scope>): <subject in the imperative, under 72 chars>

   <body: what changed and why, wrapped at 72>

   <footer: BREAKING CHANGE / refs>
   ```

   Pick the type from the dominant change — `feat` for new behaviour, `fix` for a defect, `chore` for tooling, `docs` for documentation only. A run that fixes a security hole and adds tests is a `fix`, and the XSS repair belongs in the body.

2. Finalize `PR_REQUEST.md` with the measured metrics — coverage before and after, test count before and after, files touched.

3. Confirm every Step 4 deliverable exists and is non-empty.

4. **Do not commit, push, or open the PR.** The Butler prepares; the human decides what ships.

---

## Examples

### Example 1: Full PR Preparation

**Input:** "Make the scaffold PR-ready"

**Expected output:**

```
PREFLIGHT
  node v24.19.0 · npm install OK
  npm run test → MISSING DEPENDENCY 'jsdom'
  → vitest.config.ts declares environment 'jsdom', package.json does not.
  → npm install --save-dev jsdom
  npm run test → 2 passed
  Baseline: 26.02% statements, 2 tests

STEP 1 — Translations
  en.json 14 keys · fr.json 2 keys · 12 missing
  Added: task.placeholder, priority.low, priority.medium, priority.high,
         button.add, filter.all, filter.active, filter.completed,
         stats.total, stats.completed, button.delete, footer.text
  Validation: OK — 14 keys, both files aligned
  ⚠ switchLanguage() does not apply translations to the DOM — wired t() into
    index.html: 12 data-i18n + 1 data-i18n-placeholder (stats label and
    footer text wrapped in their own span so the counter and year survive)
  PASS

STEP 2 — Code Cleanup
  No formatter or linter present → installed prettier, eslint, typescript-eslint
  Added scripts: format, lint · configs matched to existing style
  4 files formatted — handleSubmit() in main.ts reindented
  eslint: 0 errors
  expected_fixes.json names 'unusedVariable' — not present in source, not invented
  ⚠ SECURITY — 2 defects not in the answer key:
    taskManager.ts:74  innerHTML = task.text → textContent (stored XSS)
    taskManager.ts:113 credential in comment → removed
  PASS

STEP 3 — Tests
  Uncovered: toggleTask, deleteTask, setFilter, render, saveToStorage, loadFromStorage
  +14 cases · render tested against a built DOM · storage through the public API
  npm run test → 16 passed
  Coverage: 26.02% → 87.4% statements
  PASS

STEP 4 — Documentation
  TSDoc on 9 public functions (5 taskManager.ts, 4 main.ts)
  README.md + Features, Testing, Contributing
  CHANGELOG.md — Added/Changed/Fixed/Security
  PR_REQUEST.md — title, summary, checklist, coverage
  PASS

STEP 5 — Quality Gates
  tests green        ✓
  coverage ≥ 80%     ✓ 87.4%
  lint clean         ✓ 0 errors
  tsc --noEmit       ✓ 0 errors
  translations       ✓ 14/14
  deliverables       ✓ 4/4
  PASS

STEP 6 — PR Preparation
  fix(scaffold): repair XSS, complete French locale, raise coverage to 87%
  PR_REQUEST.md finalized · not committed — awaiting your review
  PASS
```

### Example 2: Translation-Only Run

**Input:** "Fix the missing French translations"

**Expected output:**

```
Scope: Step 1 only — Steps 2 through 6 not run.

  en.json 14 keys · fr.json 2 keys · 12 missing
  Added, in en.json key order:
    task.placeholder    → Saisir la description de la tâche
    priority.low        → Priorité faible
    priority.medium     → Priorité moyenne
    priority.high       → Priorité élevée
    button.add          → Ajouter la tâche
    filter.all          → Toutes les tâches
    filter.active       → Actives
    filter.completed    → Terminées
    stats.total         → Total des tâches
    stats.completed     → Terminées
    button.delete       → Supprimer
    footer.text         → Conçu avec TypeScript
  Validation: OK — 14 keys, both files aligned

  ⚠ Data fixed, rendering not. switchLanguage() in main.ts updates the active
    button and returns; t() is never called on any element. The app still
    renders English with a complete fr.json. Wiring it is out of scope for a
    translation-only run — say the word and I will.

  Quality gates not run (single-step scope). Nothing committed.
```

---

## Success Criteria

The agent verifies each box by running the command beside it, not by recalling what it did.

| # | Criterion | How it is verified |
|---|---|---|
| 1 | All 14 French translation keys present in `fr.json` | Step 1 validation command exits 0 |
| 2 | Code formatted consistently | `npm run format` leaves no further changes |
| 3 | No lint violations | `npm run lint` → 0 errors |
| 4 | Test coverage ≥ 80% | `npm run test:coverage` statements column |
| 5 | All tests pass | `npm run test` exit code 0 |
| 6 | No type errors | `npx tsc --noEmit` exit code 0 |
| 7 | TSDoc on every exported function and public method | the 9 the brief names, **and** the rest of the public surface — `getTasks`, `getCompletedCount`, and everything `i18n.ts` exports. The 9 are the floor, not the list |
| 8 | `README.md` has Features, Testing, Contributing | all three headings present |
| 9 | `CHANGELOG.md` generated | exists, non-empty, reflects this run |
| 10 | `PR_REQUEST.md` generated with summary and checklist | exists, carries measured coverage |
| 11 | Conventional commit message prepared | matches `<type>(<scope>): <subject>` |
| 12 | No check was weakened to pass | no lowered threshold, no deleted test, no added ignore directive |
| 13 | The suite catches seeded defects | N seeded, M caught, survivors explained |
| 14 | A second full run changes nothing | `git status --porcelain` is empty |
| 15 | No gate passed vacuously | the linter saw files, the suite ran more cases than the baseline |

**The table above is the authoritative list.** It supersedes the shorter checklist this template shipped with, which covered the same ground in fewer rows and vaguer words.

---

<!-- ⚠️ DO NOT MODIFY ANYTHING BELOW THIS LINE ⚠️ -->
<!-- ================================================ -->
<!-- REPORT CARD — Auto-grading step                  -->
<!-- This step runs automatically after your Skill    -->
<!-- completes. It generates a progress report card   -->
<!-- so you can track how well your Skill is doing.   -->
<!-- ================================================ -->

## Step 7: Report Card (Do Not Modify)

After completing all steps above, generate a **Report Card** summarizing the results. Output the report card in the following exact format:

```
═══════════════════════════════════════════════
  PR BUTLER — REPORT CARD
═══════════════════════════════════════════════

  📋 Step 1: Translation Detection & Fix
     Status:  [PASS / FAIL]
     Details: [X of 14 French keys added to fr.json]

  📋 Step 2: Code Cleanup
     Status:  [PASS / FAIL]
     Details: [X files formatted, X lint violations fixed]

  📋 Step 3: Test Automation
     Status:  [PASS / FAIL]
     Details: [Coverage: X% → Y%, X new test cases added]

  📋 Step 4: Documentation Updates
     Status:  [PASS / FAIL]
     Details: [X functions documented, README updated: Y/N,
               CHANGELOG.md: Y/N, PR_REQUEST.md: Y/N]

  📋 Step 5: Quality Gates
     Status:  [PASS / FAIL]
     Details: [Coverage ≥ 80%: Y/N, Lint clean: Y/N,
               All tests pass: Y/N]

  📋 Step 6: PR Preparation
     Status:  [PASS / FAIL]
     Details: [Commit message: Y/N, PR_REQUEST.md finalized: Y/N]

  ─────────────────────────────────────────────
  OVERALL:   [X / 6 steps passed]
  GRADE:     [A / B / C / F]
             A = 6/6 passed
             B = 5/6 passed
             C = 4/6 passed
             F = 3 or fewer passed
═══════════════════════════════════════════════
```

**Grading rules:**
- A step passes only if ALL its success criteria are met
- Do not skip any step in the report — mark it FAIL if not attempted
- Be honest in the details — the evaluator will verify against actual file contents
- Output this report card as the very last thing your Skill does
