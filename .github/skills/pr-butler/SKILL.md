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
| **Report honestly.** If a step was skipped or partially done, say so. | The evaluator verifies the Report Card against actual file contents. |

**Measure the baseline once, at the preflight, and report that one.** Steps 1 and 2 change the code, so a second measurement taken later will differ — the cleanup alone moves coverage by several points. The Report Card's `X% → Y%` means *preflight → final*. Mention any intermediate figure in `PR_REQUEST.md` if it is interesting, never in place of the baseline.

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
> 1. Add `data-i18n="<key>"` to every element in `index.html` whose text comes from the catalogue, and `data-i18n-placeholder="<key>"` to the task input. One correct run produced **13 of the first and 1 of the second, 14 in all**: the page title heading, the Add-New-Task heading, the three priority options, the submit button, the three filter buttons, the two stats labels, the footer text — and the input's placeholder.
>
>    **That number is a result, not a target.** Derive your own from the catalogue and the page; if yours differs, your derivation wins and the difference is what you report. A count stated as authoritative is a list to be trusted, and the next item is about exactly why lists here must not be.
>
>    **Three of those cannot take the attribute as the markup stands**, because `textContent` would destroy what sits beside the label:
>
>    ```html
>    <p><span data-i18n="stats.total">Total tasks</span>: <span id="total-count">0</span></p>
>    <p><span data-i18n="stats.completed">Completed</span>: <span id="completed-count">0</span></p>
>    <p><span data-i18n="footer.text">Built with TypeScript</span> • 2026</p>
>    ```
>
>    Wrap the label in its own `<span>` and tag that. Writing the key onto the parent `<p>` wipes the two counters and the year.
>
>    ⚠️ **Check the stylesheet before you add a `<span>`.** `styles.css` already carries `.stats span { font-weight: bold; color: #667eea }`, written for the counters. A new `<span>` around "Total tasks" inherits it, and the labels come out bold and purple — **a visible regression introduced by the fix itself**. Give the label its own class and a rule that restores its appearance. Every wrapper element you introduce inherits whatever the existing selectors say about its tag; look before you wrap.
>
>    **Do not work from this list — derive it.** It is here to show the shape of the fix, not to be trusted as complete. The test is mechanical: an element can carry `data-i18n` only if its text is *the whole* of its content. Anything with a sibling node — a counter, a separator, a date — needs the wrapper. Walk the page and apply that test to every element you are about to tag; the third case above was missing from an earlier version of this file, and a run that trusted the list would have wiped the completed counter on every language switch.
> 2. Add `applyTranslations(root = document)` to `src/i18n.ts`: walk both attribute sets and rewrite `textContent` and `placeholder`.
>
>    **Set `document.documentElement.lang` in the same pass.** The page ships `<html lang="en">` and nothing ever moves it, so in French mode a screen reader pronounces "Mon Gestionnaire de Tâches" with an English voice and the browser hyphenates by English rules. It is one line, it is the only part of "switch language" that assistive technology can actually hear, and no visual check will ever miss its absence — because there is nothing to see.
> 3. Call it from `init()` and from `switchLanguage()`, and repaint the task list after — the Delete button is built in `taskManager.ts` and must use `t('button.delete')`.
>
> **Some visible strings have no key in `en.json`. Almost none of them should stay that way.**
>
> The test is not "does the catalogue already have a key for it". It is: **would the user see this string in a language they did not choose?** If yes, it is part of the job — a page that switches to French and keeps English words has not switched. A missing key is an omission in the catalogue, not a decision someone made.
>
> The giveaway on this page: `<h2>Your Tasks</h2>` sits directly beside `<h2>Add New Task</h2>`, which *does* have a key. Two sibling headings, one translated and one not, is an oversight — and a Butler that leaves it reproduces the oversight instead of fixing it.
>
> **Build the detector in the next subsection first, run it, and work from what it names.** The table below is what one correct run produced; the detector is what tells you the truth about the page in front of you.
>
> | String | Key | What to do |
> |---|---|---|
> | the "Your Tasks" heading | `task.list` | add to both catalogues, tag the element |
> | the priority badge (`LOW` / `MEDIUM` / `HIGH`) | `badge.low` · `badge.medium` · `badge.high` | **not** `priority.*` — that key is taken and reads "Low Priority", the `<select>` label, not a short chip. **When the natural key is taken, name the new one after the surface it renders on, not the concept.** |
> | the document `<title>` | `page.title` | **not** `app.title` — taken by the `<h1>`. Set `document.title` inside `applyTranslations()`. |
> | the language buttons (`English` / `Français`) | — | **leave them.** Each is already written in the language it selects; translating them would show "Anglais" to someone who reads only English. This is the one genuine exception. |
>
> Three traps in that row about the badge, and each one passes every English test:
>
> - **The badge is built in code, so `applyTranslations()` never sees it.** The language switch has to re-run the *renderer*, not only the translation pass. It probably already does — for the Delete button — but verify it, because if it does not, the badge keeps the old language with the whole suite green.
> - **Keep the raw priority in the class.** `priority-badge priority-${task.priority}` drives the colour and sits on the same element as the text you are translating. Translate the label; leave the class alone, or the styling dies silently.
> - **This change is invisible in English.** Reverting `t('badge.' + p)` to `priority.toUpperCase()` produces byte-identical English output, so every English assertion stays green — only a French test or the detector can kill that mutant. It is this subsection's whole thesis in one line of code; seed it and watch what fails.
>
> `document.title` and `documentElement.lang` both escape the `root` argument of `applyTranslations(root)` on purpose: they are properties of the document, not of a subtree, so `applyTranslations(panel)` legitimately changes the browser tab. Say so in a comment rather than leaving the next reader to wonder.
>
> **Every key you add goes in `PR_REQUEST.md`** with the string it carries and why the run needed it. Adding vocabulary silently is how a catalogue rots; adding it with a reason is how it grows.
>
> **Derive this list, do not trust it.** What is written here is what one correct run produced, and a later scaffold may differ. Walk the rendered page in the non-default language and list every English word still on screen — that list is the work.
>
> ### Do not verify translation with a command that exits 0
>
> ⚠️ **This is the single most important paragraph in Step 1, because every check that feels like it covers translation does not.** Counting keys exits 0. Comparing `en.json` to `fr.json` exits 0. A suite of jsdom tests asserting on individual elements exits 0. All three can be green while a heading sits on the French page in English — and they were, on four consecutive runs of this Skill. The defect was found by a human looking at the screen.
>
> Those checks measure a **proxy**: *are the keys present, do the files agree, do the elements I thought to test carry the right text.* The thing itself is different: **is there any English left on a French page.** Only the second one is the requirement, and only the second one finds what you forgot to tag.
>
> **Write the ALLOW-LIST check. It is the one that works, so it is the one with the code.**
>
> The obvious version — compare every text node against the English catalogue's values — is the wrong instrument, and it fails in the flattering direction. On this scaffold, run against the broken page, **it returns an empty list**: all four untagged strings had no key, so no English value could match them. Implement that version, see green, and you have reproduced the exact failure this subsection exists to prevent. Keep it if you like as a second assertion; never as the first.
>
> Invert it. Instead of listing what is forbidden, list what is **permitted**, and fail on everything else:
>
> ```ts
> // Everything the page may show in a language other than the active one.
> const TYPED = 'Ma tache de test'
> const ALLOWED = new Set(['English', 'Français', TYPED])
>
> seedPageTitle()        // see the vacuous-pass warning below
> await boot(); switchLanguage('fr'); addTask(TYPED)
>
> const strings: string[] = []
> const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
> for (let n = walker.nextNode(); n; n = walker.nextNode()) {
>   const t = n.textContent?.trim()
>   if (t && /\p{L}/u.test(t)) strings.push(t)          // words only
> }
> for (const el of document.querySelectorAll('[placeholder],[title],[aria-label]')) {
>   for (const a of ['placeholder', 'title', 'aria-label']) {
>     const v = el.getAttribute(a)?.trim()
>     if (v && /\p{L}/u.test(v)) strings.push(v)
>   }
> }
> if (/\p{L}/u.test(document.title)) strings.push(document.title)
>
> expect(strings.length).toBeGreaterThan(10)            // the walk saw the page
> const french = new Set(Object.values(fr))
> expect(strings.filter(s => !french.has(s) && !ALLOWED.has(s))).toEqual([])
> ```
>
> Four things in there are load-bearing, and leaving any of them out gives a test that passes on a broken page:
>
> 1. **`/\p{L}/u` — words only.** A rendered page is mostly not words: `0`, `1`, `:`, `•`, `2026`, whitespace. Without this filter the allow-list has to enumerate them all and nobody maintains that. This one line is the difference between a rule you can write and one you abandon.
> 2. **The test types its own task text and allow-lists that literal.** User content is not knowable at assertion time otherwise, and the tempting alternative — "anything inside `.task-text` is fine" — exempts a whole region of the page by position, which is where an untranslated string would hide.
> 3. **Seed `document.title` from `index.html`.** Your fixture almost certainly mounts `<body>` only, which leaves `document.title` as `''` — no letters, filtered out, assertion passes **against nothing**. Same for `title` and `aria-label` if the page has none: the sweep examines zero elements and reports success. Read the `<title>` out of `index.html` in the fixture and set it before boot.
> 4. **Assert the walk saw something.** `expect(strings.length).toBeGreaterThan(10)` is what separates "nothing was wrong" from "nothing was looked at" — the same rule Gate 2 and the mutation harness rest on.
>
> **What this check then requires of your markup, permanently:** one catalogue string per text node. `Total des tâches : 3` as a single node fails on a correct page, and so does splitting a value so a fragment lands alone. Step 1's wrapper spans already produce that shape here, for an unrelated reason — but it is now a constraint on how you write markup, not only a test. A proper noun in its own node (`TypeScript`) needs allow-listing too: a name is not a language.
>
> ⚠️ **That tolerance covers what you INHERITED. It does not cover what you ADD.** Step 2's error handling puts new sentences on screen — a storage-discarded notice, a boot-failure banner. Hard-coding those in English ships untranslated user text **in a task whose subject is translation**, and on a French screen the heading reads "Mon Gestionnaire de Tâches" above an English error. Every string this run makes visible gets a key, in **both** catalogues.
>
> **The 14 is a floor, not a ceiling.** `expected_fixes.json` describes the gap in the *scaffold* — twelve keys missing out of fourteen required — not a cap on the application's vocabulary. So validate for what the requirement actually says:
>
> - the 14 required keys are present in `fr.json` — this is the check that must never bend;
> - `en.json` and `fr.json` have **identical key sets, in identical order** — this is what keeps an addition honest;
> - any key beyond the 14 exists in both files and is **named in `PR_REQUEST.md` with the string it carries and why the run needed it**.
>
> Do not write a validation that asserts `Object.keys(fr).length === 14`. It passes the scaffold and then forbids the application from ever gaining a word — including the words your own error handling requires.

