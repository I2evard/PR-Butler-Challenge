import { Task, TaskFilter } from './types'
import { t } from './i18n'

const STORAGE_KEY = 'tasks'

/** Shown in the task list when saved data could not be restored faithfully. */
const DISCARD_NOTICE = 'Some saved tasks could not be read and were discarded.'

/**
 * Turns an unknown value read back from storage into a `Date`, or rejects it.
 *
 * `JSON.stringify` writes a `Date` out as an ISO string, so what comes back is never a
 * `Date` — reviving it is the difference between a `Task` and something that only looks
 * like one to the compiler.
 *
 * @param value whatever sat in the `createdAt` slot
 * @returns a valid `Date`, or `null` when the value cannot be one
 */
function reviveDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Turns one entry read back from storage into a `Task`, or rejects it.
 *
 * Every field the `Task` interface declares is checked, because a guard that skips one
 * tells the compiler a lie it believes for the rest of the file. `id` gets the strictest
 * treatment: it is the key `deleteTask` and `toggleTask` route through, so a duplicate
 * or an unsafe value there is not a cosmetic problem — one click would delete two rows,
 * and an id beyond `Number.MAX_SAFE_INTEGER` stops incrementing.
 *
 * @param value one element of the array found in storage
 * @returns the restored task, or `null` when the entry does not describe one
 */
function reviveTask(value: unknown): Task | null {
  if (typeof value !== 'object' || value === null) {
    return null
  }
  const candidate = value as Record<string, unknown>

  const id = candidate.id
  if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) {
    return null
  }

  const text = candidate.text
  if (typeof text !== 'string') {
    return null
  }

  const priority = candidate.priority
  if (typeof priority !== 'string') {
    return null
  }
  if (priority !== 'low' && priority !== 'medium' && priority !== 'high') {
    return null
  }

  const completed = candidate.completed
  if (typeof completed !== 'boolean') {
    return null
  }

  const createdAt = reviveDate(candidate.createdAt)
  if (!createdAt) {
    return null
  }

  return { id, text, priority, completed, createdAt }
}

/**
 * Owns the task list: the in-memory state, its mirror in `localStorage`, and the
 * rendering of both into the page.
 */
