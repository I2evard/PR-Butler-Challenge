/**
 * SCENARIOS -- translation catalogues and the markup that consumes them
 *
 *  1. The English and French catalogues describe the same 14 keys, in both directions.
 *  2. The two catalogues list their keys in the same order, so a reviewer can diff them.
 *  3. Every French value is a non-empty string, and none is a copy of the English one.
 *  4. The French values are exactly the ones the contract promises.
 *  5. index.html carries exactly 12 `data-i18n` attributes and exactly 1 `data-i18n-placeholder`.
 *  6. The keys used in the markup are exactly the 13 expected ones.
 *  7. Every key used in the markup exists in both catalogues.
 *  8. The two stats labels and the footer label live in their OWN span, so the counters
 *     (`#total-count`, `#completed-count`) and the ` . 2026` suffix survive a translation.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { APP_MARKUP, queryOrThrow } from './fixture'

const HERE = dirname(fileURLToPath(import.meta.url))

function readCatalogue(file: string): Record<string, string> {
  const raw = readFileSync(resolve(HERE, `../translations/${file}`), 'utf-8')
  return JSON.parse(raw) as Record<string, string>
}

const en = readCatalogue('en.json')
const fr = readCatalogue('fr.json')

const EXPECTED_FRENCH: Record<string, string> = {
  'app.title': 'Mon Gestionnaire de Tâches',
  'task.add': 'Ajouter une Nouvelle Tâche',
  'task.placeholder': 'Saisir la description de la tâche',
  'priority.low': 'Priorité faible',
  'priority.medium': 'Priorité moyenne',
  'priority.high': 'Priorité élevée',
  'button.add': 'Ajouter la tâche',
  'filter.all': 'Toutes les tâches',
  'filter.active': 'Actives',
  'filter.completed': 'Terminées',
  'stats.total': 'Total des tâches',
  'stats.completed': 'Terminées',
  'button.delete': 'Supprimer',
  'footer.text': 'Conçu avec TypeScript'
}

/**
 * Keys whose French value is legitimately identical to the English one -- a proper
 * noun, a brand, a number. There are none in this catalogue; the list exists so that
 * adding one is a deliberate, reviewable act rather than a silently skipped assertion.
 */
const LEGITIMATELY_IDENTICAL: string[] = []

const EXPECTED_MARKUP_KEYS = [
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
  'footer.text'
]

function mountedMarkup(): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = APP_MARKUP
  return root
}

describe('translation catalogues', () => {
  it('describes 14 keys in English', () => {
    expect(Object.keys(en)).toHaveLength(14)
  })

  it('describes 14 keys in French', () => {
    expect(Object.keys(fr)).toHaveLength(14)
  })

  it('has no English key missing from French', () => {
    const missing = Object.keys(en).filter(key => !(key in fr))
    expect(missing).toEqual([])
  })

  it('has no French key missing from English', () => {
    const extra = Object.keys(fr).filter(key => !(key in en))
    expect(extra).toEqual([])
  })

  it('lists its keys in the same order in both files', () => {
    expect(Object.keys(fr)).toEqual(Object.keys(en))
  })

  it('gives every French key a non-empty string value', () => {
    for (const [key, value] of Object.entries(fr)) {
      expect(typeof value, `fr["${key}"] should be a string`).toBe('string')
      expect(value.trim().length, `fr["${key}"] should not be blank`).toBeGreaterThan(0)
    }
  })

  it('never leaves a French value identical to its English counterpart', () => {
    const untranslated = Object.keys(en).filter(
      key => fr[key] === en[key] && !LEGITIMATELY_IDENTICAL.includes(key)
    )
    expect(untranslated).toEqual([])
  })

  it('uses exactly the French wording the contract promises', () => {
    expect(fr).toEqual(EXPECTED_FRENCH)
  })
})

describe('index.html translation attributes', () => {
  it('carries exactly 12 data-i18n attributes', () => {
    expect(mountedMarkup().querySelectorAll('[data-i18n]')).toHaveLength(12)
  })

  it('carries exactly 1 data-i18n-placeholder attribute', () => {
    expect(mountedMarkup().querySelectorAll('[data-i18n-placeholder]')).toHaveLength(1)
  })

  it('tags exactly the 12 expected elements', () => {
    const keys = Array.from(mountedMarkup().querySelectorAll('[data-i18n]')).map(element =>
      element.getAttribute('data-i18n')
    )
    expect(keys).toEqual(EXPECTED_MARKUP_KEYS)
  })

  it('tags the task input placeholder with task.placeholder', () => {
    const input = queryOrThrow('[data-i18n-placeholder]', mountedMarkup())
    expect(input.id).toBe('task-input')
    expect(input.getAttribute('data-i18n-placeholder')).toBe('task.placeholder')
  })

  it('only uses keys that exist in both catalogues', () => {
    const root = mountedMarkup()
    const used = [
      ...Array.from(root.querySelectorAll('[data-i18n]')).map(e => e.getAttribute('data-i18n')),
      ...Array.from(root.querySelectorAll('[data-i18n-placeholder]')).map(e =>
        e.getAttribute('data-i18n-placeholder')
      )
    ]
    const unknown = used.filter(key => key === null || !(key in en) || !(key in fr))
    expect(unknown).toEqual([])
  })
})

describe('index.html wrapper spans', () => {
  function labelParagraph(key: string): { label: Element; paragraph: Element } {
    const root = mountedMarkup()
    const label = queryOrThrow(`[data-i18n="${key}"]`, root)
    const paragraph = label.closest('p')
    if (!paragraph) {
      throw new Error(`Expected [data-i18n="${key}"] to sit inside a <p>`)
    }
    return { label, paragraph }
  }

  it('wraps the total-tasks label in its own span, next to #total-count', () => {
    const { label, paragraph } = labelParagraph('stats.total')
    expect(label.tagName).toBe('SPAN')
    expect(paragraph.querySelector('#total-count')).not.toBeNull()
  })

  it('wraps the completed-tasks label in its own span, next to #completed-count', () => {
    const { label, paragraph } = labelParagraph('stats.completed')
    expect(label.tagName).toBe('SPAN')
    expect(paragraph.querySelector('#completed-count')).not.toBeNull()
  })

  it('wraps the footer label in its own span, so the year survives', () => {
    const { label, paragraph } = labelParagraph('footer.text')
    expect(label.tagName).toBe('SPAN')
    expect(paragraph.textContent).toContain('2026')
  })
})
