/**
 * SCENARIOS — i18n
 *
 *  1. The interface starts in English
 *  2. A known key gives the English wording
 *  3. An unknown key gives the key itself back, so a missing translation is visible
 *  4. Switching to French changes what the same key returns
 *  5. The current language reflects the last switch
 *  6. Switching to a language nobody translated leaves every key showing as itself
 *  7. Switching back to English restores the English wording
 *  8. Preparing the translations settles without error
 *  9. Applying translations rewrites the text of every tagged element
 * 10. Applying translations rewrites the placeholder of every tagged input
 * 11. Applying translations leaves untagged elements alone
 * 12. Applying translations after a language switch puts the French wording on screen
 * 13. Applying translations to a subtree leaves the rest of the page untouched
 * 14. An element tagged with an unknown key shows the key, not an empty string
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  t,
  setLanguage,
  getCurrentLanguage,
  loadTranslations,
  applyTranslations
} from '../i18n'

describe('i18n', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    setLanguage('en')
  })

  afterEach(() => {
    // The active language is module state: leaving it set would leak into other tests.
    setLanguage('en')
  })

  describe('loadTranslations', () => {
    it('settles without error', async () => {
      await expect(loadTranslations()).resolves.toBeUndefined()
    })

    it('leaves the catalogues usable once it has settled', async () => {
      await loadTranslations()
      expect(t('button.add')).toBe('Add Task')
    })
  })

  describe('t', () => {
    it('returns the English wording by default', () => {
      expect(t('app.title')).toBe('My Task Manager')
      expect(t('button.delete')).toBe('Delete')
    })

    it('returns the French wording once French is selected', () => {
      setLanguage('fr')

      expect(t('app.title')).toBe('Mon Gestionnaire de Tâches')
      expect(t('button.delete')).toBe('Supprimer')
    })

    it('returns the key itself when no translation exists for it', () => {
      expect(t('nothing.like.this')).toBe('nothing.like.this')
    })

    it('returns the key itself for every key when the language is unknown', () => {
      setLanguage('kl')

      expect(t('app.title')).toBe('app.title')
      expect(t('button.delete')).toBe('button.delete')
    })
  })

  describe('setLanguage and getCurrentLanguage', () => {
    it('starts in English', () => {
      expect(getCurrentLanguage()).toBe('en')
    })

    it('reports the language that was last selected', () => {
      setLanguage('fr')
      expect(getCurrentLanguage()).toBe('fr')
    })

    it('restores the English wording when switching back', () => {
      setLanguage('fr')
      setLanguage('en')

      expect(getCurrentLanguage()).toBe('en')
      expect(t('app.title')).toBe('My Task Manager')
    })

    it('does not touch the page on its own', () => {
      document.body.innerHTML = '<h1 data-i18n="app.title">My Task Manager</h1>'

      setLanguage('fr')

      expect(document.querySelector('h1')?.textContent).toBe('My Task Manager')
    })
  })

  describe('applyTranslations', () => {
    it('rewrites the text of every tagged element', () => {
      document.body.innerHTML = `
        <h1 data-i18n="app.title">placeholder</h1>
        <button data-i18n="button.add">placeholder</button>
      `

      applyTranslations()

      expect(document.querySelector('h1')?.textContent).toBe('My Task Manager')
      expect(document.querySelector('button')?.textContent).toBe('Add Task')
    })

    it('rewrites the placeholder of every tagged input', () => {
      document.body.innerHTML =
        '<input id="task-input" data-i18n-placeholder="task.placeholder" placeholder="old">'

      applyTranslations()

      expect(document.querySelector<HTMLInputElement>('#task-input')?.placeholder).toBe(
        'Enter task description'
      )
    })

    it('leaves elements without a translation tag alone', () => {
      document.body.innerHTML = `
        <h1 data-i18n="app.title">placeholder</h1>
        <p id="untouched">Hand written copy</p>
      `

      applyTranslations()

      expect(document.getElementById('untouched')?.textContent).toBe('Hand written copy')
    })

    it('puts the French wording on screen after a switch to French', () => {
      document.body.innerHTML = `
        <h1 data-i18n="app.title">My Task Manager</h1>
        <input data-i18n-placeholder="task.placeholder" placeholder="Enter task description">
      `

      setLanguage('fr')
      applyTranslations()

      expect(document.querySelector('h1')?.textContent).toBe('Mon Gestionnaire de Tâches')
      expect(document.querySelector('input')?.placeholder).toBe(
        'Saisir la description de la tâche'
      )
    })

    it('translates only the requested subtree', () => {
      document.body.innerHTML = `
        <section id="inside"><h2 data-i18n="task.add">placeholder</h2></section>
        <section id="outside"><h2 data-i18n="app.title">placeholder</h2></section>
      `
      const inside = document.getElementById('inside')

      applyTranslations(inside as ParentNode)

      expect(document.querySelector('#inside h2')?.textContent).toBe('Add New Task')
      expect(document.querySelector('#outside h2')?.textContent).toBe('placeholder')
    })

    it('shows the key itself for an element tagged with an unknown key', () => {
      document.body.innerHTML = '<span data-i18n="does.not.exist">placeholder</span>'

      applyTranslations()

      expect(document.querySelector('span')?.textContent).toBe('does.not.exist')
    })

    it('does nothing at all when the page has nothing tagged', () => {
      document.body.innerHTML = '<p>Just copy</p>'

      expect(() => applyTranslations()).not.toThrow()
      expect(document.body.textContent).toContain('Just copy')
    })
  })
})
