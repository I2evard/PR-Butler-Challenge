// SCENARIOS - the translation engine
//   1. A known key returns the sentence of the active language
//   2. An unknown key returns the key itself, never an empty string
//   3. Switching to French returns the French sentence
//   4. An unknown language returns the key, it does NOT quietly fall back to English
//   5. The current language reported matches the language that was set
//   6. Loading the catalogues resolves
//   7. Applying translations rewrites the text of every element that declares a key
//   8. Applying translations rewrites the placeholder attribute of the elements that declare one
//   9. Applying translations records the active language on the <html> element
//  10. Applying translations rewrites the browser-tab title, which has no element to carry a key
//  11. Applying translations to a subtree leaves the rest of the document alone

import { describe, it, expect, beforeEach } from 'vitest'
import { applyTranslations, getCurrentLanguage, loadTranslations, setLanguage, t } from '../i18n'
import { UNTRANSLATED } from './fixture'

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('en')
    document.body.innerHTML = ''
    document.documentElement.lang = 'en'
    document.title = UNTRANSLATED
  })

  it('returns the English sentence for a known key', () => {
    expect(t('app.title')).toBe('My Task Manager')
  })

  it('returns the key itself for an unknown key', () => {
    expect(t('nope.not.a.key')).toBe('nope.not.a.key')
  })

  it('returns the French sentence once the language is French', () => {
    setLanguage('fr')
    expect(t('button.delete')).toBe('Supprimer')
  })

  it('returns the key, not the English sentence, for an unknown language', () => {
    setLanguage('zz')
    expect(t('app.title')).toBe('app.title')
  })

  it('reports the language that was last set', () => {
    expect(getCurrentLanguage()).toBe('en')
    setLanguage('fr')
    expect(getCurrentLanguage()).toBe('fr')
  })

  it('resolves when the catalogues are loaded', async () => {
    await expect(loadTranslations()).resolves.toBeUndefined()
  })

  it('rewrites the text of every element that declares a key', () => {
    const host = document.createElement('div')
    host.innerHTML = `<h1 data-i18n="app.title">${UNTRANSLATED}</h1><button data-i18n="button.add">${UNTRANSLATED}</button>`
    document.body.appendChild(host)

    expect(host.querySelector('h1')!.textContent).toBe(UNTRANSLATED)

    applyTranslations(host)

    expect(host.querySelector('h1')!.textContent).toBe('My Task Manager')
    expect(host.querySelector('button')!.textContent).toBe('Add Task')
  })

  it('rewrites the placeholder attribute of the elements that declare one', () => {
    const host = document.createElement('div')
    host.innerHTML = `<input data-i18n-placeholder="task.placeholder" placeholder="${UNTRANSLATED}">`
    document.body.appendChild(host)

    const input = host.querySelector('input')!
    expect(input.getAttribute('placeholder')).toBe(UNTRANSLATED)

    applyTranslations(host)

    expect(input.getAttribute('placeholder')).toBe('Enter task description')
  })

  it('records the active language on the <html> element', () => {
    document.documentElement.lang = 'zz'

    applyTranslations()
    expect(document.documentElement.lang).toBe('en')

    setLanguage('fr')
    applyTranslations()
    expect(document.documentElement.lang).toBe('fr')
  })

  it('records the active language even when scoped to a subtree', () => {
    document.documentElement.lang = 'zz'
    const host = document.createElement('div')
    document.body.appendChild(host)

    applyTranslations(host)

    expect(document.documentElement.lang).toBe('en')
  })

  // The browser-tab title lives outside <body>, so no fixture element can carry a key for it.
  it('rewrites the browser-tab title', () => {
    expect(document.title).toBe(UNTRANSLATED)

    applyTranslations()
    expect(document.title).toBe('Task Manager')

    setLanguage('fr')
    applyTranslations()
    expect(document.title).toBe('Gestionnaire de tâches')
  })

  it('rewrites the browser-tab title even when scoped to a subtree', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    applyTranslations(host)

    expect(document.title).toBe('Task Manager')
  })

  it('leaves elements outside the given subtree alone', () => {
    document.body.innerHTML = `<div id="inside"><h1 data-i18n="app.title">${UNTRANSLATED}</h1></div><div id="outside"><h2 data-i18n="task.add">${UNTRANSLATED}</h2></div>`

    applyTranslations(document.querySelector('#inside')!)

    expect(document.querySelector('#inside h1')!.textContent).toBe('My Task Manager')
    expect(document.querySelector('#outside h2')!.textContent).toBe(UNTRANSLATED)
  })
})
