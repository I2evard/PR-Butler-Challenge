---
name: PR Butler
description: Automate pre-commit / PR preparation — translations, code cleanup, tests, documentation, quality gates.
---

## Overview

Prepares a web project for a pull request in one unattended pass: completes the French locale and renders it, formats and repairs the source, builds the suite to threshold, writes the docs, enforces the gates, drafts the commit. Invoke on "prepare for PR", "pre-commit check", or before any PR.

**Operating rules.** Work from `scaffold/website/`. Measure at the preflight and report that baseline — an unmeasured number is invented. Never weaken a check to pass it. Stop at the first failing gate. Repair what the six steps name plus any defect that makes one of them a lie; write the rest down. **If a repository guard refuses you, delegate — never route around it**; test files are often reserved for a dedicated agent.

**Preflight:** `npm install && npm run test && npm run test:coverage`. `MISSING DEPENDENCY 'jsdom'` means `vitest.config.ts` asks for it and `package.json` lacks it — install it, and note the baseline was undefined rather than low.

## Instructions

### Step 1: Translation Detection & Fix

Compare key sets **both ways** — a key in `fr.json` absent from `en.json` is a typo. Write French from the English value *and* the key name (`button.add` is a button, `stats.total` a counter label), keeping `en.json`'s order.

**The JSON is half the step.** `switchLanguage()` changes a CSS class and nothing else, so a complete `fr.json` still renders English. Tag every catalogue-fed element with `data-i18n` and the input with `data-i18n-placeholder`, write `applyTranslations(root = document)` in `i18n.ts`, call it from `init()` and `switchLanguage()`, and set `documentElement.lang` and `document.title` there too.

**An element can carry `data-i18n` only if its text is the whole of its content.** `<p>Total tasks: <span id="total-count">0</span></p>` needs the label in its own span or the counter is wiped — and check the stylesheet first, since an existing `.stats span` rule will restyle it.

**Strings with no key are still your job.** "Your Tasks" sits beside "Add New Task", which has a key: an omission, not a decision. Add keys for it, for the badge (`badge.*` — `priority.*` is taken and reads "Low Priority"), and for the title (`page.title`). The badge is built in code: translate with `t()`, keep the raw priority in the class, and make the switch re-run the renderer. Only the language buttons stay, each already written in the language it selects.

**The required keys are a floor, not a ceiling.** Validate they exist and that both files have identical key sets; never assert `length === 14`.

### Step 2: Code Cleanup

The repo ships no formatter and no linter. Install prettier, eslint, `@eslint/js`, `typescript-eslint`, and add all four scripts — `format`, `format:check`, `lint`, `typecheck` — or Gates 4 and 6 die on "missing script". Match the existing style; do not impose a new one.

```json
{ "semi": false, "singleQuote": true, "tabWidth": 2, "printWidth": 100,
  "trailingComma": "none", "arrowParens": "avoid", "endOfLine": "crlf",
  "overrides": [{ "files": ["*.css","*.html"], "options": { "tabWidth": 4 } }] }
```

**Measure line endings before formatting.** Prettier defaults to `lf` and this checkout is CRLF, so the default rewrites every line of every file. Override `tabWidth` per extension — `styles.css` and `index.html` are 4-space. Verify at byte level: `git diff` shows a flip as an ordinary content change, indistinguishable from a real edit. The root deliverables sit outside Prettier's directory and stay as your editor wrote them — normalize them yourself. Include `index.html` in the glob: Step 1 makes it the most-changed file, and `src/**` leaves it behind no gate.

⚠️ **A formatter run from the shell writes into files a guard reserves for another agent, and the guard never fires** — it hooks the editing tools, not commands. Ignore this and the run is silently invalid. Add a `.prettierignore` (the lockfile and `coverage/` too), format what you own, and have the test agent format its own files.

`handleSubmit()` is the worst offender; the formatter fixes it. If the answer key names a symbol you cannot find, report it absent rather than inventing one, and say "0 lint violations" means "none under rules this run wrote".

**Three defects no formatter catches:** `text.innerHTML = task.text` in `render()` is stored XSS — use `textContent`. A credential sits in a `loadFromStorage()` comment — remove the token and the internal hostname, keep the bare TODO. And `expected_fixes.json` calls `render` too long: split it into `filterTasks()` and `buildTaskRow()` **after Step 3**, so "green before and after, no test edited" means something.

**A marker comment becomes a lie once its work is done — delete it with the work, never alone.** `// Missing error handling` means `init()` is async with nothing catching it and `loadFromStorage` parses unguarded, so corrupt storage gives a blank page. Guard the parse **and** `saveToStorage`; validate `id` as a safe positive integer with duplicates dropped, and allocate against the ids in use rather than `max + 1`, which saturates. **Show every new failure in one shared UI element** — a `.catch` that only logs makes a loud failure silent. Give it a CSS rule, `role="alert"`, **and catalogue keys for its messages**: a hard-coded English sentence there passes this step and fails Step 1's walk. The renderer must not clear it, or a save failure erases its own message.

### Step 3: Test Automation

Read the coverage table's uncovered lines; they name the work better than function names do. Here: `toggleTask`, `deleteTask`, `setFilter`, `render`, `saveToStorage`, `loadFromStorage` — the last two through the public API, since they are private. Those six are ~58% of statements, so `i18n.ts` and `main.ts` must be covered too or the gate is unreachable. `main.ts` runs `init()` at import: mount the DOM, then `vi.resetModules()` and `await import('../main')`. `localStorage.clear()` in `beforeEach`. **Derive the DOM fixture from `index.html`** in one shared `src/tests/fixture.ts` — a retyped copy drifts and no coverage number notices — using `import.meta.url`, since `__dirname` is undefined under Vitest.

