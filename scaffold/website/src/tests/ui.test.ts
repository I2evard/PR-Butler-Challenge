/**
 * SCÉNARIOS — bannière d'erreur (src/ui.ts)
 *
 *  1. index.html contient bien l'élément #app-error, masqué par défaut
 *  2. showError révèle la bannière (l'attribut hidden disparaît)
 *  3. showError écrit le texte traduit de la clé
 *  4. showError pose data-i18n sur la bannière, pour qu'un changement de langue la suive
 *  5. showError en français écrit la phrase française
 *  6. clearError remasque la bannière
 *  7. clearError vide le texte et retire data-i18n
 *  8. showError ne lève pas quand #app-error est absent du document
 *  9. clearError ne lève pas quand #app-error est absent du document
 * 10. Deux showError successifs remplacent le message au lieu de l'empiler
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { showError, clearError } from '../ui'
import { setLanguage } from '../i18n'
import { mountFixture, appError, isErrorVisible, INDEX_HTML } from './fixture'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const en = enCatalogue as Record<string, string>
const fr = frCatalogue as Record<string, string>

describe('ui — banniere d erreur', () => {
  beforeEach(() => {
    setLanguage('en')
    mountFixture()
  })

  it('index.html declare #app-error, masque par defaut', () => {
    expect(INDEX_HTML).toMatch(/id="app-error"/)
    const el = appError()
    expect(el).not.toBeNull()
    expect(el!.hasAttribute('hidden')).toBe(true)
    expect(el!.getAttribute('role')).toBe('alert')
  })

  it('showError revele la banniere', () => {
    showError('error.load')
    expect(isErrorVisible()).toBe(true)
  })

  it('showError ecrit le texte traduit de la cle', () => {
    showError('error.load')
    expect(appError()!.textContent).toBe(en['error.load'])
  })

  it('showError pose data-i18n sur la banniere', () => {
    showError('error.save')
    expect(appError()!.getAttribute('data-i18n')).toBe('error.save')
  })

  it('showError en francais ecrit la phrase francaise', () => {
    setLanguage('fr')
    showError('error.init')
    expect(appError()!.textContent).toBe(fr['error.init'])
    expect(appError()!.textContent).not.toBe(en['error.init'])
  })

  it('clearError remasque la banniere', () => {
    showError('error.load')
    clearError()
    expect(appError()!.hasAttribute('hidden')).toBe(true)
    expect(isErrorVisible()).toBe(false)
  })

  it('clearError vide le texte et retire data-i18n', () => {
    showError('error.load')
    clearError()
    expect(appError()!.textContent).toBe('')
    expect(appError()!.hasAttribute('data-i18n')).toBe(false)
  })

  it('showError ne leve pas quand #app-error est absent', () => {
    appError()?.remove()
    expect(() => showError('error.load')).not.toThrow()
  })

  it('clearError ne leve pas quand #app-error est absent', () => {
    appError()?.remove()
    expect(() => clearError()).not.toThrow()
  })

  it('deux showError successifs remplacent le message', () => {
    showError('error.load')
    showError('error.save')
    expect(appError()!.textContent).toBe(en['error.save'])
    expect(appError()!.getAttribute('data-i18n')).toBe('error.save')
  })
})
