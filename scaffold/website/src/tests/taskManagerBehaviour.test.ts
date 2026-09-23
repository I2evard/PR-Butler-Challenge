import { describe, it, expect, beforeEach } from 'vitest'
import { TaskManager } from '../taskManager'

/*
 * SCENARIOS - TaskManager rendering, filtering, mutation and persistence
 *
 *  1. render() does nothing at all when the #tasks host element is absent
 *  2. Adding tasks renders one .task-item per task, in insertion order
 *  3. A rendered task shows its text, an uppercased priority badge and a Delete button
 *  4. A completed task carries the `completed` class; an incomplete one does not
 *  5. The stats spans show the total task count and the completed task count
 *  6. Task text is inserted as text, never as markup (XSS regression)
 *  7. The rendered checkbox reflects the completion state
 *  8. Clicking the rendered checkbox toggles the task
 *  9. Clicking the rendered delete button removes the task
 * 10. Filter 'active' renders only the incomplete task, by name
 * 11. Filter 'completed' renders only the complete task, by name
 * 12. Filter 'all' renders every task again
 * 13. Filtering never changes the stats, which always count every task
 * 14. Toggling a task twice brings it back to not-completed
 * 15. deleteTask removes only the matching id
 * 16. deleteTask with an unknown id changes nothing
 * 17. toggleTask with an unknown id changes nothing
 * 18. Tasks survive into a freshly constructed TaskManager (storage round-trip)
 * 19. The id generated after a reload does not collide with a restored id
 * 20. Deletions are persisted too
 * 21. An empty storage yields an empty manager
 */

const DOM = '<ul id="tasks"></ul><span id="total-count"></span><span id="completed-count"></span>'

function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll('#tasks .task-text')).map(el => el.textContent ?? '')
}

function click(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('TaskManager rendering', () => {
  let manager: TaskManager

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = DOM
    manager = new TaskManager()
  })

  // Scenario 1
  it('renders nothing and updates no stats when the task list element is missing', () => {
    document.body.innerHTML = '<span id="total-count"></span><span id="completed-count"></span>'
    manager.addTask('Orphan task', 'low')

    expect(manager.getTasks()).toHaveLength(1)
    expect(document.getElementById('total-count')?.textContent).toBe('')
    expect(document.getElementById('completed-count')?.textContent).toBe('')
  })

  // Scenario 2
  it('renders one list item per task in insertion order', () => {
    manager.addTask('First', 'low')
    manager.addTask('Second', 'high')

    expect(document.querySelectorAll('#tasks .task-item')).toHaveLength(2)
    expect(renderedTexts()).toEqual(['First', 'Second'])
  })

  // Scenario 3
  it('renders the task text, an uppercased priority badge and a Delete button', () => {
    manager.addTask('Write the report', 'high')

    const item = document.querySelector('#tasks .task-item')
    expect(item?.querySelector('.task-text')?.textContent).toBe('Write the report')
    expect(item?.querySelector('.priority-badge')?.textContent).toBe('HIGH')
    expect(item?.querySelector('.priority-badge')?.classList.contains('priority-high')).toBe(true)
    expect(item?.querySelector('.delete-btn')?.textContent).toBe('Delete')
  })

  // Scenario 4
  it('marks a completed task with the completed class and leaves others without it', () => {
    manager.addTask('Done thing', 'low')
    manager.addTask('Pending thing', 'low')
    manager.toggleTask(1)

    const items = document.querySelectorAll('#tasks .task-item')
    expect(items[0].classList.contains('completed')).toBe(true)
    expect(items[1].classList.contains('completed')).toBe(false)
  })

  // Scenario 5
  it('shows the total and completed counts in the stats spans', () => {
    manager.addTask('A', 'low')
    manager.addTask('B', 'medium')
    manager.addTask('C', 'high')
    manager.toggleTask(2)

    expect(document.getElementById('total-count')?.textContent).toBe('3')
    expect(document.getElementById('completed-count')?.textContent).toBe('1')
  })

  // Scenario 6 - XSS regression: task text must go through textContent, never innerHTML
  it('never turns task text into live markup', () => {
    const payload = '<img src=x onerror="alert(1)">'
    manager.addTask(payload, 'low')

    expect(document.querySelectorAll('#tasks img')).toHaveLength(0)
    expect(document.querySelectorAll('#tasks .task-text')).toHaveLength(1)
    expect(document.querySelector('#tasks .task-text')?.textContent).toBe(payload)
  })

  // Scenario 7
  it('reflects the completion state on the rendered checkbox', () => {
    manager.addTask('Checkable', 'low')
    expect(document.querySelector<HTMLInputElement>('#tasks .task-checkbox')?.checked).toBe(false)

    manager.toggleTask(1)
    expect(document.querySelector<HTMLInputElement>('#tasks .task-checkbox')?.checked).toBe(true)
  })

  // Scenario 8
  it('toggles the task when its rendered checkbox is clicked', () => {
    manager.addTask('Clickable', 'low')

    click(document.querySelector('#tasks .task-checkbox') as Element)

    expect(manager.getCompletedCount()).toBe(1)
    expect(document.querySelector('#tasks .task-item')?.classList.contains('completed')).toBe(true)
  })

  // Scenario 9
  it('removes the task when its rendered delete button is clicked', () => {
    manager.addTask('Removable', 'low')
    manager.addTask('Untouched', 'low')

    click(document.querySelector('#tasks .delete-btn') as Element)

    expect(manager.getTasks().map(task => task.text)).toEqual(['Untouched'])
    expect(renderedTexts()).toEqual(['Untouched'])
  })
})

