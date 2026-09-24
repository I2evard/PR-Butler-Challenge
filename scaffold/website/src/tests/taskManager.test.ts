// SCENARIOS - the task manager, exercised only through its public surface and the DOM
//   1. Adding tasks grows the list and hands out increasing ids
//   2. Toggling a task twice brings it back to "not done"
//   3. Toggling an unknown id changes nothing
//   4. Deleting removes only the task asked for
//   5. The "active" filter shows the unfinished tasks, "completed" the finished ones
//   6. Rendering without a list element on the page is a no-op, not a crash
//   7. A rendered row carries a checkbox, a text, a priority badge and a delete button
//   8. A task whose text looks like HTML is displayed as text, never executed
//   9. The delete button and the priority badge are written in the language currently selected,
//      while the badge keeps the class that colours it
//  10. Clicking delete removes the task, ticking the checkbox completes it
//  11. The two counters follow the list
//  12. A task added in one session is read back in the next one
//  13. A restored task's creation date is a real Date, not a string
//  14. Unreadable storage is discarded and the user is told so, on screen
//  15. Entries that are not valid tasks are dropped one by one, and the user is told
//  16. An out-of-range id is rejected, and new tasks can still be created afterwards
//  17. Two entries sharing an id leave exactly one task
//  18. The largest safe id is accepted, and the app still hands out further distinct ids
//  19. The notice is written in the language currently selected
//  20. A save that fails loses nothing on screen and warns the user
//  21. A later successful save clears that warning

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { TaskManager } from '../taskManager'
import { setLanguage } from '../i18n'
import { mountPage } from './fixture'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const EN = enCatalogue as Record<string, string>
const FR = frCatalogue as Record<string, string>

/** Builds a stored entry that is valid in every respect, unless a field is overridden. */
function validEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    text: 'Stored task',
    priority: 'low',
    completed: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides
  }
}

/** Writes raw, possibly malformed, text under the storage key the manager reads. */
function seedRaw(raw: string): void {
  localStorage.setItem('tasks', raw)
}

/** Writes a JSON payload under the storage key the manager reads. */
function seedJson(value: unknown): void {
  localStorage.setItem('tasks', JSON.stringify(value))
}

/** The first notice row currently on screen, if any. */
function notice(): Element | null {
  return document.querySelector('.app-notice')
}

