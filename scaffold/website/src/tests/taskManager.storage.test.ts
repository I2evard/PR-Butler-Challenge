/**
 * SCÉNARIOS — intégrité des données rechargées (TaskManager)
 *
 * Ces cas décrivent le comportement VOULU, pas le comportement actuel : ils sont
 * rouges tant que `loadFromStorage` et `getTasks` n'ont pas été corrigés. Ils
 * verrouillent les défauts 1, 2 et 3 du rapport d'analyse.
 *
 *  1. Une tâche relue après un rechargement porte une vraie date, pas une chaîne
 *  2. La date relue est bien celle de la création, pas une date inventée au chargement
 *  3. Des données stockées qui sont un tableau d'objets étrangers ne font pas planter
 *     la construction
 *  4. Ni l'affichage : dessiner la liste après de telles données ne lève pas
 *  5. Un tableau mêlant une vraie tâche et un objet invalide garde la vraie et écarte
 *     l'autre
 *  6. Après des données invalides, la tâche suivante reçoit un identifiant utilisable
 *     — jamais NaN
 *  7. Après un tableau mêlé, la tâche suivante ne reprend pas un identifiant déjà pris
 *  8. Ce que rend `getTasks()` n'est pas la liste interne : la muter ne change pas
 *     l'état du gestionnaire
 *  9. Ce que rend `getTasks()` reste fidèle : les tâches qu'il contient sont celles du
 *     gestionnaire
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskManager } from '../taskManager'

/** Builds the markup `render()` expects, as the real page provides it. */
function mountTaskDom(): void {
  document.body.innerHTML = `
    <ul id="tasks"></ul>
    <span id="total-count">0</span>
    <span id="completed-count">0</span>
  `
}

/** The task texts currently on screen, in display order. */
function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#tasks .task-text')).map(
    element => element.textContent ?? ''
  )
}

describe('TaskManager — integrity of reloaded data', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    // Recovery paths report on the console; the assertions are on state, not on logs.
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('creation dates survive a reload', () => {
    it('gives back a real date, not the string it was stored as', () => {
      const manager = new TaskManager()
      manager.addTask('Survive the reload', 'low')

      const reloaded = new TaskManager()

      expect(reloaded.getTasks()[0].createdAt).toBeInstanceOf(Date)
    })

    it('gives back the date the task was created, not one made up at load time', () => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2026-09-23T08:00:00.000Z'))
      const manager = new TaskManager()
      manager.addTask('Created in the past', 'low')
      vi.setSystemTime(new Date('2026-09-24T17:30:00.000Z'))

      const reloaded = new TaskManager()
      const createdAt = reloaded.getTasks()[0].createdAt
      vi.useRealTimers()

      expect(createdAt).toBeInstanceOf(Date)
      expect(createdAt).toEqual(new Date('2026-09-23T08:00:00.000Z'))
    })

    it('keeps the date usable as a date once reloaded', () => {
      const manager = new TaskManager()
      manager.addTask('Survive the reload', 'low')

      const reloaded = new TaskManager()

      expect(() => reloaded.getTasks()[0].createdAt.getTime()).not.toThrow()
      expect(Number.isNaN(reloaded.getTasks()[0].createdAt.getTime())).toBe(false)
    })
  })

  describe('stored entries that are not tasks', () => {
    it('does not blow up while building the manager', () => {
      localStorage.setItem('tasks', '[{"nope":1}]')

      expect(() => new TaskManager()).not.toThrow()
    })

    it('does not blow up while drawing the list', () => {
      localStorage.setItem('tasks', '[{"nope":1}]')
      mountTaskDom()

      const recovered = new TaskManager()

      expect(() => recovered.render()).not.toThrow()
      expect(renderedTexts()).toEqual([])
    })

    it('drops the entries it cannot use', () => {
      localStorage.setItem('tasks', '[{"nope":1},"a string",42]')

      expect(new TaskManager().getTasks()).toEqual([])
    })

    it('keeps the genuine task and discards the invalid one in a mixed list', () => {
      localStorage.setItem(
        'tasks',
        JSON.stringify([
          { id: 7, text: 'A real task', priority: 'high', completed: false, createdAt: new Date() },
          { nope: 1 }
        ])
      )
      mountTaskDom()

      const recovered = new TaskManager()

      expect(recovered.getTasks()).toHaveLength(1)
      expect(recovered.getTasks()[0].text).toBe('A real task')
      expect(() => recovered.render()).not.toThrow()
      expect(renderedTexts()).toEqual(['A real task'])
    })

    it('still hands out a usable identifier to the next task', () => {
      localStorage.setItem('tasks', '[{"nope":1}]')
      mountTaskDom()

      const recovered = new TaskManager()
      recovered.addTask('A fresh start', 'low')

      const id = recovered.getTasks()[recovered.getTasks().length - 1].id
      expect(Number.isNaN(id)).toBe(false)
      expect(Number.isInteger(id)).toBe(true)
      expect(id).toBeGreaterThan(0)
    })

    it('does not reuse an identifier already taken in a mixed list', () => {
      localStorage.setItem(
        'tasks',
        JSON.stringify([
          { id: 7, text: 'A real task', priority: 'high', completed: false, createdAt: new Date() },
          { nope: 1 }
        ])
      )
      mountTaskDom()

      const recovered = new TaskManager()
      recovered.addTask('The next one', 'low')

      const ids = recovered.getTasks().map(task => task.id)
      expect(new Set(ids).size).toBe(ids.length)
      expect(ids).toContain(8)
    })
  })

  describe('getTasks does not hand out the internal list', () => {
    it('ignores a task pushed into the array it returned', () => {
      const manager = new TaskManager()
      manager.addTask('The only real task', 'low')

      manager.getTasks().push({
        id: 99,
        text: 'Injected without going through addTask',
        priority: 'low',
        completed: false,
        createdAt: new Date()
      })

      expect(manager.getTasks()).toHaveLength(1)
      expect(manager.getTasks()[0].text).toBe('The only real task')
    })

    it('ignores a task removed from the array it returned', () => {
      const manager = new TaskManager()
      manager.addTask('Task 1', 'low')
      manager.addTask('Task 2', 'low')

      manager.getTasks().splice(0, 2)

      expect(manager.getTasks()).toHaveLength(2)
    })

    it('still reports exactly the tasks the manager holds', () => {
      const manager = new TaskManager()
      manager.addTask('Task 1', 'low')
      manager.addTask('Task 2', 'high')

      expect(manager.getTasks().map(task => task.text)).toEqual(['Task 1', 'Task 2'])
      expect(manager.getTasks().map(task => task.priority)).toEqual(['low', 'high'])
    })
  })
})