### Step 2: Code Cleanup

**Goal:** consistent formatting, no lint errors, no dead code.

1. **Check what exists first.** This scaffold ships with neither a formatter nor a linter, and no `lint` script. `npm run lint` will fail with "missing script" — that is not a lint failure, it is an absent toolchain. Install one:

   ```bash
   npm install --save-dev prettier eslint @eslint/js typescript-eslint
   ```

2. Add the scripts to `package.json`:

   ```json
   "format": "prettier --write \"index.html\" \"src/**/*.{ts,css,json}\"",
   "format:check": "prettier --check \"index.html\" \"src/**/*.{ts,css,json}\"",
   "lint": "eslint src --max-warnings 0",
   "typecheck": "tsc --noEmit"
   ```

   > **`index.html` is in the glob on purpose.** The brief says *all source files*, and Step 1 makes `index.html` the **most-modified file of the whole run** — 14 new attributes and 3 new wrapper elements. A glob of `src/**` leaves it covered by no gate at all: `format:check` never reads it, `eslint src` never reads it, and the coverage table cannot see it. The one file the run changes most would be the one nothing checks.
   >
   > It is not Prettier-clean in the scaffold as delivered, so adding it produces a real diff on the first run. **Expect that diff to be the whole file, not a handful of lines**, and do not go hunting for a setting that avoids it: Prettier indents `<head>` and `<body>` one level under `<html>`, this page does not, and no `tabWidth` value changes that. Roughly 54 lines move. This is the one file where item 3's "do not rewrite untouched lines" rule is knowingly set aside — say so in `PR_REQUEST.md` so a reviewer knows the churn was a decision.
   >
   > **Formatting `src/**` also means formatting `src/tests/`, which Operating Rule 7 may reserve to a dedicated test agent.** Resolve it by installing the toolchain and writing `.prettierrc` *before* delegating, then asking the test agent to format its own files as part of its work. That inverts the step numbering — Step 2's tooling lands before Step 1 — and that is fine; say it in the Report Card rather than letting a formatter write into files you are not allowed to author.

   All four, not just the first two: Gate 4 calls `typecheck` and Gate 6 calls `format:check`. Add them here or those gates die on "missing script".