**Never assert a translation in the fallback language.** The markup already holds the English strings, so `expect(h1.textContent).toBe('My Task Manager')` passes whether the translation ran or was deleted. Assert in French after switching, or seed a sentinel.

**Then write the check the others cannot make.** Counting keys, comparing catalogues and element-by-element assertions all exit 0 with an English heading on a French page. Render the page, switch to French, walk every text node plus `placeholder`, `title`, `aria-label` and `document.title`, and fail on anything outside an allow-list:

```ts
const ALLOWED = new Set(['English', 'Français', TYPED_TASK])
// collect only nodes matching /\p{L}/u — counters, separators and years are not words
expect(strings.length).toBeGreaterThan(10)   // prove the walk saw the page
expect(strings.filter(s => !french.has(s) && !ALLOWED.has(s))).toEqual([])
```

Comparing against English catalogue *values* is the intuitive version and finds nothing: the offenders have no key, which is why they were missed. Seed `document.title` from `index.html` in the fixture, or that assertion tests an empty string.

**Then check the net catches something.** Seed defects one at a time into a throwaway copy outside the repo — `textContent`→`innerHTML`, `toggleTask` always completing, filters swapped, `saveToStorage` no-op, `t()` returning `''`, `applyTranslations()` dropped from `init()` **only** — plus one per guard *this run wrote*. Three checks or the score is fiction: **the unseeded copy green first**, failures that are **named tests** not collection errors, and a case count matching the baseline.

### Step 4: Documentation Updates

TSDoc on the 9 undocumented public functions **and the rest of the public surface** — say what each is for, not what its name says. `scaffold/website/README.md` gains Features, Testing and Contributing, with Testing carrying the real commands and the threshold. At the **repository root** — the directory containing `scaffold/` — write `CHANGELOG.md` in Keep a Changelog format, with the XSS fix and the credential under **Security**, and `PR_REQUEST.md` with a conventional title, an actionable summary, a checklist, before/after coverage, and each key added beyond the required set with its reason. Generate all of it from what changed, never from a template.

### Step 5: Quality Gates

In order, stopping at the first failure: **1** `test` exit 0 · **2** coverage ≥ 80%, *enforced by the runner* · **3** `lint` zero errors · **4** `typecheck` zero errors · **5** the Step 1 validation **and** the no-English-left test · **6** `format:check` rewrites nothing · **7** the four deliverables exist and name what this run changed · **8** a second full run changes nothing.

**Gate 2 does not exist until `thresholds: { statements: 80 }` is in `vitest.config.ts`.** The command prints a table and exits 0 at any coverage — reading the number off it is a measurement, not a gate. Prove it fires in a throwaway copy by **deleting tests until you are below the line** — at high coverage two files may not be enough — and confirm the suite is still green when the runner refuses. That green-but-refused state is the proof. Re-prove it as the suite grows. That threshold is the only edit this file receives.

Gate 8 confirms each goal state still holds rather than regenerating output; `git status --porcelain` answers only if the tree was clean at the preflight, otherwise hash the repo before and after, **excluding `node_modules`, `coverage`, `dist` and `.git`** — npm rewrites them and the gate could never pass. **And a gate can pass because it checked nothing** — a linter over an empty glob exits 0 — so confirm it names files and the suite ran more cases than the baseline.

### Step 6: PR Preparation

Write a Conventional Commits message from what actually changed — a run closing a security hole is a `fix`, and the XSS belongs in the body. Finalize `PR_REQUEST.md` with measured metrics. **Do not commit, push, or open the PR.** The Butler prepares; the human decides what ships.

## Examples

### Example 1: Full PR Preparation

**Input:** "Prepare this scaffold for a PR."

```
PREFLIGHT  jsdom missing → installed. Baseline 26.02%, 2 tests.
STEP 1     12 of 14 keys + 8 with none, 14 data-i18n, 3 wrapper spans,
           no English left on the French page.
STEP 2     endOfLine crlf → 5 files rewritten, not 14. render() 50 → 16.
           ⚠ SECURITY, absent from the answer key: innerHTML → textContent,
           credential and internal hostname removed.
STEP 3     2 → 83 tests, 26.02% → 99.15%, 19 mutants and 19 caught.
           Tests delegated — src/tests/ is guarded.
STEP 4-6   17 functions documented, three documents, 8/8 gates with
           Gate 2 proven to fail at 19.73%, commit prepared not made.
```

### Example 2: Translation-Only Run

**Input:** "Just fix the French translations." Steps 1 and 5 only.

```
12 keys added, rendering wired, catalogues aligned, no English left on
the French page. Steps 2-4 skipped on request; coverage unchanged.
```

Skipping on request is honest; skipping silently is not.

## Success Criteria

Tick each box by running the check beside it, never by recalling. An unticked box is a finding to report.

- [ ] Required keys present, catalogues aligned in the same order
- [ ] **No English left on the French page** — the walk test, not the key count
- [ ] Every string shown has a key, every new element a CSS rule, and `lang` follows
- [ ] `format:check` clean including `index.html`; `lint` 0 and names files; `typecheck` 0
- [ ] Coverage ≥ 80%, **enforced by the runner and proven to fail**
- [ ] Tests pass, and the suite ran more cases than the baseline
- [ ] TSDoc on the full public surface; README has the three sections; both documents name what changed; commit message prepared
- [ ] `render()` split, green before and after, no test edited; no stale marker comment
- [ ] Every new failure visible to the user; guard validates `id`, and `MAX_SAFE_INTEGER` still yields distinct ids
- [ ] Nothing weakened — no lowered threshold, deleted test, ignore directive
- [ ] Mutants seeded in code **this run added**; unseeded copy green first, kills named; dropping `applyTranslations()` from `init()` turns the suite red
- [ ] A second full run changes nothing

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