describe('TaskManager', () => {
  let manager: TaskManager

  beforeEach(() => {
    localStorage.clear()
    setLanguage('en')
    mountPage()
    manager = new TaskManager()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should add a task', () => {
    manager.addTask('Test task', 'low')
    expect(manager.getTasks()).toHaveLength(1)
  })

  it('should get completed count', () => {
    manager.addTask('Task 1', 'low')
    expect(manager.getCompletedCount()).toBe(0)
  })

  it('hands out increasing ids and reflects every addition', () => {
    manager.addTask('First', 'low')
    manager.addTask('Second', 'high')

    const tasks = manager.getTasks()
    expect(tasks.map(task => task.text)).toEqual(['First', 'Second'])
    expect(tasks[1].id).toBeGreaterThan(tasks[0].id)
  })

  it('brings a task back to not-done when toggled twice', () => {
    manager.addTask('Toggle me', 'low')
    const id = manager.getTasks()[0].id

    manager.toggleTask(id)
    expect(manager.getTasks()[0].completed).toBe(true)

    manager.toggleTask(id)
    expect(manager.getTasks()[0].completed).toBe(false)
    expect(manager.getCompletedCount()).toBe(0)
  })

  it('changes nothing when toggling an unknown id', () => {
    manager.addTask('Untouched', 'low')
    const before = manager.getTasks()[0].completed

    manager.toggleTask(999999)

    expect(manager.getTasks()).toHaveLength(1)
    expect(manager.getTasks()[0].completed).toBe(before)
  })

  it('deletes only the task asked for', () => {
    manager.addTask('Keep me', 'low')
    manager.addTask('Delete me', 'high')
    const doomed = manager.getTasks()[1].id

    manager.deleteTask(doomed)

    expect(manager.getTasks().map(task => task.text)).toEqual(['Keep me'])
  })

  describe('filters', () => {
    beforeEach(() => {
      manager.addTask('Still to do', 'low')
      manager.addTask('Already done', 'high')
      manager.toggleTask(manager.getTasks()[1].id)
    })

    function renderedTexts(): string[] {
      return Array.from(document.querySelectorAll('#tasks .task-text')).map(
        element => element.textContent ?? ''
      )
    }

    it('renders only the unfinished tasks under the active filter', () => {
      manager.setFilter('active')
      expect(renderedTexts()).toEqual(['Still to do'])
    })

    it('renders only the finished tasks under the completed filter', () => {
      manager.setFilter('completed')
      expect(renderedTexts()).toEqual(['Already done'])
    })

    it('renders every task under the all filter', () => {
      manager.setFilter('completed')
      manager.setFilter('all')
      expect(renderedTexts()).toEqual(['Still to do', 'Already done'])
    })
  })

  it('does nothing and does not throw when the list element is absent', () => {
    document.body.innerHTML = '<span id="total-count">0</span><span id="completed-count">0</span>'

    expect(() => manager.addTask('Orphan', 'low')).not.toThrow()
    expect(() => manager.render()).not.toThrow()

    expect(document.querySelector('#total-count')!.textContent).toBe('0')
    expect(document.querySelector('#completed-count')!.textContent).toBe('0')
  })

  it('builds a row carrying a checkbox, a text, a badge and a delete button', () => {
    manager.addTask('Fully rendered', 'high')

    const row = document.querySelector('#tasks li')
    expect(row).not.toBeNull()
    expect(row!.querySelector('.task-checkbox')).not.toBeNull()
    expect(row!.querySelector('.task-text')!.textContent).toBe('Fully rendered')
    expect(row!.querySelector('.priority-badge')!.textContent).toBe('HIGH')
    expect(row!.querySelector('.delete-btn')).not.toBeNull()
  })

  // The English chips are already on screen before the switch, so only a French assertion
  // proves the badge was actually repainted rather than simply left alone.
  it('writes the priority badges in French once French is selected', () => {
    manager.addTask('Low one', 'low')
    manager.addTask('Medium one', 'medium')
    manager.addTask('High one', 'high')

    setLanguage('fr')
    manager.render()

    const badges = Array.from(document.querySelectorAll('.priority-badge')).map(
      badge => badge.textContent
    )
    expect(badges).toEqual(['FAIBLE', 'MOYENNE', 'ÉLEVÉE'])
  })

  it('keeps the priority class on the badge whatever the language', () => {
    manager.addTask('High one', 'high')

    setLanguage('fr')
    manager.render()

    const badge = document.querySelector('.priority-badge')!
    expect(badge.classList.contains('priority-high')).toBe(true)
  })

  it('displays a task text that looks like HTML as plain text', () => {
    const payload = '<img src=x onerror="alert(1)">'

    manager.addTask(payload, 'low')

    expect(document.querySelector('.task-text')!.textContent).toBe(payload)
    expect(document.querySelector('.task-text img')).toBeNull()
  })

  it('writes the delete button in French once French is selected', () => {
    manager.addTask('A task', 'low')

    setLanguage('fr')
    manager.render()

    expect(document.querySelector('.delete-btn')!.textContent).toBe('Supprimer')
  })

  it('deletes the task when its delete button is clicked', () => {
    manager.addTask('Click to delete', 'low')

    document.querySelector<HTMLButtonElement>('.delete-btn')!.click()

    expect(manager.getTasks()).toHaveLength(0)
    expect(document.querySelectorAll('#tasks li')).toHaveLength(0)
  })

  it('completes the task when its checkbox changes', () => {
    manager.addTask('Tick me', 'low')

    const checkbox = document.querySelector<HTMLInputElement>('.task-checkbox')!
    checkbox.checked = true
    checkbox.dispatchEvent(new Event('change'))

    expect(manager.getCompletedCount()).toBe(1)
  })

  it('keeps both counters in step with the list', () => {
    manager.addTask('One', 'low')
    manager.addTask('Two', 'low')
    manager.toggleTask(manager.getTasks()[0].id)

    expect(document.querySelector('#total-count')!.textContent).toBe('2')
    expect(document.querySelector('#completed-count')!.textContent).toBe('1')
  })

  it('reads back, in a new session, a task added in the previous one', () => {
    manager.addTask('Persisted', 'medium')

    const reopened = new TaskManager()

    expect(reopened.getTasks()).toHaveLength(1)
    expect(reopened.getTasks()[0].text).toBe('Persisted')
    expect(reopened.getTasks()[0].priority).toBe('medium')
  })

  it('restores a creation date as a real Date instance', () => {
    seedJson([validEntry()])

    const restored = new TaskManager()

    expect(restored.getTasks()).toHaveLength(1)
    expect(restored.getTasks()[0].createdAt).toBeInstanceOf(Date)
    expect(Number.isNaN(restored.getTasks()[0].createdAt.getTime())).toBe(false)
  })

  describe('unreadable storage', () => {
    it('discards text that is not JSON and says so on screen', () => {
      seedRaw('not json at all')

      const restored = new TaskManager()
      expect(restored.getTasks()).toEqual([])

      restored.render()

      expect(notice()).not.toBeNull()
      expect(notice()!.tagName).toBe('LI')
      expect(notice()!.classList.contains('app-notice--error')).toBe(true)
      expect(notice()!.getAttribute('role')).toBe('alert')
      expect(notice()!.textContent).toBe(EN['error.storage.read'])
    })

    it('discards JSON that is not an array and says so on screen', () => {
      seedRaw('{"a":1}')

      const restored = new TaskManager()
      expect(restored.getTasks()).toEqual([])

      restored.render()

      expect(notice()).not.toBeNull()
      expect(notice()!.textContent).toBe(EN['error.storage.read'])
    })

    it('discards entries that are not objects and says so on screen', () => {
      seedRaw('[null,null]')

      const restored = new TaskManager()
      expect(restored.getTasks()).toEqual([])

      restored.render()

      expect(notice()).not.toBeNull()
      expect(notice()!.textContent).toBe(EN['error.storage.read'])
    })

    it('puts the notice above the task rows', () => {
      seedJson([validEntry({ id: 1 }), validEntry({ id: 1, text: 'Duplicate' })])

      const restored = new TaskManager()
      restored.render()

      const list = document.querySelector('#tasks')!
      expect(list.firstElementChild!.classList.contains('app-notice')).toBe(true)
      expect(list.querySelectorAll('.task-text')).toHaveLength(1)
    })

    it('keeps only the first of two entries sharing an id', () => {
      seedJson([validEntry({ id: 1 }), validEntry({ id: 1, text: 'Duplicate' })])

      const restored = new TaskManager()
      expect(restored.getTasks()).toHaveLength(1)

      restored.render()
      expect(notice()).not.toBeNull()

      restored.deleteTask(1)
      expect(restored.getTasks()).toEqual([])
    })

    it('rejects an id outside the safe range and still creates new tasks', () => {
      seedJson([validEntry({ id: 1e308 })])

      const restored = new TaskManager()
      expect(restored.getTasks()).toEqual([])

      restored.render()
      expect(notice()).not.toBeNull()
      expect(notice()!.textContent).toBe(EN['error.storage.read'])

      restored.addTask('Fresh start', 'low')
      const id = restored.getTasks()[0].id
      expect(Number.isSafeInteger(id)).toBe(true)
      expect(id).toBeGreaterThan(0)
    })

    const invalidEntries: [string, Record<string, unknown>][] = [
      ['a text that is not a string', validEntry({ text: 42 })],
      ['a priority that is not one of the three', validEntry({ priority: 'urgent' })],
      ['a completed flag that is not a boolean', validEntry({ completed: 'yes' })],
      ['a creation date that is not a date', validEntry({ createdAt: 'not a date' })],
      ['a missing id', { text: 'No id', priority: 'low', completed: false, createdAt: 0 }],
      ['an id that is zero', validEntry({ id: 0 })],
      ['an id that is negative', validEntry({ id: -3 })],
      ['an id that is not an integer', validEntry({ id: 1.5 })]
    ]

    invalidEntries.forEach(([label, entry]) => {
      it('discards a stored entry with ' + label, () => {
        seedJson([entry])

        const restored = new TaskManager()
        expect(restored.getTasks()).toEqual([])

        restored.render()
        expect(notice()).not.toBeNull()
        expect(notice()!.textContent).toBe(EN['error.storage.read'])
      })
    })

    it('writes the notice in French once French is selected', () => {
      seedRaw('not json at all')
      setLanguage('fr')

      const restored = new TaskManager()
      restored.render()

      expect(notice()).not.toBeNull()
      expect(notice()!.textContent).toBe(FR['error.storage.read'])
      expect(notice()!.textContent).not.toBe(EN['error.storage.read'])
    })
  })

  describe('ids handed out after a restore', () => {
    it('accepts the largest safe id and still hands out two further distinct ids', () => {
      seedJson([validEntry({ id: Number.MAX_SAFE_INTEGER })])

      const restored = new TaskManager()
      expect(restored.getTasks()).toHaveLength(1)
      expect(restored.getTasks()[0].id).toBe(Number.MAX_SAFE_INTEGER)

      restored.addTask('One more', 'low')
      restored.addTask('And another', 'low')

      const ids = restored.getTasks().map(task => task.id)
      expect(ids).toHaveLength(3)
      expect(new Set(ids).size).toBe(3)

      const fresh = ids.filter(id => id !== Number.MAX_SAFE_INTEGER)
      expect(fresh).toHaveLength(2)
      fresh.forEach(id => {
        expect(Number.isSafeInteger(id)).toBe(true)
        expect(id).toBeGreaterThan(0)
      })
    })

    it('never reuses an id that is already taken', () => {
      seedJson([
        validEntry({ id: 1, text: 'One' }),
        validEntry({ id: 2, text: 'Two' }),
        validEntry({ id: 3, text: 'Three' })
      ])

      const restored = new TaskManager()
      expect(restored.getTasks()).toHaveLength(3)

      restored.addTask('Four', 'low')

      const fresh = restored.getTasks()[3].id
      expect([1, 2, 3]).not.toContain(fresh)
      expect(Number.isSafeInteger(fresh)).toBe(true)
      expect(fresh).toBeGreaterThan(0)
    })
  })

  describe('a save that fails', () => {
    it('keeps the task, repaints the page and warns the user', () => {
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota')
      })

      expect(() => manager.addTask('Unsaved', 'low')).not.toThrow()

      expect(manager.getTasks()).toHaveLength(1)
      expect(document.querySelectorAll('#tasks .task-text')).toHaveLength(1)
      expect(document.querySelector('#tasks .task-text')!.textContent).toBe('Unsaved')

      expect(notice()).not.toBeNull()
      expect(notice()!.getAttribute('role')).toBe('alert')
      expect(notice()!.textContent).toBe(EN['error.storage.write'])
    })

    it('clears the warning once a later save succeeds', () => {
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('quota')
      })

      manager.addTask('Unsaved', 'low')
      expect(notice()).not.toBeNull()

      setItem.mockRestore()
      manager.addTask('Saved', 'low')

      expect(notice()).toBeNull()
      expect(document.querySelectorAll('#tasks .task-text')).toHaveLength(2)
    })
  })
})