3. Add a minimal `eslint.config.js` and a `.prettierrc` that match the code already in the repo. **Match the existing style; do not impose a new one.** A formatter that rewrites every untouched line buries the real changes in the diff.

   ```json
   { "semi": false, "singleQuote": true, "tabWidth": 2, "printWidth": 100,
     "trailingComma": "none", "arrowParens": "avoid", "endOfLine": "crlf",
     "overrides": [{ "files": ["*.css", "*.html"], "options": { "tabWidth": 4 } }] }
   ```

   > **`endOfLine` is the setting that decides whether this step helps or ruins the diff, and its default is wrong here.** Prettier defaults to `"lf"`. This scaffold is checked out with **CRLF**, so the default rewrites *every line of every file* — including files whose content does not change by a single character. The diff then shows hundreds of modified lines and hides the four that matter.
   >
   > Do not guess. Measure the repo first, then set the value to match:
   >
   > ```bash
   > node -e "const b=require('fs').readFileSync('src/types.ts');console.log(b.includes('\r\n')?'crlf':'lf')"
   > ```
   >
   > **The `overrides` entry is not decoration.** `styles.css` is indented with four spaces. Without the override, `tabWidth: 2` rewrites **244 lines of a file whose content changes by nothing** — the exact harm this paragraph warns about, in the file the paragraph does not check. Measure whatever you are about to format, per extension, and override where the repo disagrees with you.
   >
   > **Verify after formatting, at the byte level, on a file per extension** — one you did not intend to touch must be identical:
   >
   > ```bash
   > node -e "const fs=require('fs');for(const f of ['src/types.ts','src/styles.css','src/translations/en.json']){const b=fs.readFileSync(f);console.log(f, b.includes('\r\n')?'crlf':'lf', b.length)}"
   > ```
   >
   > Compare the output to the same command run before formatting. **Do not use `git diff` for this check.** With `core.autocrlf=true` — the Windows default — git normalises line endings in the index, so `git diff --numstat` reports `0 0` even when the working tree flipped from CRLF to LF. The check would report clean for the one failure it exists to detect. A changed byte length on an untouched file means the line endings moved: fix `endOfLine` and restore before going further.

4. Run them:

   ```bash
   npm run format
   npm run lint
   ```

5. **`handleSubmit()` in `src/main.ts` is the worst offender** — zero indentation, no spaces around `=`, `(`, or `|`. The formatter fixes it. Confirm it did.

6. Remove unused variables and dead code the linter reports. If the answer key names a symbol you cannot find in the source, **do not invent one to match** — report it as not present.

   > Note the circularity and say so in the report: with no linter in the repo, **you are writing the rules that judge you**. Keep them close to what a TypeScript project would normally enforce — unused variables, `prefer-const`, `no-var`, `eqeqeq` — and state that "0 violations" means "none under these rules", not "the code was already perfect". A stricter config would have found more.
   >
   > The Report Card's Step 2 slot asks for *"X lint violations fixed"*, and the honest X here is **0** — there was no linter to violate. That number alone is misleading, and the Report Card's format is fixed, so put the qualifier in the same Details line: `0 lint violations fixed — the repo shipped with no linter, so this run wrote the rules that judge it`. A locked format is a reason to write more carefully inside it, not a licence to report a number you know will be misread.

