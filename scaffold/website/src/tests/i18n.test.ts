/*
 * SCENARIOS - module de traduction (i18n)
 *  1. Sans rien changer, l'application parle anglais
 *  2. Apres avoir choisi le francais, les memes cles rendent les libelles francais
 *  3. La langue courante est consultable et reflete le dernier choix
 *  4. Une cle inconnue rend la cle elle-meme, jamais une chaine vide
 *  5. Une langue inconnue retombe sur la cle plutot que de planter
 *  6. Le chargement des traductions se termine sans erreur
 *  7. Traduire une portion de page reecrit le texte des elements marques
 *  8. Traduire une portion de page reecrit le texte de remplacement des champs de saisie
 *  9. Traduire sans preciser de portion traite la page entiere
 * 10. Un element marque d'une cle inconnue affiche la cle, ce qui rend l'oubli visible
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadTranslations, setLanguage, t, getCurrentLanguage, applyTranslations } from '../i18n'

const PAGE = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')
const APP_MARKUP = PAGE.slice(PAGE.indexOf('<body>') + 6, PAGE.indexOf('</body>'))

function racineApplicative(): HTMLElement {
  const racine = document.createElement('div')
  racine.innerHTML = APP_MARKUP
  return racine
}

describe('i18n', () => {
  beforeEach(() => {
    localStorage.clear()
    setLanguage('en')
    document.body.innerHTML = ''
  })

  it('scenario 1 - rend les libelles anglais par defaut', () => {
    expect(t('app.title')).toBe('My Task Manager')
    expect(t('button.delete')).toBe('Delete')
    expect(t('footer.text')).toBe('Built with TypeScript')
  })

  it('scenario 2 - rend les libelles francais apres passage au francais', () => {
    setLanguage('fr')
    expect(t('app.title')).toBe('Mon Gestionnaire de Tâches')
    expect(t('task.placeholder')).toBe('Saisir la description de la tâche')
    expect(t('priority.high')).toBe('Priorité élevée')
    expect(t('button.delete')).toBe('Supprimer')
    expect(t('stats.total')).toBe('Total des tâches')
    expect(t('footer.text')).toBe('Conçu avec TypeScript')
  })

  it('scenario 3 - expose la langue courante', () => {
    expect(getCurrentLanguage()).toBe('en')
    setLanguage('fr')
    expect(getCurrentLanguage()).toBe('fr')
  })

  it('scenario 4 - rend la cle elle-meme quand la cle est inconnue', () => {
    expect(t('cle.inexistante')).toBe('cle.inexistante')
    setLanguage('fr')
    expect(t('cle.inexistante')).toBe('cle.inexistante')
  })

  it('scenario 5 - rend la cle elle-meme quand la langue est inconnue', () => {
    setLanguage('de')
    expect(t('app.title')).toBe('app.title')
  })

  it('scenario 6 - le chargement des traductions se termine', async () => {
    await expect(loadTranslations()).resolves.toBeUndefined()
  })

  it('scenario 7 - reecrit le texte des elements marques dans la portion fournie', () => {
    const racine = racineApplicative()
    setLanguage('fr')

    applyTranslations(racine)

    expect(racine.querySelector('h1')?.textContent).toBe('Mon Gestionnaire de Tâches')
    expect(racine.querySelector('[data-i18n="stats.total"]')?.textContent).toBe('Total des tâches')
    expect(racine.querySelector('[data-i18n="footer.text"]')?.textContent).toBe(
      'Conçu avec TypeScript'
    )
    expect(document.body.innerHTML).toBe('')
  })

  it('scenario 8 - reecrit le texte de remplacement des champs marques', () => {
    const racine = racineApplicative()
    setLanguage('fr')

    applyTranslations(racine)

    const champ = racine.querySelector('#task-input') as HTMLInputElement
    expect(champ.placeholder).toBe('Saisir la description de la tâche')
  })

  it('scenario 9 - traite la page entiere quand aucune portion n est fournie', () => {
    document.body.innerHTML = APP_MARKUP
    setLanguage('fr')

    applyTranslations()

    expect(document.querySelector('h1')?.textContent).toBe('Mon Gestionnaire de Tâches')
    const champ = document.getElementById('task-input') as HTMLInputElement
    expect(champ.placeholder).toBe('Saisir la description de la tâche')
  })

  it('scenario 10 - affiche la cle quand un element porte une cle inconnue', () => {
    const racine = document.createElement('div')
    const libelle = document.createElement('span')
    libelle.setAttribute('data-i18n', 'cle.jamais.traduite')
    libelle.textContent = 'texte d origine'
    const champ = document.createElement('input')
    champ.setAttribute('data-i18n-placeholder', 'autre.cle.absente')
    racine.appendChild(libelle)
    racine.appendChild(champ)

    applyTranslations(racine)

    expect(libelle.textContent).toBe('cle.jamais.traduite')
    expect(champ.placeholder).toBe('autre.cle.absente')
  })
})
