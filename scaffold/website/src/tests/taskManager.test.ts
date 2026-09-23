/**
 * SCENARIOS — TaskManager
 *
 *  1. Adding a task puts it in the list (pre-existing case, kept)
 *  2. A brand new list reports zero completed tasks (pre-existing case, kept)
 *  3. An added task keeps the text and priority it was given, and starts out active
 *  4. Identifiers are handed out by the manager and never repeat
 *  5. Toggling a task marks it completed; toggling again makes it active
 *  6. Toggling an identifier nobody owns changes nothing
 *  7. Deleting a task removes that task and only that one
 *  8. Deleting an identifier nobody owns leaves the list as it was
 *  9. Rendering without the host element on the page does not blow up
 * 10. Rendering produces one row per task, carrying its text and its priority badge
 * 11. A completed task's row is flagged as completed, an active one is not
 * 12. The counters show the total and the completed count
 * 13. The "active" filter shows only unfinished tasks
 * 14. The "completed" filter shows only finished tasks
 * 15. The "all" filter shows everything again
 * 16. Filtering hides rows without removing tasks from the list
 * 17. Ticking a row's checkbox completes that task
 * 18. Clicking a row's delete button removes that task
 * 19. Markup typed into a task is displayed as text, never interpreted (XSS)
 * 20. A new manager finds back the tasks the previous one added
 * 21. After a reload, new tasks do not reuse an identifier already taken
 * 22. A deletion survives a reload
 * 23. A toggle survives a reload
 * 24. Stored data that is not valid JSON leaves the app with an empty list
 * 25. Stored data that is valid JSON but not a list leaves the app with an empty list
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

/** The rows currently on screen. */
function renderedRows(): HTMLLIElement[] {
  return Array.from(document.querySelectorAll<HTMLLIElement>('#tasks > li'))
}

/** The task texts currently on screen, in display order. */
function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#tasks .task-text')).map(
    element => element.textContent ?? ''
  )
}