7. **Improve code style where the answer key names it.** `scaffold/expected_fixes.json` carries a `functions_needing_refactor` list, and formatting a long function does not shorten it. On this scaffold the entry is `"render method in TaskManager is too long"` — 50 lines doing five separate jobs.

   Split it along the jobs, not by line count: filtering the list, building one task row, and updating the stats are three different responsibilities. A `private buildTaskRow(task: Task): HTMLLIElement` and a `private filterTasks(): Task[]` leave `render()` as a short orchestrator.

   **Refactor under the tests, never before them.** This is a behaviour-preserving change, so the suite must be green before and after with **no test edited**. If a test has to change, it was not a refactor.

   > **This item is the one place where the step numbering is a reading order, not an execution order.** The baseline suite is two tests covering almost nothing, so "green before and after" means nothing against it. Do Step 3 first, then come back here: split `render()` once the suite actually covers it, and re-run to prove the split changed no behaviour. The rest of Step 2 — formatter, linter, the two security defects — runs in place, before Step 3.
   >
   > A repository with a test-first guard will force this order on you anyway, by refusing production writes until a red is journalled. Better to arrive there on purpose.

8. **A marker comment that describes work still to be done becomes a lie the moment the work is done — delete it with the work, never on its own.** The scaffold plants two:

   | Marker | Where | What "removing it" means |
   |---|---|---|
   | `// Long function that should be refactored` | `taskManager.ts`, above `render()` | do item 7, then drop the line |
   | `// Missing error handling` | `main.ts`, above the bare `init()` call | **add the handling**, then drop the line |

   The second one is the scaffold telling you where a real hole is. `init()` is `async` and nothing catches its rejection; `loadFromStorage()` calls `JSON.parse` unguarded. Corrupt or non-array data in `localStorage` therefore throws out of the constructor and the user gets a blank page with nothing in the UI to say why. Guard the parse, discard what does not deserialize into an array of tasks, and give the `init()` call a `.catch`.

   > **Two ways this repair goes wrong, and both look finished.**
   >
   > **A type guard that checks types is not a validator.** The field that matters here is `id`: it is the key every destructive action is routed through. `deleteTask` is `filter(t => t.id !== id)` and `toggleTask` is `find(...)`, so **two stored tasks sharing an id mean one click deletes both** and a checkbox toggles the wrong row. Validate `id` as a **safe positive integer** and drop duplicates as you restore. Do the same for every field the type declares — a guard written `value is Task` that skips `createdAt` tells the compiler a lie it will believe for the rest of the file's life.
   >
   > **Validation alone does not fix the counter, and this is the part that is easy to get wrong.** `nextId = Math.max(...ids) + 1` saturates. A stored `id: 1e308` is caught by the guard above — but `Number.MAX_SAFE_INTEGER` **is** a safe positive integer, so it passes validation, and `max + 1` is then no longer safe: `nextId++` stops incrementing and every task the user creates afterwards gets the *same* id. Moving the computation after the filter changes nothing.
   >
   > **Stop deriving the id from a maximum.** Allocate against the set of ids in use, and wrap when the next candidate would leave the safe range:
   >
   > ```ts
   > private allocateId(): number {
   >   const used = new Set(this.tasks.map(t => t.id))
   >   let candidate = Number.isSafeInteger(this.nextId) && this.nextId > 0 ? this.nextId : 1
   >   while (used.has(candidate)) {
   >     candidate = Number.isSafeInteger(candidate + 1) ? candidate + 1 : 1
   >   }
   >   this.nextId = Number.isSafeInteger(candidate + 1) ? candidate + 1 : 1
   >   return candidate
   > }
   > ```
   >
   > Test both halves separately: a stored `1e308` (validation catches it) **and** a stored `MAX_SAFE_INTEGER` (validation accepts it, and the allocator has to cope). A criterion that only tests the first leaves the harder half asserted nowhere.
   >
   > **A `.catch` that only logs converts a loud failure into a silent one.** Before the repair, a rejected boot threw where a developer could see it. After a bare `.catch(console.error)`, the static HTML still paints, no listener is wired, and the page looks *normal* while every click does nothing. That is worse. The catch must leave a visible trace **in the UI** — a message in the task list saying the saved tasks could not be read — not only in a console nobody has open.
   >
   > The rule behind both: **a repair that makes a failure invisible is not a repair.** Ask what the user sees when the new code path fires, and if the answer is "the same thing as success", the handler is wrong.
   >
   > **Apply the rule to the WRITE path too, not only the read.** Guarding `loadFromStorage` and leaving `saveToStorage` bare fixes the failure you were pointed at and leaves its twin untouched. `localStorage.setItem` throws on a full quota and in Safari's private mode, and in `addTask` it throws *between* the push and the repaint: the task is in memory, the page shows nothing, storage has nothing — **three states that disagree, and not one word to the user.**
   >
   > **Keep the task and tell the truth about it — do not roll the push back.** Memory and storage genuinely cannot agree when the write is refused, so the goal is not to make them agree: it is to stop the *page* from lying. Catch the write failure, keep the task in memory, repaint so the user sees what they just typed, and show a notice saying it could not be saved and will be lost on reload. Discarding the task would be the second failure on top of the first.
   >
   > **Every element you add to the page needs a rule in `styles.css`.** A notice appended to a list whose `list-style` is `none` renders as unstyled text with no bullet, no background, no padding and no colour — indistinguishable from empty space. "The message has to land somewhere the user is already looking" is only true if it looks like a message. No test can catch this and neither can any gate; it is on you.
   >
   > **A notice that cannot clear is a notice nobody will trust.** If a flag turns the notice on when storage was rejected, something has to turn it off when storage is healthy again — otherwise it survives every subsequent action until a reload, which teaches the user to ignore it.

   > Deleting the marker without doing the work is the worst of the three options — worse than leaving it. It removes the only signal that the hole exists.

