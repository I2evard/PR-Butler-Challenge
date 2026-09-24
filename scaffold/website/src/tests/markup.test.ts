// SCENARIOS - the page markup is the wiring between the screen and the catalogue
//   1. The page marks exactly the thirteen documented strings as translatable, no more, no less
//   2. The task input declares its placeholder as translatable
//   3. Every key the page asks for exists in the English catalogue
//   4. Translating the page does not destroy the counters nor the footer year
//   5. The "Your Tasks" heading is translated, like the sibling heading it sits beside
//   6. The two language buttons are the one and only string left untranslated on purpose

import { describe, it, expect, beforeEach } from 'vitest'
import { applyTranslations, setLanguage } from '../i18n'
import { mountPage } from './fixture'
import enCatalogue from '../translations/en.json'

const EN = enCatalogue as Record<string, string>

/** The complete list of strings the page declares as translatable. */
const EXPECTED_KEYS = [
  'app.title',
  'task.add',
  'priority.low',
  'priority.medium',
  'priority.high',
  'button.add',
  'filter.all',
  'filter.active',
  'filter.completed',
  'stats.total',
  'stats.completed',
  'footer.text',
  'task.list'
]

function keysInPage(): string[] {
  return Array.from(document.querySelectorAll('[data-i18n]')).map(
    element => element.getAttribute('data-i18n') ?? ''
  )
}

describe('index.html translation markup', () => {
  beforeEach(() => {
    setLanguage('en')
    mountPage()
  })

  it('declares exactly the thirteen documented translatable strings', () => {
    expect(keysInPage().slice().sort()).toEqual(EXPECTED_KEYS.slice().sort())
  })

  it('declares the task input placeholder as translatable', () => {
    const input = document.querySelector('#task-input')
    expect(input).not.toBeNull()
    expect(input!.getAttribute('data-i18n-placeholder')).toBe('task.placeholder')
  })

  it('only asks for keys that exist in the English catalogue', () => {
    const missing = keysInPage().filter(key => !Object.prototype.hasOwnProperty.call(EN, key))
    expect(missing).toEqual([])
  })

  it('keeps the total counter alive through a translation pass', () => {
    applyTranslations()
    expect(document.querySelector('#total-count')).not.toBeNull()
  })

  it('keeps the completed counter alive through a translation pass', () => {
    applyTranslations()
    expect(document.querySelector('#completed-count')).not.toBeNull()
  })

  it('keeps the footer year alive through a translation pass', () => {
    applyTranslations()
    const footer = document.querySelector('footer p')
    expect(footer).not.toBeNull()
    expect(footer!.textContent).toContain('2026')
  })

  // "Your Tasks" sits beside "Add New Task", which has a key. Two sibling headings, one
  // translated and one not, is an oversight rather than a decision worth preserving.
  it('translates the "Your Tasks" heading like the sibling heading beside it', () => {
    const heading = Array.from(document.querySelectorAll('h2')).find(
      element => element.textContent?.trim() === 'Your Tasks'
    )
    expect(heading).toBeDefined()
    expect(heading!.getAttribute('data-i18n')).toBe('task.list')
  })

  // The two language buttons are the ONE genuine exception left on the page: each is already
  // written in the language it selects, so translating them would make them unreadable to the
  // very reader who needs them. Every other visible catalogue string now carries a key.
  it('leaves both language buttons untranslated, the one genuine exception', () => {
    const english = document.querySelector('#lang-en')
    const french = document.querySelector('#lang-fr')
    expect(english).not.toBeNull()
    expect(french).not.toBeNull()
    expect(english!.hasAttribute('data-i18n')).toBe(false)
    expect(french!.hasAttribute('data-i18n')).toBe(false)
  })

  it('marks the priority options but not the select that wraps them', () => {
    const select = document.querySelector('#priority-select')
    expect(select).not.toBeNull()
    expect(select!.hasAttribute('data-i18n')).toBe(false)
    const optionKeys = Array.from(select!.querySelectorAll('option')).map(option =>
      option.getAttribute('data-i18n')
    )
    expect(optionKeys).toEqual(['priority.low', 'priority.medium', 'priority.high'])
  })
})
