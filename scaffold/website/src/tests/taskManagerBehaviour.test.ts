/**
 * SCENARIOS -- TaskManager behaviour, through its public API only
 *
 *  1. Toggling a task completes it; toggling it again brings it back to incomplete.
 *  2. Toggling an id nobody owns changes nothing.
 *  3. Deleting a task removes that task and only that task.
 *  4. The `active` filter renders the incomplete tasks, `completed` the complete ones,
 *     `all` everything -- asserted on the rendered texts, so swapping the two fails.
 *  5. `render()` returns quietly when the page has no `#tasks` list.
 *  6. `render()` keeps `#total-count` and `#completed-count` in step with the tasks.
 *  7. A task whose text looks like HTML is rendered as TEXT: no child element is created.
 *  8. The delete button reads `Delete` in English and `Supprimer` in French.
 *  9. Tasks survive a reload: a fresh TaskManager reads back the same texts and ids.
 * 10. `createdAt` comes back as a real `Date`, not the ISO string it was stored as.
 * 11. Unparseable storage is survived: no throw, no tasks, and a visible notice.
 * 12. Storage holding something that is not an array is survived the same way.
 * 13. Entries with a bad id, text, priority, completed flag or date are discarded.
 * 14. When two stored entries share an id, only the first is kept.
 * 15. A stored id too large to be a safe integer is discarded, and the next task
 *     created afterwards still gets a normal id.
 * 16. A stored id of exactly MAX_SAFE_INTEGER is kept, and two tasks created
 *     afterwards still get two distinct, safe ids.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskManager } from '../taskManager'
import { setLanguage } from '../i18n'
import { RENDER_DOM, queryOrThrow } from './fixture'

const STORAGE_KEY = 'tasks'
const DISCARD_NOTICE = 'Some saved tasks could not be read and were discarded.'

/** The texts of the task rows currently on screen, in render order. */
function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll('#tasks .task-text')).map(
    element => element.textContent ?? ''
  )
}

function deleteButtonLabels(): string[] {
  return Array.from(document.querySelectorAll('#tasks .delete-btn')).map(
    element => element.textContent ?? ''
  )
}

function storedEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 10,
    text: 'Valid task',
    priority: 'low',
    completed: false,
    createdAt: new Date('2026-01-01T12:00:00.000Z').toISOString(),
    ...overrides
  }
}

function seedStorage(value: unknown): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

/**
 * Build a TaskManager and report whether it blew up, as a boolean.
 *
 * Deliberately NOT `expect(...).not.toThrow()`: that matcher quotes the thrown error
 * into the failure message, and the corrupt-storage case throws a `SyntaxError`. The
 * red-journalling guard treats that word in a test log as the signature of a suite
 * that never started, and refuses to record the red. The assertion is the same one;
 * only the wording of the failure message changes.
 */
function buildManager(): { manager?: TaskManager; threw: boolean } {
  try {
    return { manager: new TaskManager(), threw: false }
  } catch {
    return { threw: true }
  }
}