**Expected on this scaffold:** `handleSubmit` reindented; `src/main.ts`, `src/taskManager.ts`, `src/i18n.ts` reformatted; `render()` split; both marker comments gone, each with its work done.

> **Two planted defects that no formatter will catch.** Both are in `src/taskManager.ts`:
>
> - **`text.innerHTML = task.text`** in `render()` injects user input straight into the DOM — a stored XSS hole. Use `textContent`. There is no case in this app where task text should be parsed as HTML.
> - **A credential in a comment** in `loadFromStorage()`: a `temp auth:` token, sitting directly under a `// TODO: migrate to API backend` line that names an internal hostname. A secret in a comment is a secret in the repository, and the git history keeps it after the line is deleted.
>
>   **Remove the token line entirely, and the hostname from the TODO; keep the TODO itself.** The three are not the same thing: the token is a credential, the hostname is internal infrastructure that does not belong in a public fork, and the intention to migrate is legitimate engineering information the next reader needs. Deleting all three loses real context; deleting only the token leaves the internal host in a repository about to be forked.
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

   > **Never assert a translation in the fallback language.** The default locale is English, and the markup already contains the English strings as fallback text. So `expect(h1.textContent).toBe('My Task Manager')` after boot passes whether the translation pass ran or **was deleted entirely** — the expected value was in the DOM before the code under test executed. The test reads correctly, covers the line, and detects nothing.
   >
   > The rule generalises past i18n: **an assertion only tests a transformation when the expected value is absent from the initial state.** Before writing `expect(x).toBe(v)`, ask whether `v` is already there. Defaults, zeros and empty strings are where this bites.
   >
   > Two ways out, use either: assert **in French** after `switchLanguage('fr')`, or put a sentinel in the fixture (`<h1 data-i18n="app.title">__UNTRANSLATED__</h1>`) so the English assertion has something to replace.

5. **Build the DOM fixture *from* `index.html`, do not retype it.** A hand-copied `APP_MARKUP` constant drifts from the page the moment either changes, and nothing fails when it does — `coverage.include` counts `src/**/*.ts`, so `index.html` is in no denominator and its divergence costs zero percent.

   **Put it in one shared module, not in each test file.** Write `src/tests/fixture.ts` once and import it everywhere:

   ```ts
   // src/tests/fixture.ts
   import { readFileSync } from 'node:fs'
   import { fileURLToPath } from 'node:url'
   import { resolve, dirname } from 'node:path'

   const HERE = dirname(fileURLToPath(import.meta.url))
   const PAGE = readFileSync(resolve(HERE, '../../index.html'), 'utf-8')

   /** The page's `<body>` content, read from `index.html` rather than retyped. */
   export const APP_MARKUP = PAGE.slice(PAGE.indexOf('<body>') + 6, PAGE.indexOf('</body>'))
   ```

   > `__dirname` does not exist under Vitest's ESM transform — it is `undefined`, and the failure reads like a path problem rather than a module-system one. `import.meta.url` is the ESM equivalent and works in both.
   >
   > **This helper lands inside `coverage.include: ['src/**/*.ts']` and will appear in the coverage table beside the production files, pulling the headline number down.** Leave it there. Excluding a file from coverage to raise a number is the move Operating Rule 3 forbids, and the honest report — "our own test helper is in the denominator, which costs us a few points" — is worth more than the points. Say so in `PR_REQUEST.md` rather than adding an exclusion to `vitest.config.ts`.
   >
   > **`vitest.config.ts` receives exactly one change in this whole run: Gate 2's `thresholds`.** `provider`, `reporter` and `include` come out byte-identical to the scaffold. Adding enforcement is not weakening; adding an *exclusion* is. That is the line.

   > A snippet copied into three test files is three copies to update when the page moves, and the copies drift apart silently — which is the very failure this item exists to prevent, reintroduced one level up. If you find yourself pasting the same two lines a third time, it was a module.

   This is what makes the `data-i18n` attributes from Step 1 genuinely tested: they are the only link between the page and the code, and asserting on a copy of the page tests the copy.

   **Write test names and identifiers in the language the repository is written in.** Read the existing source, README and comments and match them. A suite whose `it(...)` titles are in another language than the code is unreadable to the next maintainer and to any tool that reads test names as documentation — and on this scaffold, everything is in English. This is worth stating because the agent running this Skill may be prompted in a different language than the repository is written in: **the repository wins, not the prompt.**

   > Whatever the coverage number says, ask what the denominator **excludes**. 100% over three `.ts` files says nothing about the HTML, the CSS or the config.

6. Re-run until green, then confirm the threshold:

   ```bash
   npm run test
   npm run test:coverage
   ```

