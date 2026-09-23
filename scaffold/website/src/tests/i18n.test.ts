/**
 * SCENARIOS -- the translation engine
 *
 *  1. English is the language in force when nothing has been chosen.
 *  2. An unknown key comes back as the key itself, never as `undefined` or a blank.
 *  3. Choosing French changes both what `t()` returns and what `getCurrentLanguage()` reports.
 *  4. `loadTranslations()` resolves.
 *  5. `applyTranslations(root)` fills in the text of every `[data-i18n]` element under `root`.
 *  6. `applyTranslations(root)` fills in the placeholder of every `[data-i18n-placeholder]`.
 *  7. It does the same thing in French.
 *  8. It leaves untagged elements alone.
 *  9. Called with no argument, it translates the live document.
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { applyTranslations, getCurrentLanguage, loadTranslations, setLanguage, t } from '../i18n'
import { queryOrThrow } from './fixture'

const SAMPLE = `
  <h1 data-i18n="app.title"></h1>
  <input data-i18n-placeholder="task.placeholder" />
  <button data-i18n="button.delete"></button>
  <p id="untagged">Left alone</p>
`

function detachedRoot(): HTMLElement {
  const root = document.createElement('div')
  root.innerHTML = SAMPLE
  return root
}

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('en')
    document.body.innerHTML = ''
  })

  it('answers in English before any language has been chosen', () => {
    expect(getCurrentLanguage()).toBe('en')
    expect(t('app.title')).toBe('My Task Manager')
  })

  it('returns the key itself when the key is missing from the catalogue', () => {
    expect(t('does.not.exist')).toBe('does.not.exist')
  })

  it('switches to French for both t() and getCurrentLanguage()', () => {
    setLanguage('fr')
    expect(getCurrentLanguage()).toBe('fr')
    expect(t('button.delete')).toBe('Supprimer')
    expect(t('app.title')).toBe('Mon Gestionnaire de Tâches')
  })

  it('resolves loadTranslations()', async () => {
    await expect(loadTranslations()).resolves.toBeUndefined()
  })

  it('translates the text of every [data-i18n] element under the given root', () => {
    const root = detachedRoot()
    applyTranslations(root)
    expect(queryOrThrow('h1', root).textContent).toBe('My Task Manager')
    expect(queryOrThrow('button', root).textContent).toBe('Delete')
  })

  it('translates the placeholder of every [data-i18n-placeholder] element', () => {
    const root = detachedRoot()
    applyTranslations(root)
    const input = queryOrThrow<HTMLInputElement>('input', root)
    expect(input.getAttribute('placeholder')).toBe('Enter task description')
    expect(input.placeholder).toBe('Enter task description')
  })

  it('translates the same root into French once the language has changed', () => {
    const root = detachedRoot()
    setLanguage('fr')
    applyTranslations(root)
    expect(queryOrThrow('h1', root).textContent).toBe('Mon Gestionnaire de Tâches')
    expect(queryOrThrow('button', root).textContent).toBe('Supprimer')
    expect(queryOrThrow<HTMLInputElement>('input', root).placeholder).toBe(
      'Saisir la description de la tâche'
    )
  })

  it('leaves elements without a translation attribute untouched', () => {
    const root = detachedRoot()
    applyTranslations(root)
    expect(queryOrThrow('#untagged', root).textContent).toBe('Left alone')
  })

  it('translates the live document when called with no argument', () => {
    document.body.innerHTML = SAMPLE
    applyTranslations()
    expect(queryOrThrow('h1').textContent).toBe('My Task Manager')
    expect(queryOrThrow<HTMLInputElement>('input').placeholder).toBe('Enter task description')
  })
})
