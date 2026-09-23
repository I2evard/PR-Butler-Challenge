import { Task, TaskFilter } from './types'
import { t } from './i18n'

/** Priorities a stored task is allowed to carry. */
const PRIORITIES = ['low', 'medium', 'high'] as const

/**
 * Decides whether a value read back from storage is really a task.
 *
 * `JSON.parse` returns `any`, so without this every field is a lie the compiler cannot
 * catch. An array of arbitrary objects would sail through and only blow up later, in
 * `render()`, after the list has already been cleared on screen.
 *
 * Only the four fields the app actually renders are required. `createdAt` is not: it is
 * displayed nowhere, and discarding somebody's task over a missing timestamp would turn
 * a cosmetic gap into data loss. A missing one is filled in by {@link reviveTask}.
 *
 * @param value A single entry from the stored array.
 * @returns True when the fields the app relies on are present and of the right type.
 */
function isStoredTask(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const candidate = value as Record<string, unknown>

  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.text === 'string' &&
    typeof candidate.completed === 'boolean' &&
    typeof candidate.priority === 'string' &&
    (PRIORITIES as readonly string[]).includes(candidate.priority)
  )
}

/**
 * Turns a validated stored entry back into a real task.
 *
 * `JSON.stringify` writes a `Date` as a string and `JSON.parse` leaves it a string, so
 * without this step `createdAt` is typed `Date` and holds a `string` — a lie that only
 * surfaces on the second page load, never the first.
 *
 * An absent or unparseable `createdAt` becomes the current time rather than an
 * `Invalid Date`, so no caller ever receives a `Date` that throws on use.
 *
 * @param stored A value already accepted by {@link isStoredTask}.
 * @returns The task, with `createdAt` as a usable `Date`.
 */
function reviveTask(stored: ReturnType<typeof JSON.parse>): Task {
  const createdAt = new Date(stored.createdAt)
  return {
    ...stored,
    createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
  }
}

/**
 * Owns the task list: its state, its persistence and its rendering.
 *
 * State lives in memory and is mirrored to `localStorage` after every mutation, so a
 * reload restores the list. Every mutating method repaints, which keeps the DOM and
 * the in-memory list from drifting apart.
 */
export class TaskManager {
  private tasks: Task[] = []
  private filter: TaskFilter = 'all'
  private nextId = 1

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Appends a task to the list, persists it and repaints.
   *
   * The identifier is assigned here; callers never supply one. Text is stored exactly
   * as given and is escaped at render time, not on the way in.
   *
   * @param text Task description, as typed by the user.
   * @param priority Importance of the task.
   */
  addTask(text: string, priority: 'low' | 'medium' | 'high'): void {
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
   * Flips a task between completed and active.
   *
   * An unknown identifier is a no-op: nothing is persisted and nothing repaints, so a
   * stale click cannot corrupt the list.
   *
   * @param id Identifier of the task to toggle.
   */
  toggleTask(id: number): void {
    const task = this.tasks.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      this.saveToStorage()
      this.render()
    }
  }

  /**
   * Removes a task from the list, persists the removal and repaints.
   *
   * An unknown identifier leaves the list unchanged but still persists and repaints.
   *
   * @param id Identifier of the task to remove.
   */
  deleteTask(id: number): void {
    this.tasks = this.tasks.filter(t => t.id !== id)
    this.saveToStorage()
    this.render()
  }

  /**
   * Changes which tasks are shown, without touching the underlying list.
   *
   * The filter affects rendering only, so it is not persisted — a reload returns to
   * showing everything.
   *
   * @param filter Which subset to display.
   */
  setFilter(filter: TaskFilter): void {
    this.filter = filter
    this.render()
  }

  /**
   * Repaints the task list and the counters.
   *
   * Returns early when the host element is absent, which is what happens in a test
   * that has not built the DOM. Rebuilds the list from scratch rather than patching
   * it, so the display always matches the state.
   */
  render(): void {
    const taskList = document.getElementById('tasks')
    if (!taskList) return

    taskList.innerHTML = ''
    for (const task of this.getVisibleTasks()) {
      taskList.appendChild(this.createTaskElement(task))
    }

    this.updateStats()
  }

  /**
   * Returns the tasks the active filter allows through.
   *
   * @returns The visible subset, in insertion order.
   */
  private getVisibleTasks(): Task[] {
    if (this.filter === 'active') return this.tasks.filter(t => !t.completed)
    if (this.filter === 'completed') return this.tasks.filter(t => t.completed)
    return this.tasks
  }

  /**
   * Builds the list item for a single task, with its checkbox, label, badge and
   * delete button already wired to their handlers.
   *
   * @param task The task to render.
   * @returns A detached `<li>` ready to append.
   */
  private createTaskElement(task: Task): HTMLLIElement {
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
    // textContent, never innerHTML: task text is user input and must never be parsed as HTML.
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

  /**
   * Writes the total and completed counters into their elements, when present.
   */
  private updateStats(): void {
    const totalCount = document.getElementById('total-count')
    const completedCount = document.getElementById('completed-count')

    if (totalCount) totalCount.textContent = String(this.tasks.length)
    if (completedCount) {
      completedCount.textContent = String(this.getCompletedCount())
    }
  }

  /**
   * Mirrors the current list to `localStorage`.
   */
  private saveToStorage(): void {
    localStorage.setItem('tasks', JSON.stringify(this.tasks))
  }

  /**
   * Restores the list from `localStorage`, falling back to an empty list.
   *
   * Corrupt or foreign data must not take the app down on boot, so a parse failure is
   * reported and swallowed rather than thrown.
   */
  private loadFromStorage(): void {
    const stored = localStorage.getItem('tasks')
    if (!stored) return

    try {
      const parsed = JSON.parse(stored)
      if (!Array.isArray(parsed)) throw new TypeError('stored tasks is not an array')

      // Checking the array is not enough: an array of anything at all would get through
      // and only fail later, inside render(), after the list was already cleared on screen.
      // Entries that are not tasks are dropped; valid ones beside them are kept.
      this.tasks = parsed.filter(isStoredTask).map(reviveTask)
      this.nextId = Math.max(...this.tasks.map(t => t.id), 0) + 1
    } catch (error) {
      console.error('Could not read stored tasks, starting empty:', error)
      this.tasks = []
      this.nextId = 1
    }
  }

  /**
   * Returns the full task list, ignoring the active filter.
   *
   * A copy, not the live array. Handing out the internal array let a caller mutate the
   * list without going through {@link addTask} or {@link deleteTask}, so the change was
   * never persisted and memory silently drifted from `localStorage`.
   *
   * @returns A shallow copy of the task list.
   */
  getTasks(): Task[] {
    return [...this.tasks]
  }

  /**
   * Counts the completed tasks, ignoring the active filter.
   *
   * @returns How many tasks are marked completed.
   */
  getCompletedCount(): number {
    return this.tasks.filter(t => t.completed).length
  }
}