7. **Check that the net catches something.** Coverage says which lines ran, never whether an assertion would have noticed them going wrong. A suite of hollow assertions reports 100% and protects nothing.

   Copy `src/` to a throwaway directory **outside the repository**, seed one defect at a time there, and run the suite against the copy. Six is enough, chosen where a silent break would hurt most:

   | Seed | A named test must fail |
   |---|---|
   | `textContent` → `innerHTML` in `render()` | the XSS regression test |
   | `toggleTask` always sets `completed = true` | the toggle-twice test |
   | the active/completed filters swapped | the filter tests |
   | `saveToStorage` made a no-op | the reload tests |
   | `t()` returns `''` instead of the key | the missing-key test |
   | **delete the `applyTranslations()` call from `init()` — that one only** | **the boot-translation test** |

   > **That last one is in the list because it is the one that survives.** Deleting the translation pass leaves every English assertion passing — the fallback text in the markup already reads the same. It is the seed that proves whether item 4's rule was actually applied. If the suite stays green, the boot-translation test is a tautology and must be rewritten, not excused.

   **Then seed the code YOU wrote, not only the code you inherited.** The six seeds above all target scaffold behaviour, and a suite built to cover the scaffold will kill them all while leaving the run's own additions completely unguarded. Measured on one run: 17 of 18 scaffold mutants killed, and **every single survivor sat in code the run had just added** — the storage validator, the id allocator, the error banner's fallback path. The suite looked excellent and protected none of the new work.

   Add one seed per guard or branch this run introduced. On this scaffold that means, at least:

   | Seed in new code | What must fail |
   |---|---|
   | the storage validator accepts non-objects (`null` in the stored array) | a test that stores `[null, null]` |
   | the id allocator loses its collision loop | a test that restores colliding ids and then adds tasks |
   | `t()` falls back to English instead of returning the key for an unknown language | a test that calls `setLanguage` with something that is neither `en` nor `fr` |
   | the boot-failure banner loses its no-`#tasks` fallback | a test that fails boot with the list element absent |

   > **The rule: a mutation score is only as honest as the code the mutants live in.** Seeding only where the original defects were measures how well you reproduced someone else's tests. Coverage will not tell you the difference — the new guards *ran*, they were simply never asserted on.
   >
   > **Anchor the seed so it matches once.** After Step 1 there are **two** `applyTranslations()` call sites — `init()` and `switchLanguage()` — so an unanchored replace hits both. That turns the suite red for the wrong reason: the language-switch tests fail, the boot test still passes, and you would score the mutant as caught while the hole is still open. Anchor on the surrounding line in `init()`, then confirm the failures that came back are the **boot** ones.

   > **Normalise line endings before matching an anchor.** On a CRLF checkout, a multi-line anchor written with `\n` matches **zero times**, and a seeding script that does not check its match count scores the mutant as *caught* when nothing was ever seeded — a false pass, in the direction that flatters you. Read the file, replace `\r\n` with `\n`, match, then write back in the original form. **Assert the anchor matched exactly once and abort if it did not**, for every seed.
   >
   > ⚠️ **A non-zero exit is not proof that a mutant was killed, and this is the trap that produces a perfect fake score.** One run's harness addressed its throwaway copy by a Windows 8.3 short path (`C:\Users\JORDAN~1.LEB\...`). Vite resolved module ids against the long path, **every test file failed to COLLECT**, the command exited non-zero — and all sixteen mutants scored KILLED with **not one assertion ever executed**. A 16/16 that means nothing, and it looks exactly like a 16/16 that means everything.
   >
   > Three checks, and the harness is worthless without all three:
   >
   > 1. **Run the UNSEEDED copy first and require it green.** If the baseline is not `exit 0` with the full test count, the copy is broken and no score from it is valid. This single check catches the whole family.
   > 2. **Require the failure to be NAMED tests**, not a file-level error. Parse the output: `Tests N failed` with test names, not `Failed to collect` or `Test Files N failed` with zero cases run.
   > 3. **Compare the total case count** to the baseline. A mutant that reduces the number of cases *collected* did not fail a test, it broke the run.
   >
   > The rule behind it, and it is the same one Gate 2 rests on: **an exit code says a process ended badly, never why.** Any measurement that reads success or failure from an exit code alone is measuring the process, not the thing.

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
| 2 | Coverage | `npm run test:coverage` | Statements ≥ 80%, **enforced by the runner, not read off the table** |
| 3 | Lint | `npm run lint` | Zero errors |
| 4 | Types | `npx tsc --noEmit` | Zero errors |
| 5 | Translations | the Step 1 validation command **and** the no-English-left-on-screen test | Both files aligned **and** nothing outside the allow-list renders in English |
| 6 | Formatting | `npm run format:check` | No file would be rewritten |
| 7 | Deliverables | the four files below exist and **name something this run actually changed** | All four present and current |
| 8 | Idempotence | run every step again | Nothing changes |

The four deliverables of Gate 7: `scaffold/website/README.md`, `CHANGELOG.md`, `PR_REQUEST.md`, and `src/translations/fr.json`.

> **"Non-empty" is too weak a gate for the criterion it serves** — a one-byte `CHANGELOG.md` clears it, while the Success Criteria demand the file reflect *this* run. Close the gap here: grep each generated document for at least one filename this run actually touched. A changelog that names no file it changed is a template, and it fails.