describe('TaskManager filtering', () => {
  let manager: TaskManager

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = DOM
    manager = new TaskManager()
    manager.addTask('Still to do', 'low')
    manager.addTask('Already done', 'high')
    manager.toggleTask(2)
  })

  // Scenario 10
  it('shows only the incomplete task under the active filter', () => {
    manager.setFilter('active')

    expect(document.querySelectorAll('#tasks .task-item')).toHaveLength(1)
    expect(renderedTexts()).toEqual(['Still to do'])
  })

  // Scenario 11
  it('shows only the completed task under the completed filter', () => {
    manager.setFilter('completed')

    expect(document.querySelectorAll('#tasks .task-item')).toHaveLength(1)
    expect(renderedTexts()).toEqual(['Already done'])
  })

  // Scenario 12
  it('shows every task again under the all filter', () => {
    manager.setFilter('completed')
    manager.setFilter('all')

    expect(document.querySelectorAll('#tasks .task-item')).toHaveLength(2)
    expect(renderedTexts()).toEqual(['Still to do', 'Already done'])
  })

  // Scenario 13
  it('keeps the stats counting every task regardless of the filter', () => {
    manager.setFilter('active')

    expect(document.getElementById('total-count')?.textContent).toBe('2')
    expect(document.getElementById('completed-count')?.textContent).toBe('1')
  })
})

describe('TaskManager mutation', () => {
  let manager: TaskManager

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = DOM
    manager = new TaskManager()
  })

  // Scenario 14
  it('returns a task to not-completed when toggled twice', () => {
    manager.addTask('Flip me', 'low')

    manager.toggleTask(1)
    expect(manager.getTasks()[0].completed).toBe(true)
    expect(manager.getCompletedCount()).toBe(1)

    manager.toggleTask(1)
    expect(manager.getTasks()[0].completed).toBe(false)
    expect(manager.getCompletedCount()).toBe(0)
    expect(document.querySelector('#tasks .task-item')?.classList.contains('completed')).toBe(false)
  })

  // Scenario 15
  it('deletes only the task with the matching id', () => {
    manager.addTask('Keep me', 'low')
    manager.addTask('Delete me', 'low')
    manager.addTask('Keep me too', 'low')

    manager.deleteTask(2)

    expect(manager.getTasks().map(task => task.text)).toEqual(['Keep me', 'Keep me too'])
    expect(renderedTexts()).toEqual(['Keep me', 'Keep me too'])
    expect(document.getElementById('total-count')?.textContent).toBe('2')
  })

  // Scenario 16
  it('leaves everything untouched when deleting an unknown id', () => {
    manager.addTask('Survivor', 'low')

    manager.deleteTask(999)

    expect(manager.getTasks()).toHaveLength(1)
    expect(renderedTexts()).toEqual(['Survivor'])
  })

  // Scenario 17
  it('leaves everything untouched when toggling an unknown id', () => {
    manager.addTask('Survivor', 'low')

    manager.toggleTask(999)

    expect(manager.getCompletedCount()).toBe(0)
    expect(document.querySelector('#tasks .task-item')?.classList.contains('completed')).toBe(false)
  })
})

describe('TaskManager persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = DOM
  })

  // Scenario 18
  it('restores the saved tasks into a freshly constructed manager', () => {
    const first = new TaskManager()
    first.addTask('Persisted A', 'low')
    first.addTask('Persisted B', 'high')
    first.toggleTask(2)

    const reloaded = new TaskManager()

    expect(reloaded.getTasks().map(task => task.text)).toEqual(['Persisted A', 'Persisted B'])
    expect(reloaded.getTasks().map(task => task.priority)).toEqual(['low', 'high'])
    expect(reloaded.getCompletedCount()).toBe(1)
  })

  // Scenario 19
  it('generates a fresh id that collides with no restored id', () => {
    const first = new TaskManager()
    first.addTask('Persisted A', 'low')
    first.addTask('Persisted B', 'low')

    const reloaded = new TaskManager()
    reloaded.addTask('Brand new', 'low')

    const ids = reloaded.getTasks().map(task => task.id)
    expect(ids).toEqual([1, 2, 3])
    expect(new Set(ids).size).toBe(ids.length)
  })

  // Scenario 20
  it('persists deletions as well as additions', () => {
    const first = new TaskManager()
    first.addTask('Doomed', 'low')
    first.addTask('Kept', 'low')
    first.deleteTask(1)

    const reloaded = new TaskManager()

    expect(reloaded.getTasks().map(task => task.text)).toEqual(['Kept'])
  })

  // Scenario 21
  it('starts empty when storage holds nothing', () => {
    const manager = new TaskManager()

    expect(manager.getTasks()).toEqual([])
    expect(manager.getCompletedCount()).toBe(0)
  })
})
