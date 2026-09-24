/**
 * SCÉNARIOS — module i18n
 *
 *  1. La langue de départ est l'anglais
 *  2. setLanguage change la langue courante, getCurrentLanguage la rapporte
 *  3. loadTranslations se résout sans erreur
 *  4. t() rend la valeur anglaise quand la langue est l'anglais
 *  5. t() rend la valeur française après un passage au français
 *  6. t() rend la clé elle-même quand la clé est inconnue
 *  7. t() rend la clé elle-même quand la langue est inconnue
 *  8. applyTranslations remplit le texte de chaque élément porteur de data-i18n
 *  9. applyTranslations remplit le placeholder de chaque élément porteur de data-i18n-placeholder
 * 10. applyTranslations aligne document.documentElement.lang sur la langue courante
 * 11. applyTranslations aligne document.title sur t('page.title')
 * 12. applyTranslations limitée à une racine ne touche pas ce qui est hors de cette racine
 * 13. applyTranslations sur une clé inconnue écrit la clé, sans planter
 * 14. Rappeler applyTranslations après un changement de langue retraduit la page
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { loadTranslations, setLanguage, getCurrentLanguage, t, applyTranslations } from '../i18n'
import { mountFixture } from './fixture'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const en = enCatalogue as Record<string, string>
const fr = frCatalogue as Record<string, string>

describe('i18n', () => {
  beforeEach(() => {
    setLanguage('en')
    document.body.innerHTML = ''
  })

  it('demarre en anglais', () => {
    expect(getCurrentLanguage()).toBe('en')
  })

  it('setLanguage change la langue courante', () => {
    setLanguage('fr')
    expect(getCurrentLanguage()).toBe('fr')
  })

  it('loadTranslations se resout', async () => {
    await expect(loadTranslations()).resolves.toBeUndefined()
  })

  it('t rend la valeur anglaise en anglais', () => {
    expect(t('button.add')).toBe(en['button.add'])
  })

  it('t rend la valeur francaise en francais', () => {
    setLanguage('fr')
    expect(t('button.add')).toBe(fr['button.add'])
    expect(t('button.delete')).toBe(fr['button.delete'])
  })

  it('t rend la cle elle-meme quand la cle est inconnue', () => {
    expect(t('cle.totalement.inconnue')).toBe('cle.totalement.inconnue')
  })

  it('t rend la cle elle-meme quand la langue est inconnue', () => {
    setLanguage('kl')
    expect(t('button.add')).toBe('button.add')
  })

  it('applyTranslations traduit le texte des elements data-i18n', () => {
    mountFixture()
    setLanguage('fr')
    applyTranslations()

    const titres = document.querySelectorAll<HTMLElement>('[data-i18n]')
    expect(titres.length).toBeGreaterThan(5)
    titres.forEach(el => {
      const key = el.getAttribute('data-i18n') as string
      expect(el.textContent).toBe(fr[key] ?? key)
    })
  })

  it('applyTranslations traduit les placeholders data-i18n-placeholder', () => {
    mountFixture()
    setLanguage('fr')
    applyTranslations()

    const champs = document.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]')
    expect(champs.length).toBeGreaterThan(0)
    champs.forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder') as string
      expect(el.getAttribute('placeholder')).toBe(fr[key] ?? key)
    })
  })

  it('applyTranslations aligne l attribut lang du document', () => {
    mountFixture()
    setLanguage('fr')
    applyTranslations()
    expect(document.documentElement.lang).toBe('fr')

    setLanguage('en')
    applyTranslations()
    expect(document.documentElement.lang).toBe('en')
  })

  it('applyTranslations aligne le titre du document', () => {
    mountFixture()
    document.title = 'SENTINELLE'
    setLanguage('fr')
    applyTranslations()
    expect(document.title).toBe(fr['page.title'])
  })

  it('applyTranslations limitee a une racine ne touche pas le reste', () => {
    const dedans = document.createElement('div')
    dedans.innerHTML = '<span data-i18n="button.delete">Delete</span>'
    const dehors = document.createElement('div')
    dehors.innerHTML = '<span data-i18n="button.delete">INTACT</span>'
    document.body.appendChild(dedans)
    document.body.appendChild(dehors)

    setLanguage('fr')
    applyTranslations(dedans)

    expect(dedans.querySelector('span')!.textContent).toBe(fr['button.delete'])
    expect(dehors.querySelector('span')!.textContent).toBe('INTACT')
  })

  it('applyTranslations ecrit la cle quand elle est inconnue, sans planter', () => {
    const racine = document.createElement('div')
    racine.innerHTML =
      '<span data-i18n="cle.absente">x</span><input data-i18n-placeholder="autre.cle.absente">'
    document.body.appendChild(racine)

    expect(() => applyTranslations(racine)).not.toThrow()
    expect(racine.querySelector('span')!.textContent).toBe('cle.absente')
    expect(racine.querySelector('input')!.getAttribute('placeholder')).toBe('autre.cle.absente')
  })

  it('retraduit la page quand on rappelle applyTranslations apres un changement de langue', () => {
    mountFixture()
    setLanguage('fr')
    applyTranslations()
    const titreFr = document.querySelector<HTMLElement>('[data-i18n="app.title"]')!.textContent

    setLanguage('en')
    applyTranslations()
    const titreEn = document.querySelector<HTMLElement>('[data-i18n="app.title"]')!.textContent

    expect(titreFr).toBe(fr['app.title'])
    expect(titreEn).toBe(en['app.title'])
    expect(titreFr).not.toBe(titreEn)
  })
})