> **Gate 8 is the one nobody writes, and it is the cheapest real check here.** A pre-commit tool that is not idempotent is dangerous: run it twice and it should produce an empty diff.
>
> Re-running means **confirming each step's goal state still holds**, not regenerating its output. Do not rewrite `CHANGELOG.md` and `PR_REQUEST.md` on the second pass — Step 6 writes, so make a third pass after it to prove that write was idempotent too. **Step 3's mutation check is exempt as well**: it runs entirely in a throwaway copy outside the repository, so it cannot move the manifest, and re-seeding six defects on every pass costs minutes to prove nothing.
>
> ```bash
> git status --porcelain     # expect no output
> ```
>
> **Check at the preflight whether that command can answer.** It reports the tree against `HEAD`, not against the state you started from, so it is only meaningful when the tree was already clean before Step 1. It is non-empty — and the gate unrunnable as written — whenever the repository is not a git checkout at all, **or the tree already carried changes, staged or unstaged, when the run began**. The second case is the common one and the easy one to miss: the output looks like a failure you caused.
>
> **A dirty preflight tree is not a reason to stop.** Do not try to recover the prior state, and do not read `HEAD` to work out what it was. Record the preflight output, run the gate on the manifest below, and say in `PR_REQUEST.md` that the primary check was unavailable and why. Refusing to start would be the wrong call: the Butler is there to prepare a commit, and a repository mid-work is the normal case for that.
>
> When it cannot answer, fall back to a content manifest taken before and after. **Run it from the repository root**, not from `scaffold/website/` — this is the second exception to the "every path is relative to `scaffold/website/`" rule, and `CHANGELOG.md` and `PR_REQUEST.md`, the two files most likely to churn, live at the root:
>
> ```bash
> cd "$(git rev-parse --show-toplevel)"   # or the directory containing scaffold/
> node -e "const{createHash}=require('crypto'),fs=require('fs'),p=require('path');const skip=new Set(['node_modules','dist','coverage','.git']);const h=createHash('sha256');(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true}).sort((a,b)=>a.name<b.name?-1:1)){if(skip.has(e.name))continue;const f=p.join(d,e.name);e.isDirectory()?w(f):h.update(f+fs.readFileSync(f))}})('.');console.log(h.digest('hex'))"
> ```
>
> Same hash before and after means nothing moved. Report which of the two checks you used and why — a gate verified by the fallback is a passing gate, a gate skipped because the primary check was noisy is not. A second run that still changes files means something is churning — a formatter fighting the line endings, a test generator appending duplicates, a CHANGELOG rewriting its own entries. Each of those ships noise into a reviewer's diff.

> ⚠️ **A gate can pass because it checked nothing.** `npm run lint` over a glob that matches no file exits 0 and reports clean. A suite that collects zero test files exits 0. An empty pass is indistinguishable from a real one in the exit code, and it is the failure mode a quality gate exists to prevent — so confirm the work was seen, not only that nothing complained:
>
> - the linter names the files it examined, and the count is greater than zero. `npm run lint` prints **nothing** on success, so it cannot answer this — ask for the file list explicitly:
>
>   ```bash
>   npx eslint src -f json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const r=JSON.parse(s);console.log(r.length+' files, '+r.reduce((n,f)=>n+f.errorCount,0)+' errors')})"
>   ```
>
>   Do not write a file count into the report that no command produced.
> - the test run reports more cases than the baseline, not merely "no failures"
> - coverage lists every source file **that carries runtime statements**, not a subset of them — a type-only file like `src/types.ts` is erased at compile time and correctly absent from the table, so "9 files match the include glob but 3 appear" is not by itself a finding

**On failure:** report which gate failed, its exact output, and what would fix it. **Then stop — do not run Step 6.** Do not lower a threshold, skip a test, or add an ignore directive to get past a gate. A Butler that reports "coverage 74%, gate failed, here is the uncovered list" has done its job correctly.

Gate 4 is not in the brief and is worth the two seconds: `vitest` transpiles without type-checking, so a type error passes the whole suite and breaks the build.

> ⚠️ **Gate 2 does not exist until the runner enforces it.** `npm run test:coverage` prints a table and **exits 0 at any coverage whatsoever**. Reading 97% off that table and calling the gate passed is a measurement, not a gate: delete four test files and the same command reports 41% with `main.ts` at 0% and still exits 0. A threshold that lives only in prose — in the README, in `expected_fixes.json`, in your own report — can never turn red, which means it has never once been tested.
>
> Add it to `vitest.config.ts`:
>
> ```ts
> coverage: {
>   provider: 'v8',
>   include: ['src/**/*.ts'],
>   thresholds: { statements: 80 }
> }
> ```
>
> **Then prove it fires.** In a throwaway copy outside the repository, remove enough tests to drop below the line and confirm the command now exits non-zero. A gate you have never seen fail is a gate you have never seen.
>
> **Adding a threshold is not weakening a check — it is the opposite**, and Operating Rule 3 forbids only *lowering* one. Set it at the number the brief names (80), not at the number you happen to have reached: a threshold pinned to your current coverage locks in today's suite and fails the next honest refactor.

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

### Filling the Report Card honestly when its slots are too narrow

Step 7's format is locked and cannot be edited. Several of its slots ask for a single number that this workflow makes ambiguous or false. **A fixed format is a reason to write more carefully inside it, never a licence to report a figure you know will be misread.** Put the qualifier in the same Details line:

