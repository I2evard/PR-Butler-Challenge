// SCENARIOS - the two catalogues must stay aligned
//   1. Every key the brief requires is present in the French catalogue
//   2. Both catalogues hold the same keys, declared in the same order
//   3. No French value is an empty string
//   4. The catalogue may grow: the required count is a floor, never a ceiling
//   5. The five keys added to widen the translation scope are present in both catalogues

import { describe, it, expect } from 'vitest'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const EN = enCatalogue as Record<string, string>
const FR = frCatalogue as Record<string, string>

/** The fourteen keys the brief requires. This list must never shrink. */
const REQUIRED_KEYS = [
  'app.title',
  'task.add',
  'task.placeholder',
  'priority.low',
  'priority.medium',
  'priority.high',
  'button.add',
  'filter.all',
  'filter.active',
  'filter.completed',
  'stats.total',
  'stats.completed',
  'button.delete',
  'footer.text'
]

/**
 * The keys added when the translation scope widened to the tab title, the "Your Tasks" heading
 * and the priority chips. Named one by one so that silently dropping one is caught here.
 */
const WIDENED_SCOPE_KEYS = ['page.title', 'task.list', 'badge.low', 'badge.medium', 'badge.high']

describe('translation catalogues', () => {
  it('has every required key in the French catalogue', () => {
    const missing = REQUIRED_KEYS.filter(key => !Object.prototype.hasOwnProperty.call(FR, key))
    expect(missing).toEqual([])
  })

  it('has every required key in the English catalogue', () => {
    const missing = REQUIRED_KEYS.filter(key => !Object.prototype.hasOwnProperty.call(EN, key))
    expect(missing).toEqual([])
  })

  it('has every widened-scope key in both catalogues', () => {
    const missingFromEnglish = WIDENED_SCOPE_KEYS.filter(
      key => !Object.prototype.hasOwnProperty.call(EN, key)
    )
    const missingFromFrench = WIDENED_SCOPE_KEYS.filter(
      key => !Object.prototype.hasOwnProperty.call(FR, key)
    )
    expect(missingFromEnglish).toEqual([])
    expect(missingFromFrench).toEqual([])
  })

  it('declares the same keys in the same order in both catalogues', () => {
    expect(Object.keys(FR)).toEqual(Object.keys(EN))
  })

  it('gives every French key a non-empty string value', () => {
    for (const [key, value] of Object.entries(FR)) {
      expect(typeof value, `fr.json value for "${key}"`).toBe('string')
      expect(value.trim(), `fr.json value for "${key}"`).not.toBe('')
    }
  })

  it('gives every English key a non-empty string value', () => {
    for (const [key, value] of Object.entries(EN)) {
      expect(typeof value, `en.json value for "${key}"`).toBe('string')
      expect(value.trim(), `en.json value for "${key}"`).not.toBe('')
    }
  })

  it('holds at least the required number of keys, and may hold more', () => {
    expect(Object.keys(EN).length).toBeGreaterThanOrEqual(REQUIRED_KEYS.length)
    expect(Object.keys(FR).length).toBeGreaterThanOrEqual(REQUIRED_KEYS.length)
  })
})
