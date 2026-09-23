import { Task, TaskFilter } from './types'
import { t } from './i18n'

export class TaskManager {
  private tasks: Task[] = []
  private filter: TaskFilter = 'all'
  private nextId = 1

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Records a new task, persists it, and repaints the list.
   *
   * The task is appended, so the list reads oldest-first; it starts incomplete and
   * receives the next sequential id. The caller is responsible for rejecting blank
   * input — an empty string is stored as given.
   *
   * @param text Task description, shown verbatim and never parsed as HTML.
   * @param priority Urgency band driving the badge and its colour.
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
   * Flips a task between done and not done, then persists and repaints.
   *
   * An id that matches nothing is ignored rather than treated as an error, because
   * the handler can fire against a row that was deleted in another tab.
   *
   * @param id Identifier of the task to flip.
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
   * Discards a task permanently, then persists and repaints.
   *
   * There is no undo and no confirmation step — the caller owns that decision.
   * Ids are never reused, so a deleted id stays absent.
   *
   * @param id Identifier of the task to remove; unknown ids are a no-op.
   */
  deleteTask(id: number) {
    this.tasks = this.tasks.filter(t => t.id !== id)
    this.saveToStorage()
    this.render()
  }

  /**
   * Narrows which tasks the list shows, then repaints.
   *
   * This is a view concern only: nothing is deleted and the counters keep reporting
   * across all tasks, not just the visible ones. The choice is not persisted, so a
   * reload returns to `'all'`.
   *
   * @param filter `'all'`, `'active'` (not yet done) or `'completed'`.
   */
  setFilter(filter: TaskFilter) {
    this.filter = filter
    this.render()
  }

  /**
   * Redraws the whole task list and its counters from current state.
   *
   * Rebuilds `#tasks` from scratch on every call, wiring each row's checkbox and
   * Delete button to this instance. Task text is written with `textContent`, never
   * `innerHTML` — it is user input and must not be parsed as markup. Returns
   * silently when `#tasks` is absent, so it is safe to call before the DOM exists.
   */
  // Long function that should be refactored
  render() {
    const taskList = document.getElementById('tasks')
    if (!taskList) return

    let filteredTasks = this.tasks
    if (this.filter === 'active') {
      filteredTasks = this.tasks.filter(t => !t.completed)
    } else if (this.filter === 'completed') {
      filteredTasks = this.tasks.filter(t => t.completed)
    }

    taskList.innerHTML = ''

    filteredTasks.forEach(task => {
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
      taskList.appendChild(li)
    })

    this.updateStats()
  }

  /**
   * Refreshes the total and completed counters in the page header.
   *
   * Counts across all tasks rather than the filtered view, so the totals stay
   * stable while the user switches filters. Missing counter elements are tolerated.
   */
  private updateStats() {
    const totalCount = document.getElementById('total-count')
    const completedCount = document.getElementById('completed-count')

    if (totalCount) totalCount.textContent = String(this.tasks.length)
    if (completedCount) {
      completedCount.textContent = String(this.tasks.filter(t => t.completed).length)
    }
  }

  /**
   * Writes the task set to `localStorage` under the `tasks` key.
   *
   * Called after every mutation, so the stored copy is the source of truth on the
   * next visit. `Date` fields serialise to strings and come back as strings.
   */
  private saveToStorage() {
    localStorage.setItem('tasks', JSON.stringify(this.tasks))
  }

  /**
   * Restores the task set from `localStorage` during construction.
   *
   * Also advances the id counter past the highest restored id so a new task cannot
   * collide with one that came back from storage. Absent or unparseable data leaves
   * the manager empty.
   */
  private loadFromStorage() {
    // TODO: migrate to API backend - endpoint: https://api.internal/tasks
    const stored = localStorage.getItem('tasks')
    if (stored) {
      this.tasks = JSON.parse(stored)
      this.nextId = Math.max(...this.tasks.map(t => t.id), 0) + 1
    }
  }

  /**
   * Exposes the full task set, ignoring the active filter.
   *
   * Returns the live internal array rather than a copy, so callers must not mutate
   * it — changes made through it bypass persistence and the repaint.
   *
   * @returns Every task held, in insertion order.
   */
  getTasks() {
    return this.tasks
  }

  /**
   * Counts how many tasks are done, ignoring the active filter.
   *
   * @returns Number of tasks whose `completed` flag is set.
   */
  getCompletedCount() {
    return this.tasks.filter(t => t.completed).length
  }
}