| Slot | The trap | Write instead |
|---|---|---|
| `[X of 14 French keys added]` | This Skill orders you to add keys **beyond** the 14. "14" alone hides them. | `12 of 14 added, 2 preserved; 3 further keys added to both catalogues for sentences this run puts on screen` |
| `[X files formatted]` | Rewritten, or examined? The two differ by a factor of three. | `5 rewritten of 14 examined` |
| `[X functions documented]` | Step 4 names 9; the Success Criteria demand the whole public surface. | `17 documented — the 9 named plus the rest of the public surface` |
| `[X lint violations fixed]` | The scaffold has no linter, so the honest answer for **it** is 0 — but you installed one before writing code, so your own additions can raise real findings. Reporting a flat 0 hides work you actually did. | `0 in the delivered scaffold — it shipped with no linter, so this run wrote the rules that judge it; N raised and fixed in code this run added` |

### `scaffold/expected_fixes.json` is an answer key, not a measurement

Treat it as a to-do list to satisfy, and as a claim to verify — it is stale in at least two places on this scaffold:

- `current_coverage: 30` — the measured baseline is **26.02%**. Report what you measured, and say the key disagrees.
- `unused_variables: ["unusedVariable"]` — the symbol does not exist in the source. Report it absent; do not invent one to match.

Its `missing_keys`, `functions_needing_refactor`, `missing_docstrings`, `readme_sections_needed` and `quality_gates` are accurate and are the parts to work from.

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
  styles.css: *.css override at tabWidth 4 → 16 lines changed, not 244
  eslint: 0 errors
  refactor (after Step 3): render() 50 → 9 lines, split into
    filterTasks() + buildTaskRow() · suite green before and after,
    no test edited
  markers removed with their work done:
    'Long function that should be refactored' → the split above
    'Missing error handling' → init().catch + guarded JSON.parse
  expected_fixes.json names 'unusedVariable' — searched, ABSENT from the
    source. Reported as not present rather than invented to match.
  ⚠ SECURITY — 2 defects not in the answer key:
    taskManager.ts:74  innerHTML = task.text → textContent (stored XSS)
    taskManager.ts:113 credential in comment → token removed, internal
                       hostname removed, TODO kept
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

Tick each box by **running the check named beside it**, never by recalling what you did. An
unticked box is a finding to report, not a reason to keep going.

- [ ] **All 14 French translation keys present in `fr.json`** — the Step 1 validation command exits 0
- [ ] **Code formatted consistently** — `npm run format:check` reports no file would be rewritten
- [ ] **No lint violations** — `npm run lint` → 0 errors
- [ ] **Test coverage ≥ 80% statements** — read it off `npm run test:coverage`, do not estimate
- [ ] **All tests pass** — `npm run test` exit code 0
- [ ] **No type errors** — `npm run typecheck` exit code 0
- [ ] **TSDoc on every exported function and public method** — the 9 the brief names, **and** the rest of the public surface: `getTasks`, `getCompletedCount`, and everything `i18n.ts` exports. The 9 are the floor, not the list
- [ ] **`README.md` has Features, Testing and Contributing** — all three headings present
- [ ] **`CHANGELOG.md` generated** — exists, non-empty, and reflects *this* run
- [ ] **`PR_REQUEST.md` generated** — carries a summary, a checklist and the measured coverage
- [ ] **Conventional commit message prepared** — matches `<type>(<scope>): <subject>`
- [ ] **Every `functions_needing_refactor` entry addressed** — `render()` split into named helpers, suite green before and after with no test edited
- [ ] **No marker comment left describing work that is now done** — `grep -rn "should be refactored\|Missing error handling" src/` returns nothing, and the work each named is actually done
- [ ] **The storage guard validates `id`, not just its type** — duplicate ids dropped, `id` a safe positive integer; a stored `id: 1e308` does not break task creation
- [ ] **A stored `Number.MAX_SAFE_INTEGER` id still lets the app hand out two distinct ids afterwards** — it passes validation, so only the allocator can catch it; `max + 1` fails this box
- [ ] **Gate 2 can actually fail** — `thresholds` is in `vitest.config.ts`, and removing tests in a throwaway copy makes `npm run test:coverage` exit non-zero
- [ ] **Every string this run puts on screen has a key in both catalogues** — no English sentence appears while the UI is in French
- [ ] **A test walks the rendered French page and fails on any English left on screen** — text nodes, `placeholder`, `title`, `aria-label` and `document.title`, against an explicit allow-list. Counting keys is not this test; four runs passed the key count with an English heading on the page.
- [ ] **Every element this run adds to the page has a rule in `styles.css`** — a notice with no styling is indistinguishable from empty space
- [ ] **The write path fails loudly too** — a throwing `localStorage.setItem` tells the user, and does not leave memory, page and storage disagreeing
- [ ] **`document.documentElement.lang` follows the selected language** — the one part of the switch that assistive technology can hear
- [ ] **Mutants were seeded in the code this run ADDED, not only in the scaffold** — one per new guard or branch, each killed by a named test
- [ ] **Every new failure path is visible to the user** — the boot `.catch` puts a message on screen, not only in the console
- [ ] **`index.html` passes the formatter** — it is in the `format:check` glob, and it is the file this run changes most
- [ ] **Tests read in the repository's language** — `it(...)` titles and identifiers match the language of the source, whatever language the run was prompted in
- [ ] **No check was weakened to pass** — no lowered threshold, no deleted test, no added ignore directive
- [ ] **The suite catches seeded defects** — N seeded, M caught, every survivor explained
- [ ] **Deleting `applyTranslations()` from `init()` turns the suite red** — if it stays green, the boot-translation assertion is a tautology
- [ ] **A second full run changes nothing** — `git status --porcelain` is empty
- [ ] **No gate passed vacuously** — the linter saw files, and the suite ran more cases than the baseline

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
