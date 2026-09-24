/**
 * SCÉNARIOS — TaskManager
 *
 * Base (déjà couverte avant cette tâche, conservée)
 *  1. Ajouter une tâche la met dans la liste
 *  2. Une tâche neuve n'est pas comptée comme terminée
 *
 * Rendu
 *  3. Chaque tâche ajoutée produit une ligne dans #tasks
 *  4. Le texte d'une tâche est écrit tel quel : du HTML tapé par l'utilisateur
 *     n'est jamais interprété (aucune balise créée dans le DOM)
 *  5. Le badge de priorité affiche la traduction de badge.<priorité>
 *  6. Le badge de priorité garde la priorité brute dans sa classe CSS
 *  7. Le bouton de suppression affiche la traduction de button.delete
 *  8. Le badge et le bouton suivent la langue courante
 *  9. Une tâche terminée porte la classe completed et sa case est cochée
 * 10. render() ne lève pas quand #tasks est absent de la page
 *
 * Filtres
 * 11. Le filtre « active » n'affiche que les tâches non terminées
 * 12. Le filtre « completed » n'affiche que les tâches terminées
 * 13. Le filtre « all » réaffiche tout
 * 14. Un filtre ne supprime rien : getTasks() reste complet
 *
 * Cycle de vie
 * 15. toggleTask bascule l'état terminé et le persiste
 * 16. toggleTask sur un identifiant inconnu ne fait rien et ne lève pas
 * 17. deleteTask retire la tâche et le persiste
 * 18. deleteTask sur un identifiant inconnu ne fait rien
 * 19. Cocher la case rendue bascule la tâche
 * 20. Cliquer le bouton rendu supprime la tâche
 *
 * Statistiques
 * 21. #total-count et #completed-count sont mis à jour par render()
 *
 * Stockage
 * 22. Les tâches ajoutées sont relues par un nouveau gestionnaire
 * 23. Un JSON corrompu ne lève pas, ne vide pas la page, et affiche l'erreur
 * 24. Une valeur stockée qui n'est pas un tableau est écartée de la même façon
 * 25. Les entrées à identifiant invalide sont écartées, leurs voisines valides survivent
 * 26. Les identifiants en double sont écartés, la première occurrence gagne
 * 27. Un identifiant égal à Number.MAX_SAFE_INTEGER ne produit pas de doublons ensuite
 * 28. Un localStorage en échec à l'écriture ne fait pas planter addTask et affiche l'erreur
 * 29. Le message d'erreur affiché vient des clés error.load / error.save
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskManager } from '../taskManager'
import { setLanguage } from '../i18n'
import {
  mountFixture,
  appError,
  isErrorVisible,
  renderedRows,
  renderedTexts,
  seedStorage,
  storedTask
} from './fixture'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const en = enCatalogue as Record<string, string>
const fr = frCatalogue as Record<string, string>

const XSS = '<img src=x onerror="alert(1)">'

beforeEach(() => {
  localStorage.clear()
  setLanguage('en')
  mountFixture()
})

afterEach(() => {
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('TaskManager', () => {
  let manager: TaskManager

  beforeEach(() => {
    manager = new TaskManager()
  })

  it('should add a task', () => {
    manager.addTask('Test task', 'low')
    expect(manager.getTasks()).toHaveLength(1)
  })

  it('should get completed count', () => {
    manager.addTask('Task 1', 'low')
    expect(manager.getCompletedCount()).toBe(0)
  })

  describe('rendu', () => {
    it('rend une ligne par tache ajoutee', () => {
      manager.addTask('Une', 'low')
      manager.addTask('Deux', 'high')
      expect(renderedRows()).toHaveLength(2)
      expect(renderedTexts()).toEqual(['Une', 'Deux'])
    })

    it('n interprete jamais le HTML tape par l utilisateur', () => {
      manager.addTask(XSS, 'low')

      expect(document.querySelectorAll('#tasks img').length).toBe(0)
      const texte = document.querySelector<HTMLElement>('#tasks .task-text')
      expect(texte).not.toBeNull()
      expect(texte!.textContent).toBe(XSS)
      expect(texte!.children.length).toBe(0)
    })

    it('affiche le badge de priorite traduit', () => {
      manager.addTask('Haute', 'high')
      const badge = document.querySelector<HTMLElement>('#tasks .priority-badge')!
      expect(badge.textContent).toBe(en['badge.high'])
    })

    it('garde la priorite brute dans la classe du badge', () => {
      manager.addTask('Moyenne', 'medium')
      const badge = document.querySelector<HTMLElement>('#tasks .priority-badge')!
      expect(badge.classList.contains('priority-badge')).toBe(true)
      expect(badge.classList.contains('priority-medium')).toBe(true)
    })

    it('affiche le libelle traduit du bouton de suppression', () => {
      manager.addTask('Une', 'low')
      const btn = document.querySelector<HTMLElement>('#tasks .delete-btn')!
      expect(btn.textContent).toBe(en['button.delete'])
    })

    it('badge et bouton suivent la langue courante', () => {
      manager.addTask('Basse', 'low')
      setLanguage('fr')
      manager.render()

      const badge = document.querySelector<HTMLElement>('#tasks .priority-badge')!
      const btn = document.querySelector<HTMLElement>('#tasks .delete-btn')!
      expect(badge.textContent).toBe(fr['badge.low'])
      expect(badge.textContent).not.toBe(en['badge.low'])
      expect(btn.textContent).toBe(fr['button.delete'])
    })

    it('marque les taches terminees', () => {
      manager.addTask('Une', 'low')
      manager.toggleTask(manager.getTasks()[0].id)

      const li = renderedRows()[0]
      expect(li.className).toContain('completed')
      expect(li.querySelector<HTMLInputElement>('.task-checkbox')!.checked).toBe(true)
    })

    it('ne leve pas quand #tasks est absent', () => {
      document.body.innerHTML = ''
      expect(() => manager.render()).not.toThrow()
    })
  })

  describe('filtres', () => {
    beforeEach(() => {
      manager.addTask('Active 1', 'low')
      manager.addTask('Terminee', 'medium')
      manager.addTask('Active 2', 'high')
      manager.toggleTask(manager.getTasks()[1].id)
    })

    it('le filtre active n affiche que les taches non terminees', () => {
      manager.setFilter('active')
      expect(renderedRows()).toHaveLength(2)
      expect(renderedTexts()).toEqual(['Active 1', 'Active 2'])
    })

    it('le filtre completed n affiche que les taches terminees', () => {
      manager.setFilter('completed')
      expect(renderedRows()).toHaveLength(1)
      expect(renderedTexts()).toEqual(['Terminee'])
    })

    it('le filtre all reaffiche tout', () => {
      manager.setFilter('completed')
      manager.setFilter('all')
      expect(renderedRows()).toHaveLength(3)
      expect(renderedTexts()).toEqual(['Active 1', 'Terminee', 'Active 2'])
    })

    it('un filtre ne supprime aucune tache', () => {
      manager.setFilter('completed')
      expect(manager.getTasks()).toHaveLength(3)
      expect(manager.getCompletedCount()).toBe(1)
    })
  })

  describe('cycle de vie', () => {
    it('toggleTask bascule l etat et le persiste', () => {
      manager.addTask('Une', 'low')
      const id = manager.getTasks()[0].id

      manager.toggleTask(id)
      expect(manager.getTasks()[0].completed).toBe(true)
      expect(JSON.parse(localStorage.getItem('tasks')!)[0].completed).toBe(true)

      manager.toggleTask(id)
      expect(manager.getTasks()[0].completed).toBe(false)
      expect(JSON.parse(localStorage.getItem('tasks')!)[0].completed).toBe(false)
    })

    it('toggleTask sur un id inconnu ne fait rien', () => {
      manager.addTask('Une', 'low')
      expect(() => manager.toggleTask(987654)).not.toThrow()
      expect(manager.getTasks()).toHaveLength(1)
      expect(manager.getTasks()[0].completed).toBe(false)
    })

    it('deleteTask retire la tache et le persiste', () => {
      manager.addTask('Une', 'low')
      manager.addTask('Deux', 'low')
      manager.deleteTask(manager.getTasks()[0].id)

      expect(manager.getTasks()).toHaveLength(1)
      expect(manager.getTasks()[0].text).toBe('Deux')
      expect(JSON.parse(localStorage.getItem('tasks')!)).toHaveLength(1)
      expect(renderedTexts()).toEqual(['Deux'])
    })

    it('deleteTask sur un id inconnu ne fait rien', () => {
      manager.addTask('Une', 'low')
      manager.deleteTask(987654)
      expect(manager.getTasks()).toHaveLength(1)
    })

    it('cocher la case rendue bascule la tache', () => {
      manager.addTask('Une', 'low')
      renderedRows()[0].querySelector<HTMLInputElement>('.task-checkbox')!.click()
      expect(manager.getTasks()[0].completed).toBe(true)
      expect(manager.getCompletedCount()).toBe(1)
    })

    it('cliquer le bouton rendu supprime la tache', () => {
      manager.addTask('Une', 'low')
      renderedRows()[0].querySelector<HTMLElement>('.delete-btn')!.click()
      expect(manager.getTasks()).toHaveLength(0)
      expect(renderedRows()).toHaveLength(0)
    })
  })

  describe('statistiques', () => {
    it('met a jour le total et le nombre de taches terminees', () => {
      manager.addTask('Une', 'low')
      manager.addTask('Deux', 'low')
      manager.toggleTask(manager.getTasks()[0].id)

      expect(document.getElementById('total-count')!.textContent).toBe('2')
      expect(document.getElementById('completed-count')!.textContent).toBe('1')
    })
  })
})

describe('TaskManager — stockage', () => {
  it('relit les taches ecrites par un gestionnaire precedent', () => {
    const premier = new TaskManager()
    premier.addTask('Persistee', 'high')

    const second = new TaskManager()
    expect(second.getTasks()).toHaveLength(1)
    expect(second.getTasks()[0].text).toBe('Persistee')
    expect(second.getTasks()[0].priority).toBe('high')
  })

  it('un JSON corrompu ne leve pas et laisse une liste vide', () => {
    seedStorage('{not json')
    let manager!: TaskManager
    expect(() => {
      manager = new TaskManager()
    }).not.toThrow()
    expect(manager.getTasks()).toEqual([])
  })

  it('un JSON corrompu affiche l erreur dans l interface', () => {
    seedStorage('{not json')
    // Le constructeur seul doit suffire : l'erreur se voit sans rendu supplementaire.
    new TaskManager()

    expect(isErrorVisible()).toBe(true)
    expect(appError()!.textContent).toBe(en['error.load'])
  })

  it('une valeur stockee qui n est pas un tableau est ecartee', () => {
    seedStorage('{"a":1}')
    let manager!: TaskManager
    expect(() => {
      manager = new TaskManager()
    }).not.toThrow()
    expect(manager.getTasks()).toEqual([])
    expect(isErrorVisible()).toBe(true)
  })

  it('une page corrompue reste utilisable : on peut ajouter une tache ensuite', () => {
    seedStorage('{not json')
    const manager = new TaskManager()
    manager.addTask('Apres corruption', 'low')

    expect(manager.getTasks()).toHaveLength(1)
    expect(renderedTexts()).toEqual(['Apres corruption'])
  })

  it.each([
    ['identifiant texte', 'abc'],
    ['identifiant NaN', Number.NaN],
    ['identifiant zero', 0],
    ['identifiant negatif', -3],
    ['identifiant fractionnaire', 1.5],
    ['identifiant hors des entiers surs', Number.MAX_SAFE_INTEGER + 2],
    ['identifiant null', null],
    ['identifiant booleen', true]
  ])('ecarte une entree avec %s et garde ses voisines valides', (_nom, mauvaisId) => {
    seedStorage([
      storedTask({ id: 10, text: 'Avant' }),
      storedTask({ id: mauvaisId, text: 'Invalide' }),
      storedTask({ id: 11, text: 'Apres' })
    ])

    const manager = new TaskManager()
    expect(manager.getTasks().map(task => task.text)).toEqual(['Avant', 'Apres'])
  })

  it('ecarte une entree sans identifiant du tout', () => {
    const sansId = storedTask({ text: 'Invalide' })
    delete sansId.id
    seedStorage([storedTask({ id: 10, text: 'Avant' }), sansId])

    const manager = new TaskManager()
    expect(manager.getTasks().map(task => task.text)).toEqual(['Avant'])
  })

  it('ecarte les identifiants en double, la premiere occurrence gagne', () => {
    seedStorage([
      storedTask({ id: 5, text: 'Premiere' }),
      storedTask({ id: 5, text: 'Doublon' }),
      storedTask({ id: 6, text: 'Autre' })
    ])

    const manager = new TaskManager()
    expect(manager.getTasks().map(task => task.text)).toEqual(['Premiere', 'Autre'])
  })

  it('produit encore des identifiants distincts apres MAX_SAFE_INTEGER', () => {
    seedStorage([storedTask({ id: Number.MAX_SAFE_INTEGER, text: 'Limite' })])

    const manager = new TaskManager()
    manager.addTask('Suivante 1', 'low')
    manager.addTask('Suivante 2', 'low')

    const ids = manager.getTasks().map(task => task.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
  })

  it('un echec d ecriture ne fait pas planter addTask', () => {
    const manager = new TaskManager()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => manager.addTask('Une', 'low')).not.toThrow()
  })

  it('un echec d ecriture affiche l erreur dans l interface', () => {
    const manager = new TaskManager()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    manager.addTask('Une', 'low')

    expect(isErrorVisible()).toBe(true)
    expect(appError()!.textContent).toBe(en['error.save'])
    expect(appError()!.getAttribute('data-i18n')).toBe('error.save')
  })

  it('un echec d ecriture ne fait pas planter toggleTask ni deleteTask', () => {
    const manager = new TaskManager()
    manager.addTask('Une', 'low')
    const id = manager.getTasks()[0].id

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => manager.toggleTask(id)).not.toThrow()
    expect(() => manager.deleteTask(id)).not.toThrow()
  })
})
