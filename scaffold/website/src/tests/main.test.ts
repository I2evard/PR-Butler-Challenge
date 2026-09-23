/*
 * SCENARIOS - demarrage et pilotage de la page
 *  1. Au demarrage, la page est traduite : aucun libelle non traduit ne subsiste
 *  2. Au demarrage, le texte de remplacement du champ de saisie est traduit lui aussi
 *  3. Le balisage porte une cle de traduction sur chacun des libelles prevus
 *  4. Choisir le francais traduit toute la page d'un coup
 *  5. Choisir le francais preserve le compteur de taches et l'annee du pied de page
 *  6. Choisir le francais repeint la liste : le bouton de suppression passe en francais
 *  7. Revenir a l'anglais restitue les libelles anglais
 *  8. Le bouton de langue choisi est le seul marque comme actif
 *  9. Soumettre le formulaire ajoute la tache saisie et vide le champ
 * 10. La priorite choisie est celle appliquee a la tache creee
 * 11. Soumettre un champ vide ou ne contenant que des espaces n'ajoute rien
 * 12. Cliquer un filtre restreint la liste affichee et marque le bouton choisi
 * 13. Un bouton de filtre sans filtre associe ne modifie pas l'affichage
 * 14. Demarrer sur une page depourvue des elements attendus ne plante pas
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import en from '../translations/en.json'
import fr from '../translations/fr.json'

const PAGE = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')
const APP_MARKUP = PAGE.slice(PAGE.indexOf('<body>') + 6, PAGE.indexOf('</body>'))

const SENTINELLE = APP_MARKUP.replace('>My Task Manager<', '>__UNTRANSLATED__<').replace(
  'placeholder="Enter task description"',
  'placeholder="__UNTRANSLATED__"'
)

const CLES_DE_TEXTE = [
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

async function boot(markup: string) {
  document.body.innerHTML = markup
  vi.resetModules()
  await import('../main')
  await new Promise(r => setTimeout(r, 0))
}

function champSaisie(): HTMLInputElement {
  return document.getElementById('task-input') as HTMLInputElement
}

function soumettre(texte: string, priorite = 'low') {
  const champ = champSaisie()
  const choix = document.getElementById('priority-select') as HTMLSelectElement
  champ.value = texte
  choix.value = priorite
  const formulaire = document.getElementById('task-form') as HTMLFormElement
  formulaire.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function cliquer(selecteur: string) {
  const cible = document.querySelector(selecteur) as HTMLElement
  cible.click()
}

function texteDe(selecteur: string): string {
  return document.querySelector(selecteur)?.textContent ?? ''
}

function lignes(): Element[] {
  return Array.from(document.querySelectorAll('#tasks li'))
}

describe('balisage de la page', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = APP_MARKUP
  })

  it('scenario 3 - chaque libelle prevu porte sa cle de traduction', () => {
    const cles = Array.from(document.querySelectorAll('[data-i18n]')).map(n =>
      n.getAttribute('data-i18n')
    )

    expect(cles.slice().sort()).toEqual(CLES_DE_TEXTE.slice().sort())
  })

  it('scenario 3 - le champ de saisie porte la cle de son texte de remplacement', () => {
    const marques = Array.from(document.querySelectorAll('[data-i18n-placeholder]'))

    expect(marques).toHaveLength(1)
    expect(marques[0].id).toBe('task-input')
    expect(marques[0].getAttribute('data-i18n-placeholder')).toBe('task.placeholder')
  })

  it('scenario 3 - toute cle posee sur la page existe dans les deux langues', () => {
    const anglais = en as Record<string, string>
    const francais = fr as Record<string, string>
    const posees = Array.from(
      document.querySelectorAll('[data-i18n], [data-i18n-placeholder]')
    ).map(n => n.getAttribute('data-i18n') ?? n.getAttribute('data-i18n-placeholder') ?? '')

    expect(posees.length).toBeGreaterThan(0)
    posees.forEach(cle => {
      expect(anglais[cle], `cle anglaise ${cle}`).toBeTruthy()
      expect(francais[cle], `cle francaise ${cle}`).toBeTruthy()
    })
  })
})

describe('demarrage de l application', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    vi.resetModules()
  })

  it('boot translation - scenario 1 - le titre est traduit au demarrage', async () => {
    expect(SENTINELLE).toContain('__UNTRANSLATED__')

    await boot(SENTINELLE)

    expect(texteDe('h1')).toBe('My Task Manager')
    expect(document.body.textContent).not.toContain('__UNTRANSLATED__')
  })

  it('boot translation - scenario 2 - le texte de remplacement est traduit au demarrage', async () => {
    expect(SENTINELLE).toContain('placeholder="__UNTRANSLATED__"')

    await boot(SENTINELLE)

    expect(champSaisie().placeholder).toBe('Enter task description')
  })

  it('scenario 4 - choisir le francais traduit toute la page', async () => {
    await boot(APP_MARKUP)

    cliquer('#lang-fr')

    expect(texteDe('h1')).toBe('Mon Gestionnaire de Tâches')
    expect(texteDe('[data-i18n="task.add"]')).toBe('Ajouter une Nouvelle Tâche')
    expect(texteDe('#priority-select option[value="low"]')).toBe('Priorité faible')
    expect(texteDe('#priority-select option[value="medium"]')).toBe('Priorité moyenne')
    expect(texteDe('#priority-select option[value="high"]')).toBe('Priorité élevée')
    expect(texteDe('#task-form button[type="submit"]')).toBe('Ajouter la tâche')
    expect(texteDe('[data-filter="all"]')).toBe('Toutes les tâches')
    expect(texteDe('[data-filter="active"]')).toBe('Actives')
    expect(texteDe('[data-filter="completed"]')).toBe('Terminées')
    expect(texteDe('[data-i18n="stats.total"]')).toBe('Total des tâches')
    expect(texteDe('[data-i18n="stats.completed"]')).toBe('Terminées')
    expect(texteDe('[data-i18n="footer.text"]')).toBe('Conçu avec TypeScript')
    expect(champSaisie().placeholder).toBe('Saisir la description de la tâche')
  })

  it('scenario 5 - la traduction preserve les compteurs et l annee du pied de page', async () => {
    await boot(APP_MARKUP)
    soumettre('Une tache')

    cliquer('#lang-fr')

    expect(document.getElementById('total-count')?.textContent).toBe('1')
    expect(document.getElementById('completed-count')?.textContent).toBe('0')
    expect(document.querySelector('footer')?.textContent).toContain('2026')
    expect(document.querySelector('footer')?.textContent).toContain('Conçu avec TypeScript')
  })

  it('scenario 6 - choisir le francais repeint la liste des taches', async () => {
    await boot(APP_MARKUP)
    soumettre('Une tache')
    expect(texteDe('#tasks .delete-btn')).toBe('Delete')

    cliquer('#lang-fr')

    expect(lignes()).toHaveLength(1)
    expect(texteDe('#tasks .task-text')).toBe('Une tache')
    expect(texteDe('#tasks .delete-btn')).toBe('Supprimer')
  })

  it('scenario 7 - revenir a l anglais restitue les libelles anglais', async () => {
    await boot(APP_MARKUP)
    soumettre('Une tache')
    cliquer('#lang-fr')

    cliquer('#lang-en')

    expect(texteDe('h1')).toBe('My Task Manager')
    expect(texteDe('[data-filter="all"]')).toBe('All Tasks')
    expect(texteDe('[data-i18n="footer.text"]')).toBe('Built with TypeScript')
    expect(champSaisie().placeholder).toBe('Enter task description')
    expect(texteDe('#tasks .delete-btn')).toBe('Delete')
  })

  it('scenario 8 - seul le bouton de la langue choisie est marque actif', async () => {
    await boot(APP_MARKUP)

    cliquer('#lang-fr')
    expect(document.getElementById('lang-fr')?.classList.contains('active')).toBe(true)
    expect(document.getElementById('lang-en')?.classList.contains('active')).toBe(false)

    cliquer('#lang-en')
    expect(document.getElementById('lang-en')?.classList.contains('active')).toBe(true)
    expect(document.getElementById('lang-fr')?.classList.contains('active')).toBe(false)
  })
})

describe('pilotage de la page', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    vi.resetModules()
  })

  it('scenario 9 - soumettre le formulaire ajoute la tache et vide le champ', async () => {
    await boot(APP_MARKUP)

    soumettre('Acheter du pain')

    expect(lignes()).toHaveLength(1)
    expect(texteDe('#tasks .task-text')).toBe('Acheter du pain')
    expect(champSaisie().value).toBe('')
    expect(document.getElementById('total-count')?.textContent).toBe('1')
  })

  it('scenario 10 - la priorite choisie est appliquee a la tache creee', async () => {
    await boot(APP_MARKUP)

    soumettre('Tache urgente', 'high')

    expect(document.querySelectorAll('#tasks .priority-badge.priority-high')).toHaveLength(1)
  })

  it('scenario 11 - soumettre un champ vide n ajoute rien', async () => {
    await boot(APP_MARKUP)

    soumettre('')
    soumettre('   ')

    expect(lignes()).toHaveLength(0)
    expect(document.getElementById('total-count')?.textContent).toBe('0')
  })

  it('scenario 12 - cliquer un filtre restreint la liste et marque le bouton choisi', async () => {
    await boot(APP_MARKUP)
    soumettre('Active')
    soumettre('Terminee')
    const cases = document.querySelectorAll('#tasks .task-checkbox')
    const seconde = cases[1] as HTMLInputElement
    seconde.checked = true
    seconde.dispatchEvent(new Event('change'))

    cliquer('[data-filter="active"]')
    expect(lignes()).toHaveLength(1)
    expect(texteDe('#tasks .task-text')).toBe('Active')
    expect(document.querySelector('[data-filter="active"]')?.classList.contains('active')).toBe(
      true
    )
    expect(document.querySelector('[data-filter="all"]')?.classList.contains('active')).toBe(false)

    cliquer('[data-filter="completed"]')
    expect(lignes()).toHaveLength(1)
    expect(texteDe('#tasks .task-text')).toBe('Terminee')

    cliquer('[data-filter="all"]')
    expect(lignes()).toHaveLength(2)
  })

  it('scenario 13 - un bouton de filtre sans filtre associe ne change rien', async () => {
    const balisage = APP_MARKUP.replace(
      '<ul id="tasks">',
      '<button class="filter-btn" id="filtre-sans-cle">Sans cle</button><ul id="tasks">'
    )
    expect(balisage).toContain('id="filtre-sans-cle"')
    await boot(balisage)
    soumettre('Active')
    soumettre('Terminee')

    cliquer('#filtre-sans-cle')

    expect(lignes()).toHaveLength(2)
    expect(document.querySelector('[data-filter="all"]')?.classList.contains('active')).toBe(true)
  })

  it('scenario 14 - demarrer sur une page sans les elements attendus ne plante pas', async () => {
    await expect(boot('')).resolves.toBeUndefined()

    expect(document.body.innerHTML).toBe('')
  })
})