export class TaskManager {
  private tasks: Task[] = []
  private filter: TaskFilter = 'all'
  private nextId = 1
  private storageDiscarded = false

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Records a new task, persists the list and repaints it.
   *
   * The id is allocated rather than incremented, so a list restored with an id near
   * `Number.MAX_SAFE_INTEGER` cannot hand out the same id twice.
   *
   * @param text what the user typed; stored and rendered verbatim, never as markup
   * @param priority the badge the row will carry
   */
  addTask(text: string, priority: 'low' | 'medium' | 'high') {
    const task: Task = {
      id: this.allocateId(),
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
   * Flips a task between done and not done, and persists the change.
   *
   * An id nobody owns is a no-op rather than an error: the call comes from a checkbox
   * in a list the user may have filtered underneath it.
   *
   * @param id id of the task to flip
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
   * Drops a task for good and persists the shorter list.
   *
   * @param id id of the task to drop; unknown ids leave the list untouched
   */
  deleteTask(id: number) {
    this.tasks = this.tasks.filter(t => t.id !== id)
    this.saveToStorage()
    this.render()
  }

  /**
   * Chooses which slice of the list the page shows, and repaints it.
   *
   * The filter is a view concern only — nothing is removed, and the choice is not
   * persisted, so a reload comes back showing everything.
   *
   * @param filter which slice to show
   */
  setFilter(filter: TaskFilter) {
    this.filter = filter
    this.render()
  }

  /**
   * Repaints the task list and the counters from the current state.
   *
   * Returns without touching anything when the page has no `#tasks` list, which is what
   * lets the class be exercised outside the real page.
   */
  render() {
    const taskList = document.getElementById('tasks')
    if (!taskList) return

    taskList.replaceChildren()

    if (this.storageDiscarded) {
      taskList.appendChild(this.buildStorageNotice())
    }

    for (const task of this.filterTasks()) {
      taskList.appendChild(this.buildTaskRow(task))
    }

    this.updateStats()
  }

  /**
   * Reads back every task currently held.
   *
   * @returns the live array — callers read it, they do not own it
   */
  getTasks() {
    return this.tasks
  }

  /**
   * Counts the tasks marked done, whatever filter the page is showing.
   *
   * @returns how many tasks are completed
   */
  getCompletedCount() {
    return this.tasks.filter(t => t.completed).length
  }

  /**
   * The slice of the list the active filter selects.
   *
   * @returns the tasks to render, in insertion order
   */
  private filterTasks(): Task[] {
    if (this.filter === 'active') {
      return this.tasks.filter(t => !t.completed)
    }
    if (this.filter === 'completed') {
      return this.tasks.filter(t => t.completed)
    }
    return this.tasks
  }

  /**
   * Builds one row of the task list, wired to the task it shows.
   *
   * @param task the task to render
   * @returns the `<li>` to append, with its checkbox and delete button already bound
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
    // textContent, never innerHTML: the task text is user input, and there is no case
    // in this app where it should be parsed as markup.
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
   * Builds the line that tells the user saved data was thrown away.
   *
   * Silently dropping unreadable tasks would leave the page looking exactly like a
   * successful load, which is the failure this notice exists to make visible.
   *
   * @returns the `<li>` to show at the top of the list
   */
  private buildStorageNotice(): HTMLLIElement {
    const notice = document.createElement('li')
    notice.className = 'storage-notice'
    notice.textContent = DISCARD_NOTICE
    return notice
  }

  /**
   * Hands out an id that no task currently holds.
   *
   * `max + 1` is not enough: a restored id of `Number.MAX_SAFE_INTEGER` makes it
   * unsafe, and an unsafe counter stops incrementing — every later task would get the
   * same id and the collisions would arrive on their own.
   *
   * @returns a safe positive integer, unused by any current task
   */
  private allocateId(): number {
    const used = new Set(this.tasks.map(t => t.id))
    let candidate = Number.isSafeInteger(this.nextId) && this.nextId > 0 ? this.nextId : 1
    while (used.has(candidate)) {
      candidate = Number.isSafeInteger(candidate + 1) ? candidate + 1 : 1
    }
    this.nextId = Number.isSafeInteger(candidate + 1) ? candidate + 1 : 1
    return candidate
  }

  /** Writes the current counters into the page, when the page has somewhere to put them. */
  private updateStats() {
    const totalCount = document.getElementById('total-count')
    const completedCount = document.getElementById('completed-count')

    if (totalCount) totalCount.textContent = String(this.tasks.length)
    if (completedCount) {
      completedCount.textContent = String(this.tasks.filter(t => t.completed).length)
    }
  }

  /** Mirrors the current list into `localStorage`. */
  private saveToStorage() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks))
  }

  /**
   * Restores the list from `localStorage`, keeping only what really describes a task.
   *
   * Nothing here throws. Corrupt or foreign data used to escape the constructor and
   * leave the user with a blank page and no explanation; now it is discarded, the fact
   * is remembered, and {@link render} says so on screen.
   */
  private loadFromStorage() {
    // TODO: migrate to API backend
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === null) return

    let parsed: unknown
    try {
      parsed = JSON.parse(stored)
    } catch {
      this.storageDiscarded = true
      return
    }

    if (!Array.isArray(parsed)) {
      this.storageDiscarded = true
      return
    }

    const restored: Task[] = []
    const seen = new Set<number>()
    for (const entry of parsed) {
      const task = reviveTask(entry)
      if (!task || seen.has(task.id)) {
        this.storageDiscarded = true
        continue
      }
      seen.add(task.id)
      restored.push(task)
    }

    this.tasks = restored
    // Computed only once the rejects and the duplicates are gone, so a discarded id
    // cannot drag the counter with it.
    this.nextId = restored.reduce((highest, task) => Math.max(highest, task.id), 0) + 1
  }
}