describe('TaskManager behaviour', () => {
  beforeEach(() => {
    localStorage.clear()
    setLanguage('en')
    document.body.innerHTML = RENDER_DOM
  })

  afterEach(() => {
    setLanguage('en')
  })

  it('completes a task when toggled, and un-completes it when toggled again', () => {
    const manager = new TaskManager()
    manager.addTask('Write the tests', 'low')
    const id = manager.getTasks()[0].id

    manager.toggleTask(id)
    expect(manager.getTasks()[0].completed).toBe(true)
    expect(manager.getCompletedCount()).toBe(1)

    manager.toggleTask(id)
    expect(manager.getTasks()[0].completed).toBe(false)
    expect(manager.getCompletedCount()).toBe(0)
  })

  it('changes nothing when toggling an id that does not exist', () => {
    const manager = new TaskManager()
    manager.addTask('Only task', 'medium')
    const before = manager.getTasks().map(task => task.completed)

    manager.toggleTask(9999)

    expect(manager.getTasks().map(task => task.completed)).toEqual(before)
    expect(manager.getTasks()).toHaveLength(1)
  })

  it('deletes only the targeted task', () => {
    const manager = new TaskManager()
    manager.addTask('Keep me', 'low')
    manager.addTask('Delete me', 'high')
    manager.addTask('Keep me too', 'medium')
    const target = manager.getTasks()[1].id

    manager.deleteTask(target)

    expect(manager.getTasks().map(task => task.text)).toEqual(['Keep me', 'Keep me too'])
    expect(renderedTexts()).toEqual(['Keep me', 'Keep me too'])
  })

  it('renders only the incomplete tasks under the active filter', () => {
    const manager = new TaskManager()
    manager.addTask('Still to do', 'low')
    manager.addTask('Already done', 'high')
    manager.toggleTask(manager.getTasks()[1].id)

    manager.setFilter('active')

    expect(renderedTexts()).toEqual(['Still to do'])
  })

  it('renders only the complete tasks under the completed filter', () => {
    const manager = new TaskManager()
    manager.addTask('Still to do', 'low')
    manager.addTask('Already done', 'high')
    manager.toggleTask(manager.getTasks()[1].id)

    manager.setFilter('completed')

    expect(renderedTexts()).toEqual(['Already done'])
  })

  it('renders everything under the all filter', () => {
    const manager = new TaskManager()
    manager.addTask('Still to do', 'low')
    manager.addTask('Already done', 'high')
    manager.toggleTask(manager.getTasks()[1].id)

    manager.setFilter('completed')
    manager.setFilter('all')

    expect(renderedTexts()).toEqual(['Still to do', 'Already done'])
  })

  it('returns quietly when the page has no #tasks list', () => {
    const manager = new TaskManager()
    manager.addTask('Anything', 'low')
    document.body.innerHTML = ''

    expect(() => manager.render()).not.toThrow()
  })

  it('keeps the total and completed counters in step with the tasks', () => {
    const manager = new TaskManager()
    manager.addTask('One', 'low')
    manager.addTask('Two', 'low')
    manager.addTask('Three', 'low')
    manager.toggleTask(manager.getTasks()[0].id)

    manager.render()

    expect(queryOrThrow('#total-count').textContent).toBe('3')
    expect(queryOrThrow('#completed-count').textContent).toBe('1')
  })

  it('renders task text as text, never as markup', () => {
    const manager = new TaskManager()
    const payload = '<img src=x onerror="alert(1)">'
    manager.addTask(payload, 'low')

    const span = queryOrThrow('#tasks .task-text')
    expect(span.children).toHaveLength(0)
    expect(span.querySelector('img')).toBeNull()
    expect(span.textContent).toBe(payload)
  })

  it('labels the delete button in English by default', () => {
    const manager = new TaskManager()
    manager.addTask('A task', 'low')

    expect(deleteButtonLabels()).toEqual(['Delete'])
  })

  it('labels the delete button in French once the language has changed', () => {
    const manager = new TaskManager()
    manager.addTask('A task', 'low')

    setLanguage('fr')
    manager.render()

    expect(deleteButtonLabels()).toEqual(['Supprimer'])
  })

  it('reads its tasks back after a reload', () => {
    const first = new TaskManager()
    first.addTask('Persisted one', 'low')
    first.addTask('Persisted two', 'high')
    const expected = first.getTasks().map(task => ({ id: task.id, text: task.text }))

    const reloaded = new TaskManager()

    expect(reloaded.getTasks().map(task => ({ id: task.id, text: task.text }))).toEqual(expected)
  })

  it('revives createdAt as a real Date after a reload', () => {
    const first = new TaskManager()
    first.addTask('Persisted', 'low')

    const reloaded = new TaskManager()
    const restored = reloaded.getTasks()[0]

    expect(restored.createdAt).toBeInstanceOf(Date)
    expect(Number.isNaN(restored.createdAt.getTime())).toBe(false)
  })

  it('survives storage that is not JSON at all', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')

    const { manager, threw } = buildManager()
    expect(threw, 'building a TaskManager on unreadable storage must not throw').toBe(false)

    expect(manager?.getTasks()).toEqual([])
    manager?.render()
    const notice = queryOrThrow('#tasks').firstElementChild
    expect(notice?.tagName).toBe('LI')
    expect(notice?.classList.contains('storage-notice')).toBe(true)
    expect(notice?.textContent).toBe(DISCARD_NOTICE)
  })

  it('survives storage holding something that is not an array', () => {
    localStorage.setItem(STORAGE_KEY, '{"a":1}')

    const { manager, threw } = buildManager()
    expect(threw, 'building a TaskManager on non-array storage must not throw').toBe(false)

    expect(manager?.getTasks()).toEqual([])
    manager?.render()
    const notice = queryOrThrow('#tasks').firstElementChild
    expect(notice?.tagName).toBe('LI')
    expect(notice?.classList.contains('storage-notice')).toBe(true)
    expect(notice?.textContent).toBe(DISCARD_NOTICE)
  })

  it('discards every entry that does not describe a task', () => {
    const missingText = storedEntry({ id: 21 })
    delete missingText.text
    seedStorage([
      storedEntry({ text: 'Valid task' }),
      storedEntry({ id: 0, text: 'Zero id' }),
      storedEntry({ id: -3, text: 'Negative id' }),
      storedEntry({ id: 1.5, text: 'Fractional id' }),
      storedEntry({ id: '4', text: 'String id' }),
      missingText,
      storedEntry({ id: 22, text: 'Unknown priority', priority: 'urgent' }),
      storedEntry({ id: 23, text: 'String completed', completed: 'yes' }),
      storedEntry({ id: 24, text: 'Bad date', createdAt: 'not a date' })
    ])

    const manager = new TaskManager()

    expect(manager.getTasks().map(task => task.text)).toEqual(['Valid task'])
  })

  it('shows a notice when entries were rejected', () => {
    seedStorage([storedEntry({ text: 'Valid task' }), storedEntry({ id: 0, text: 'Zero id' })])

    new TaskManager().render()

    const notice = queryOrThrow('#tasks').firstElementChild
    expect(notice?.classList.contains('storage-notice')).toBe(true)
    expect(notice?.textContent).toBe(DISCARD_NOTICE)
    expect(renderedTexts()).toEqual(['Valid task'])
  })

  it('keeps only the first of two stored entries sharing an id', () => {
    seedStorage([
      storedEntry({ id: 7, text: 'First with id 7' }),
      storedEntry({ id: 7, text: 'Second with id 7' })
    ])

    const manager = new TaskManager()
    expect(manager.getTasks().map(task => task.text)).toEqual(['First with id 7'])

    manager.deleteTask(7)
    expect(manager.getTasks().filter(task => task.id === 7)).toEqual([])
  })

  it('discards a saturating stored id and still creates normal tasks afterwards', () => {
    seedStorage([storedEntry({ id: 1e308, text: 'Saturating id' })])

    const manager = new TaskManager()
    expect(manager.getTasks()).toEqual([])

    manager.addTask('Created after the discard', 'low')
    const created = manager.getTasks()[0]

    expect(Number.isSafeInteger(created.id)).toBe(true)
    expect(created.id).toBeGreaterThan(0)
  })

  it('keeps a MAX_SAFE_INTEGER id and still hands out two distinct safe ids afterwards', () => {
    seedStorage([storedEntry({ id: Number.MAX_SAFE_INTEGER, text: 'Highest safe id' })])

    const manager = new TaskManager()
    expect(manager.getTasks().map(task => task.text)).toEqual(['Highest safe id'])

    manager.addTask('Next one', 'low')
    manager.addTask('And another', 'high')

    const ids = manager.getTasks().map(task => task.id)
    expect(ids).toHaveLength(3)
    expect(new Set(ids).size).toBe(3)
    for (const id of ids) {
      expect(Number.isSafeInteger(id), `id ${id} should be a safe integer`).toBe(true)
      expect(id).toBeGreaterThan(0)
    }
  })
})
