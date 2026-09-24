// SCENARIOS - is there any English left on a French page?
//
// Counting keys exits 0. Diffing en.json against fr.json exits 0. A suite that asserts on the
// elements somebody thought to tag exits 0. All three measure a proxy, and all three stayed
// green while an English heading sat on the French page. This file measures the thing itself:
// it walks the page as it is actually rendered, in French, and names every English word still
// on screen. What has no key is exactly what was missed, so the rule here is not "does this
// string have a key" but "is this string allowed to be here at all".
//
//   1. No English catalogue value survives anywhere on the French page
//   2. Nothing is on screen but French sentences, the language buttons and what the user typed
//   3. The same rule holds for placeholder, title and aria-label attributes
//   4. The same rule holds for the browser-tab title
//   5. The detector proves it actually looked: a walk that sees nothing is the same failure
//      class this file exists to catch

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { mountPage, PAGE_TITLE } from './fixture'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const EN = enCatalogue as Record<string, string>
const FR = frCatalogue as Record<string, string>

/** The task description this test types into the form. Deliberately not English prose. */
const TYPED_TASK = 'Ma tache de test'

/**
 * Everything the French page is PERMITTED to show that is not a French catalogue value.
 * Exactly three entries, each for a stated reason:
 * - `English` and `Français`: the two language buttons. Each is already written in the language
 *   it selects, so translating either would make it unreadable to the reader who needs it.
 * - {@link TYPED_TASK}: the user typed it. The application must never rewrite a user's words.
 * Anything else on screen is a bug, and this file is what names it.
 */
const ALLOWED = new Set(['English', 'Français', TYPED_TASK])

const FRENCH_VALUES = new Set(Object.values(FR).map(value => value.trim()))
const ENGLISH_VALUES = new Set(Object.values(EN).map(value => value.trim()))

/** True when the text carries at least one letter, in any script. */
function hasLetters(text: string): boolean {
  return /\p{L}/u.test(text)
}

/** A string is acceptable on the French page if it is a French sentence or is allow-listed. */
function isAcceptable(text: string): boolean {
  return FRENCH_VALUES.has(text) || ALLOWED.has(text)
}

/** Every trimmed text node under `<body>` that carries at least one letter. */
function wordsOnScreen(): string[] {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT)
  const words: string[] = []
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.textContent?.trim() ?? ''
    if (hasLetters(text)) words.push(text)
  }
  return words
}

/** Every element under `<body>` carrying the given attribute. */
function elementsWith(attribute: string): Element[] {
  return Array.from(document.body.querySelectorAll('[' + attribute + ']'))
}

/** Renders the failing strings into the assertion message, because that list is the point. */
function report(label: string, offenders: string[]): string {
  return offenders.length === 0 ? label : label + ': ' + offenders.join(' | ')
}

describe('no English left on the French page', () => {
  beforeAll(async () => {
    localStorage.clear()
    document.documentElement.lang = 'en'
    // mountPage() mounts <body> only, so seed the tab title the way a browser would load it.
    document.title = PAGE_TITLE
    mountPage()

    vi.resetModules()
    await import('../main')
    await new Promise(resolve => setTimeout(resolve, 0))

    // Badges and delete buttons are built in code, not in the markup, so a static-page check
    // would never see them. One task of each priority makes all three chips appear.
    const input = document.querySelector<HTMLInputElement>('#task-input')!
    const select = document.querySelector<HTMLSelectElement>('#priority-select')!
    const form = document.querySelector<HTMLFormElement>('#task-form')!
    for (const priority of ['low', 'medium', 'high']) {
      input.value = TYPED_TASK
      select.value = priority
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    }

    document.querySelector<HTMLButtonElement>('#lang-fr')!.click()
  })

  afterAll(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('shows no English catalogue value anywhere on the page', () => {
    const leftInEnglish = wordsOnScreen().filter(text => ENGLISH_VALUES.has(text))
    expect(
      leftInEnglish,
      report('English catalogue values still on screen', leftInEnglish)
    ).toEqual([])
  })

  it('shows nothing but French, the language buttons and what the user typed', () => {
    const offenders = wordsOnScreen().filter(text => !isAcceptable(text))
    expect(offenders, report('not French and not allow-listed', offenders)).toEqual([])
  })

  it('shows nothing but French in the placeholder, title and aria-label attributes', () => {
    const offenders: string[] = []
    for (const attribute of ['placeholder', 'title', 'aria-label']) {
      for (const element of elementsWith(attribute)) {
        const value = element.getAttribute(attribute)?.trim() ?? ''
        if (hasLetters(value) && !isAcceptable(value)) {
          offenders.push(attribute + '="' + value + '"')
        }
      }
    }
    expect(offenders, report('attributes not French and not allow-listed', offenders)).toEqual([])
  })

  it('shows a French browser-tab title', () => {
    const title = document.title.trim()
    const offenders = [title].filter(text => hasLetters(text) && !isAcceptable(text))
    expect(offenders, report('browser-tab title', offenders)).toEqual([])
  })

  it('proves it actually looked at the page', () => {
    // A detector that finds nothing because it walked nothing is the very failure class this
    // file exists to catch, so a green run has to show its work.
    expect(wordsOnScreen().length).toBeGreaterThan(10)
    expect(elementsWith('placeholder').length).toBeGreaterThanOrEqual(1)
    expect(hasLetters(document.title)).toBe(true)
  })
})
