/**
 * SCÉNARIOS — démarrage et câblage de l'application (src/main.ts)
 *
 *  1. Au démarrage, l'application applique les traductions : le titre du document
 *     posé en sentinelle avant l'import a été remplacé
 *  2. Au démarrage, chaque élément porteur de data-i18n a perdu sa sentinelle
 *  3. Au démarrage, l'attribut lang du document vaut la langue courante
 *  4. Soumettre le formulaire ajoute la tâche saisie et vide le champ
 *  5. Soumettre un champ ne contenant que des espaces n'ajoute rien
 *  6. Soumettre respecte la priorité choisie dans la liste déroulante
 *  7. Les tâches ajoutées survivent à un rechargement (relecture du stockage)
 *  8. Cliquer un bouton de filtre déplace la classe active
 *  9. Cliquer « Actives » n'affiche que les tâches non terminées
 * 10. Cliquer « Terminées » n'affiche que les tâches terminées
 * 11. Cliquer le bouton français déplace la classe active vers #lang-fr
 * 12. Cliquer le bouton français traduit le balisage statique
 * 13. Cliquer le bouton français retraduit AUSSI le contenu construit par le code
 *     (badge de priorité, bouton Supprimer) — c'est la preuve que le rendu a été rejoué
 * 14. Cliquer le bouton français met à jour document.title et l'attribut lang
 * 15. Revenir à l'anglais rebascule l'affichage
 * 16. Une initialisation qui échoue affiche l'erreur dans l'interface, pas seulement
 *     dans la console
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  mountFixture,
  flush,
  appError,
  isErrorVisible,
  renderedRows,
  renderedTexts
} from './fixture'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const en = enCatalogue as Record<string, string>
const fr = frCatalogue as Record<string, string>

const SENTINELLE = 'SENTINELLE-NON-TRADUITE'

/**
 * Monte la page, pose des sentinelles là où les traductions doivent passer,
 * puis importe main.ts (qui lance init() à l'import).
 */
async function bootApp(): Promise<void> {
  mountFixture()
  document.title = SENTINELLE
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    el.textContent = SENTINELLE
  })
  vi.resetModules()
  await import('../main')
  await flush()
}

function submitTask(text: string, priority = 'low'): void {
  const input = document.getElementById('task-input') as HTMLInputElement
  const select = document.getElementById('priority-select') as HTMLSelectElement
  input.value = text
  select.value = priority
  const form = document.getElementById('task-form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function filterButton(name: string): HTMLElement {
  return document.querySelector<HTMLElement>(`.filter-btn[data-filter="${name}"]`)!
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  vi.doUnmock('../i18n')
  vi.restoreAllMocks()
  vi.resetModules()
  localStorage.clear()
})

describe('main — demarrage', () => {
  it('applique les traductions au demarrage : le titre sentinelle a disparu', async () => {
    await bootApp()
    expect(document.title).not.toBe(SENTINELLE)
    expect(document.title).toBe(en['page.title'])
  })

  it('applique les traductions a tous les elements data-i18n', async () => {
    await bootApp()
    const cibles = Array.from(document.querySelectorAll<HTMLElement>('[data-i18n]'))
    expect(cibles.length).toBeGreaterThan(5)
    expect(cibles.filter(el => el.textContent === SENTINELLE)).toEqual([])
  })

  it('pose l attribut lang du document', async () => {
    await bootApp()
    expect(document.documentElement.lang).toBe('en')
  })
})

describe('main — formulaire', () => {
  it('ajoute la tache saisie et vide le champ', async () => {
    await bootApp()
    submitTask('Acheter du pain')

    expect(renderedTexts()).toEqual(['Acheter du pain'])
    expect((document.getElementById('task-input') as HTMLInputElement).value).toBe('')
  })

  it('ignore une saisie faite uniquement d espaces', async () => {
    await bootApp()
    submitTask('     ')

    expect(renderedRows()).toHaveLength(0)
    expect(document.getElementById('total-count')!.textContent).toBe('0')
  })

  it('respecte la priorite choisie', async () => {
    await bootApp()
    submitTask('Urgent', 'high')

    const badge = document.querySelector<HTMLElement>('#tasks .priority-badge')!
    expect(badge.classList.contains('priority-high')).toBe(true)
    expect(badge.textContent).toBe(en['badge.high'])
  })

  it('les taches ajoutees survivent a un rechargement', async () => {
    await bootApp()
    submitTask('Persistee')

    await bootApp()
    expect(renderedTexts()).toEqual(['Persistee'])
  })
})

