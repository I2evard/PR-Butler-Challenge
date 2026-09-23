import { Task, TaskFilter } from './types'
import { t } from './i18n'

/**
 * Narrows a value decoded from storage to a {@link Task}.
 *
 * `createdAt` is deliberately not checked: `JSON.parse` returns it as a string,
 * so demanding a `Date` here would discard every task on the first reload.
 *
 * @param value - Arbitrary decoded value.
 * @returns `true` when the value carries the fields the app relies on.
 */
function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Partial<Task>
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.text === 'string' &&
    typeof candidate.completed === 'boolean' &&
    (candidate.priority === 'low' ||
      candidate.priority === 'medium' ||
      candidate.priority === 'high')
  )
}

export class TaskManager {
  private tasks: Task[] = []
  private filter: TaskFilter = 'all'
  private nextId = 1

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Records a new task, persists it and repaints the list.
   *
   * The task starts active and receives the next free identifier.
   *
   * @param text - What the user typed; stored and displayed verbatim.
   * @param priority - Urgency band driving the colour of the badge.
   */
  addTask(text: string, priority: 'low' | 'medium' | 'high') {
    const task: Task = {
      id: this.nextId++,
      text,
      priority,
      completed: false,
      createdAt: new Date()
    }
    this.tasks.push(task)
    this.saveToStorage()
    this.render()
  }

  /**
   * Flips a task between active and completed.
   *
   * An unknown identifier is ignored rather than treated as an error, so a
   * stale click on a row that was just deleted cannot break the page.
   *
   * @param id - Identifier of the task to flip.
   */
  toggleTask(id: number) {
    const task = this.tasks.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      this.saveToStorage()
      this.render()
    }
  }

  /**
   * Drops a task for good and repaints the list.
   *
   * @param id - Identifier of the task to remove; unknown ids are a no-op.
   */
  deleteTask(id: number) {
    this.tasks = this.tasks.filter(t => t.id !== id)
    this.saveToStorage()
    this.render()
  }

  /**
   * Chooses which subset of the tasks the list shows.
   *
   * The filter is a view concern only — nothing is stored or discarded.
   *
   * @param filter - `'all'`, `'active'` or `'completed'`.
   */
  setFilter(filter: TaskFilter) {
    this.filter = filter
    this.render()
  }

  /**
   * Paints the current view of the task list into the page.
   *
   * Does nothing when the host element is absent, which is what lets the class
   * be driven headlessly. Labels are resolved at paint time, so a language
   * change only needs a repaint.
   */
  render() {
    const taskList = document.getElementById('tasks')
    if (!taskList) return

    taskList.innerHTML = ''
    this.filterTasks().forEach(task => taskList.appendChild(this.buildTaskRow(task)))

    this.updateStats()
  }

  /**
   * Applies the active filter to the stored tasks.
   *
   * @returns The tasks the current view should show, in insertion order.
   */
  private filterTasks(): Task[] {
    if (this.filter === 'active') return this.tasks.filter(t => !t.completed)
    if (this.filter === 'completed') return this.tasks.filter(t => t.completed)
    return this.tasks
  }

  /**
   * Builds the row for one task, wired to its own toggle and delete actions.
   *
   * @param task - The task to render.
   * @returns A detached list item ready to append.
   */
  private buildTaskRow(task: Task): HTMLLIElement {
    const li = document.createElement('li')
    li.className = `task-item ${task.completed ? 'completed' : ''}`

    const content = document.createElement('div')
    content.className = 'task-content'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'task-checkbox'
    checkbox.checked = task.completed
    checkbox.addEventListener('change', () => this.toggleTask(task.id))

    const text = document.createElement('span')
    text.className = 'task-text'
    text.textContent = task.text

    const badge = document.createElement('span')
    badge.className = `priority-badge priority-${task.priority}`
    badge.textContent = task.priority.toUpperCase()

    content.appendChild(checkbox)
    content.appendChild(text)
    content.appendChild(badge)

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'delete-btn'
    deleteBtn.textContent = t('button.delete')
    deleteBtn.addEventListener('click', () => this.deleteTask(task.id))

    li.appendChild(content)
    li.appendChild(deleteBtn)

    return li
  }

  /** Refreshes the total and completed counters beside the list. */
  private updateStats() {
    const totalCount = document.getElementById('total-count')
    const completedCount = document.getElementById('completed-count')

    if (totalCount) totalCount.textContent = String(this.tasks.length)
    if (completedCount) {
      completedCount.textContent = String(this.tasks.filter(t => t.completed).length)
    }
  }

  /** Writes the task list to `localStorage` under the `tasks` key. */
  private saveToStorage() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks))
  }

  /**
   * Restores the task list from `localStorage`, tolerating corruption.
   *
   * Anything that is not valid JSON, not an array, or not shaped like a task is
   * discarded: this runs from the constructor, so throwing here would take the
   * whole page down and leave the user with a blank screen and no explanation.
   */
  private loadFromStorage() {
    // TODO: migrate to API backend
    const stored = localStorage.getItem('tasks')
    if (!stored) return

    let parsed: unknown
    try {
      parsed = JSON.parse(stored)
    } catch {
      return
    }

    if (!Array.isArray(parsed)) return

    this.tasks = parsed.filter(isTask)
    this.nextId = Math.max(...this.tasks.map(t => t.id), 0) + 1
  }

  /**
   * Exposes the stored tasks, unfiltered.
   *
   * @returns The live task array, in insertion order.
   */
  getTasks() {
    return this.tasks
  }

  /**
   * Counts the tasks currently marked completed.
   *
   * @returns How many tasks are done, ignoring the active filter.
   */
  getCompletedCount() {
    return this.tasks.filter(t => t.completed).length
  }
}
