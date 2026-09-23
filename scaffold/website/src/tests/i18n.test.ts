import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { applyTranslations, getCurrentLanguage, loadTranslations, setLanguage, t } from '../i18n'

/*
 * SCENARIOS - i18n
 *
 *  1. loadTranslations() resolves without throwing
 *  2. t() returns the English wording by default
 *  3. After setLanguage('fr'), t() returns the French wording
 *  4. An unknown key is returned as-is, not as an empty string
 *  5. An unknown language falls back to returning the key itself
 *  6. getCurrentLanguage() reports the language last set
 *  7. applyTranslations() rewrites the text of every [data-i18n] element
 *  8. applyTranslations() rewrites the placeholder of every [data-i18n-placeholder] element
 *  9. applyTranslations() re-renders the same DOM in French after a language switch
 * 10. applyTranslations() leaves an element whose data-i18n key is unknown showing that key
 * 11. applyTranslations() scoped to a root ignores elements outside that root
 * 12. applyTranslations() defaults to the whole document when no root is given
 */

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('en')
    document.body.innerHTML = ''
  })

  afterEach(() => {
    setLanguage('en')
  })

  // Scenario 1
  it('resolves loadTranslations without throwing', async () => {
    await expect(loadTranslations()).resolves.toBeUndefined()
  })

  // Scenario 2
  it('translates into English by default', () => {
    expect(t('app.title')).toBe('My Task Manager')
    expect(t('button.delete')).toBe('Delete')
  })

  // Scenario 3
  it('translates into French once the language is switched', () => {
    setLanguage('fr')

    expect(t('app.title')).toBe('Mon Gestionnaire de Tâches')
    expect(t('button.delete')).toBe('Supprimer')
  })

  // Scenario 4
  it('returns the key itself when the key is unknown', () => {
    expect(t('no.such.key')).toBe('no.such.key')
  })

  // Scenario 5
  it('returns the key itself when the language is unknown', () => {
    setLanguage('de')

    expect(t('app.title')).toBe('app.title')
  })

  // Scenario 6
  it('reports the current language', () => {
    expect(getCurrentLanguage()).toBe('en')

    setLanguage('fr')
    expect(getCurrentLanguage()).toBe('fr')

    setLanguage('en')
    expect(getCurrentLanguage()).toBe('en')
  })

  // Scenarios 7, 8 and 9
  it('rewrites text and placeholders, then re-renders them in French', () => {
    const root = document.createElement('div')
    root.innerHTML =
      '<h1 data-i18n="app.title">placeholder</h1>' +
      '<button data-i18n="button.add">placeholder</button>' +
      '<input data-i18n-placeholder="task.placeholder" placeholder="placeholder" />'

    applyTranslations(root)

    expect(root.querySelector('h1')?.textContent).toBe('My Task Manager')
    expect(root.querySelector('button')?.textContent).toBe('Add Task')
    expect(root.querySelector('input')?.getAttribute('placeholder')).toBe('Enter task description')

    setLanguage('fr')
    applyTranslations(root)

    expect(root.querySelector('h1')?.textContent).toBe('Mon Gestionnaire de Tâches')
    expect(root.querySelector('button')?.textContent).toBe('Ajouter la tâche')
    expect(root.querySelector('input')?.getAttribute('placeholder')).toBe(
      'Saisir la description de la tâche'
    )
  })

  // Scenario 10
  it('shows the key when a data-i18n element points at an unknown key', () => {
    const root = document.createElement('div')
    root.innerHTML = '<p data-i18n="nope.missing">original</p>'

    applyTranslations(root)

    expect(root.querySelector('p')?.textContent).toBe('nope.missing')
  })

  // Scenario 11
  it('only touches elements inside the given root', () => {
    document.body.innerHTML =
      '<div id="inside"><h1 data-i18n="app.title">before</h1></div>' +
      '<h2 data-i18n="task.add">untouched</h2>'

    applyTranslations(document.getElementById('inside') as ParentNode)

    expect(document.querySelector('#inside h1')?.textContent).toBe('My Task Manager')
    expect(document.querySelector('h2')?.textContent).toBe('untouched')
  })

  // Scenario 12
  it('defaults to the whole document when no root is given', () => {
    document.body.innerHTML =
      '<h1 data-i18n="app.title">before</h1>' +
      '<input id="field" data-i18n-placeholder="task.placeholder" placeholder="before" />'

    applyTranslations()

    expect(document.querySelector('h1')?.textContent).toBe('My Task Manager')
    expect(document.getElementById('field')?.getAttribute('placeholder')).toBe(
      'Enter task description'
    )
  })
})