describe('main — filtres', () => {
  async function bootAvecTaches(): Promise<void> {
    await bootApp()
    submitTask('Active 1')
    submitTask('Terminee')
    submitTask('Active 2')
    renderedRows()[1].querySelector<HTMLInputElement>('.task-checkbox')!.click()
  }

  it('deplace la classe active vers le bouton clique', async () => {
    await bootAvecTaches()
    filterButton('active').click()

    expect(filterButton('active').classList.contains('active')).toBe(true)
    expect(filterButton('all').classList.contains('active')).toBe(false)
    expect(filterButton('completed').classList.contains('active')).toBe(false)
  })

  it('le bouton Actives n affiche que les taches non terminees', async () => {
    await bootAvecTaches()
    filterButton('active').click()
    expect(renderedTexts()).toEqual(['Active 1', 'Active 2'])
  })

  it('le bouton Terminees n affiche que les taches terminees', async () => {
    await bootAvecTaches()
    filterButton('completed').click()
    expect(renderedTexts()).toEqual(['Terminee'])
  })

  it('le bouton Toutes reaffiche tout', async () => {
    await bootAvecTaches()
    filterButton('completed').click()
    filterButton('all').click()
    expect(renderedRows()).toHaveLength(3)
  })
})

describe('main — bascule de langue', () => {
  it('deplace la classe active vers le bouton francais', async () => {
    await bootApp()
    document.getElementById('lang-fr')!.click()

    expect(document.getElementById('lang-fr')!.classList.contains('active')).toBe(true)
    expect(document.getElementById('lang-en')!.classList.contains('active')).toBe(false)
  })

  it('traduit le balisage statique en francais', async () => {
    await bootApp()
    document.getElementById('lang-fr')!.click()

    const titre = document.querySelector<HTMLElement>('[data-i18n="app.title"]')!
    expect(titre.textContent).toBe(fr['app.title'])
    const champ = document.getElementById('task-input') as HTMLInputElement
    expect(champ.getAttribute('placeholder')).toBe(fr['task.placeholder'])
  })

  it('retraduit AUSSI le contenu construit par le code', async () => {
    await bootApp()
    submitTask('Ma tache', 'high')
    expect(document.querySelector('#tasks .priority-badge')!.textContent).toBe(en['badge.high'])

    document.getElementById('lang-fr')!.click()

    expect(document.querySelector('#tasks .priority-badge')!.textContent).toBe(fr['badge.high'])
    expect(document.querySelector('#tasks .delete-btn')!.textContent).toBe(fr['button.delete'])
  })

  it('met a jour le titre du document et l attribut lang', async () => {
    await bootApp()
    document.getElementById('lang-fr')!.click()

    expect(document.title).toBe(fr['page.title'])
    expect(document.documentElement.lang).toBe('fr')
  })

  it('revenir a l anglais rebascule l affichage', async () => {
    await bootApp()
    submitTask('Ma tache', 'low')
    document.getElementById('lang-fr')!.click()
    expect(document.querySelector('#tasks .priority-badge')!.textContent).toBe(fr['badge.low'])

    document.getElementById('lang-en')!.click()

    expect(document.querySelector('#tasks .priority-badge')!.textContent).toBe(en['badge.low'])
    expect(document.querySelector<HTMLElement>('[data-i18n="app.title"]')!.textContent).toBe(
      en['app.title']
    )
    expect(document.documentElement.lang).toBe('en')
    expect(document.getElementById('lang-en')!.classList.contains('active')).toBe(true)
  })
})

describe('main — echec d initialisation', () => {
  it('affiche l erreur dans l interface quand init echoue', async () => {
    mountFixture()
    vi.resetModules()
    vi.doMock('../i18n', async () => {
      const actual = await vi.importActual<typeof import('../i18n')>('../i18n')
      return {
        ...actual,
        loadTranslations: vi.fn(() => Promise.reject(new Error('reseau indisponible')))
      }
    })

    await import('../main')
    await flush()

    expect(isErrorVisible()).toBe(true)
    expect(appError()!.textContent).toBe(en['error.init'])
  })
})