describe('TaskManager', () => {
  let manager: TaskManager

  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
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

  describe('addTask', () => {
    it('keeps the text and priority it was given and starts the task as active', () => {
      manager.addTask('Write the report', 'high')

      const [task] = manager.getTasks()
      expect(task.text).toBe('Write the report')
      expect(task.priority).toBe('high')
      expect(task.completed).toBe(false)
    })

    it('hands out a distinct identifier to every task', () => {
      manager.addTask('First', 'low')
      manager.addTask('Second', 'medium')
      manager.addTask('Third', 'high')

      const ids = manager.getTasks().map(task => task.id)
      expect(new Set(ids).size).toBe(3)
    })
  })

  describe('toggleTask', () => {
    it('marks an active task completed', () => {
      manager.addTask('Task 1', 'low')
      const [task] = manager.getTasks()

      manager.toggleTask(task.id)

      expect(manager.getTasks()[0].completed).toBe(true)
      expect(manager.getCompletedCount()).toBe(1)
    })

    it('makes a completed task active again when toggled twice', () => {
      manager.addTask('Task 1', 'low')
      const [task] = manager.getTasks()

      manager.toggleTask(task.id)
      manager.toggleTask(task.id)

      expect(manager.getTasks()[0].completed).toBe(false)
      expect(manager.getCompletedCount()).toBe(0)
    })

    it('leaves every task untouched when the identifier is unknown', () => {
      manager.addTask('Task 1', 'low')
      manager.addTask('Task 2', 'low')

      manager.toggleTask(9999)

      expect(manager.getTasks().map(task => task.completed)).toEqual([false, false])
    })
  })

  describe('deleteTask', () => {
    it('removes the targeted task and keeps the others', () => {
      manager.addTask('Keep me', 'low')
      manager.addTask('Delete me', 'high')
      manager.addTask('Keep me too', 'medium')
      const target = manager.getTasks()[1]

      manager.deleteTask(target.id)

      expect(manager.getTasks().map(task => task.text)).toEqual(['Keep me', 'Keep me too'])
    })

    it('leaves the list as it was when the identifier is unknown', () => {
      manager.addTask('Task 1', 'low')
      manager.addTask('Task 2', 'low')

      manager.deleteTask(9999)

      expect(manager.getTasks().map(task => task.text)).toEqual(['Task 1', 'Task 2'])
    })
  })

  describe('render', () => {
    beforeEach(() => {
      mountTaskDom()
    })

    it('does nothing and does not throw when the list element is missing', () => {
      document.body.innerHTML = '<div id="somewhere-else"></div>'
      manager.addTask('Task 1', 'low')

      expect(() => manager.render()).not.toThrow()
      expect(manager.getTasks()).toHaveLength(1)
    })

    it('draws one row per task, with its text and its priority badge', () => {
      manager.addTask('Buy milk', 'high')
      manager.addTask('Call Ana', 'low')

      const rows = renderedRows()
      expect(rows).toHaveLength(2)
      expect(renderedTexts()).toEqual(['Buy milk', 'Call Ana'])

      const badges = Array.from(document.querySelectorAll<HTMLElement>('.priority-badge'))
      expect(badges.map(badge => badge.textContent)).toEqual(['HIGH', 'LOW'])
      expect(badges[0].className).toContain('priority-high')
      expect(badges[1].className).toContain('priority-low')
    })

    it('gives every row a checkbox and a delete button', () => {
      manager.addTask('Buy milk', 'medium')

      const [row] = renderedRows()
      const checkbox = row.querySelector<HTMLInputElement>('.task-checkbox')
      expect(checkbox?.type).toBe('checkbox')
      expect(checkbox?.checked).toBe(false)
      expect(row.querySelector('.delete-btn')?.textContent).toBeTruthy()
    })

    it('flags the row of a completed task and not the row of an active one', () => {
      manager.addTask('Done', 'low')
      manager.addTask('Still to do', 'low')
      manager.toggleTask(manager.getTasks()[0].id)

      const rows = renderedRows()
      expect(rows[0].className).toContain('completed')
      expect(rows[0].querySelector<HTMLInputElement>('.task-checkbox')?.checked).toBe(true)
      expect(rows[1].className).not.toContain('completed')
    })

    it('shows the total and the completed count', () => {
      manager.addTask('Task 1', 'low')
      manager.addTask('Task 2', 'low')
      manager.addTask('Task 3', 'low')
      manager.toggleTask(manager.getTasks()[1].id)

      expect(document.getElementById('total-count')?.textContent).toBe('3')
      expect(document.getElementById('completed-count')?.textContent).toBe('1')
    })

    it('empties the list on screen when the last task is deleted', () => {
      manager.addTask('Only one', 'low')
      manager.deleteTask(manager.getTasks()[0].id)

      expect(renderedRows()).toHaveLength(0)
      expect(document.getElementById('total-count')?.textContent).toBe('0')
    })

    it('completes a task when its checkbox is ticked', () => {
      manager.addTask('Buy milk', 'low')

      renderedRows()[0].querySelector<HTMLInputElement>('.task-checkbox')?.click()

      expect(manager.getTasks()[0].completed).toBe(true)
      expect(renderedRows()[0].className).toContain('completed')
    })

    it('removes a task when its delete button is clicked', () => {
      manager.addTask('Buy milk', 'low')
      manager.addTask('Call Ana', 'low')

      renderedRows()[0].querySelector<HTMLButtonElement>('.delete-btn')?.click()

      expect(manager.getTasks().map(task => task.text)).toEqual(['Call Ana'])
      expect(renderedTexts()).toEqual(['Call Ana'])
    })

    it('displays markup in a task as plain text instead of interpreting it', () => {
      const payload = '<img src=x onerror="window.pwned = true"><b>bold</b>'
      manager.addTask(payload, 'low')

      const list = document.getElementById('tasks')
      expect(list?.querySelector('img')).toBeNull()
      expect(list?.querySelector('b')).toBeNull()
      expect(renderedTexts()).toEqual([payload])
      expect((window as unknown as { pwned?: boolean }).pwned).toBeUndefined()
    })
  })

  describe('setFilter', () => {
    beforeEach(() => {
      mountTaskDom()
      manager.addTask('Active one', 'low')
      manager.addTask('Finished one', 'high')
      manager.toggleTask(manager.getTasks()[1].id)
    })

    it('shows only unfinished tasks under the active filter', () => {
      manager.setFilter('active')
      expect(renderedTexts()).toEqual(['Active one'])
    })

    it('shows only finished tasks under the completed filter', () => {
      manager.setFilter('completed')
      expect(renderedTexts()).toEqual(['Finished one'])
    })

    it('shows every task again under the all filter', () => {
      manager.setFilter('completed')
      manager.setFilter('all')
      expect(renderedTexts()).toEqual(['Active one', 'Finished one'])
    })

    it('hides rows without removing tasks or changing the counters', () => {
      manager.setFilter('active')

      expect(manager.getTasks()).toHaveLength(2)
      expect(document.getElementById('total-count')?.textContent).toBe('2')
      expect(document.getElementById('completed-count')?.textContent).toBe('1')
    })
  })

  describe('persistence', () => {
    it('finds back the tasks a previous manager added', () => {
      manager.addTask('Survive the reload', 'high')

      const reloaded = new TaskManager()

      expect(reloaded.getTasks()).toHaveLength(1)
      expect(reloaded.getTasks()[0].text).toBe('Survive the reload')
      expect(reloaded.getTasks()[0].priority).toBe('high')
      expect(reloaded.getTasks()[0].completed).toBe(false)
    })

    it('does not reuse an identifier already taken before the reload', () => {
      manager.addTask('First', 'low')
      manager.addTask('Second', 'low')
      const takenIds = manager.getTasks().map(task => task.id)

      const reloaded = new TaskManager()
      reloaded.addTask('Third', 'low')

      const newId = reloaded.getTasks()[2].id
      expect(takenIds).not.toContain(newId)
    })

    it('keeps a deletion across a reload', () => {
      manager.addTask('Keep me', 'low')
      manager.addTask('Delete me', 'low')
      manager.deleteTask(manager.getTasks()[1].id)

      expect(new TaskManager().getTasks().map(task => task.text)).toEqual(['Keep me'])
    })

    it('keeps a toggle across a reload', () => {
      manager.addTask('Task 1', 'low')
      manager.toggleTask(manager.getTasks()[0].id)

      expect(new TaskManager().getCompletedCount()).toBe(1)
    })

    it('starts empty when nothing was ever stored', () => {
      expect(new TaskManager().getTasks()).toEqual([])
    })
  })

  describe('recovering from unusable stored data', () => {
    beforeEach(() => {
      // The recovery path reports on the console; silence it, the assertions are on state.
      vi.spyOn(console, 'error').mockImplementation(() => undefined)
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it('starts with an empty list when the stored value is not valid JSON', () => {
      localStorage.setItem('tasks', '{not json at all')

      const recovered = new TaskManager()

      expect(recovered.getTasks()).toEqual([])
      expect(recovered.getCompletedCount()).toBe(0)
    })

    it('starts with an empty list when the stored value is JSON but not a list', () => {
      localStorage.setItem('tasks', '{"tasks":"nope"}')

      expect(new TaskManager().getTasks()).toEqual([])
    })

    it('keeps working after recovering, and the next task gets identifier 1', () => {
      localStorage.setItem('tasks', 'still not json')
      mountTaskDom()

      const recovered = new TaskManager()
      recovered.addTask('A fresh start', 'low')

      expect(recovered.getTasks()).toHaveLength(1)
      expect(recovered.getTasks()[0].id).toBe(1)
      expect(renderedTexts()).toEqual(['A fresh start'])
    })
  })
})
