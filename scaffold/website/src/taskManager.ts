import { t } from './i18n'
import { Task, TaskFilter } from './types'

/** The `localStorage` key the task list is persisted under. */
const STORAGE_KEY = 'tasks'

/** The three priorities a stored entry is allowed to declare. */
const PRIORITIES: readonly string[] = ['low', 'medium', 'high']

export class TaskManager {
  private tasks: Task[] = []
  private filter: TaskFilter = 'all'
  private nextId = 1

  /**
   * Catalogue key of the storage problem the user still needs to see, or `null` when storage
   * is healthy. A key rather than a sentence, so that switching language repaints the notice
   * in the new one.
   */
  private storageNoticeKey: string | null = null

  constructor() {
    this.loadFromStorage()
  }

  /**
   * Records a new task at the end of the list, persists it and repaints.
   *
   * The task is kept in memory even when the write is refused; the notice raised by
   * {@link saveToStorage} is what tells the user the two no longer agree.
   *
   * @param text - the description the user typed, stored and displayed verbatim.
   * @param priority - how urgent the task is; drives the colour of its badge.
   */
  addTask(text: string, priority: 'low' | 'medium' | 'high'): void {
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
   * Flips a task between done and not done.
   *
   * An id that matches nothing is ignored rather than treated as an error: the id may name a
   * task another tab has already deleted.
   *
   * @param id - the id of the task to flip.
   */
  toggleTask(id: number): void {
    const task = this.tasks.find(candidate => candidate.id === id)
    if (task) {
      task.completed = !task.completed
      this.saveToStorage()
      this.render()
    }
  }

  /**
   * Drops a task from the list for good.
   *
   * This is the destructive path that makes id validation matter: it removes *every* task
   * carrying the id, so two tasks sharing one would disappear together. Duplicates are
   * therefore rejected on restore, before they can ever reach this method.
   *
   * @param id - the id of the task to remove.
   */
  deleteTask(id: number): void {
    this.tasks = this.tasks.filter(task => task.id !== id)
    this.saveToStorage()
    this.render()
  }

  /**
   * Chooses which slice of the list is shown, and repaints.
   *
   * @param filter - `'all'`, `'active'` (not yet done) or `'completed'`.
   */
  setFilter(filter: TaskFilter): void {
    this.filter = filter
    this.render()
  }

  /**
   * Repaints the task list and the two counters from the current state.
   *
   * Returns without touching anything when the page has no `#tasks` element — the manager is
   * usable outside the full page, and a missing list is not an error.
   */
  render(): void {
    const taskList = document.getElementById('tasks')
    if (!taskList) return

    taskList.innerHTML = ''

    if (this.storageNoticeKey) {
      taskList.appendChild(this.buildNoticeRow(t(this.storageNoticeKey)))
    }

    for (const task of this.filterTasks()) {
      taskList.appendChild(this.buildTaskRow(task))
    }

    this.updateStats()
  }

  /**
   * Applies the active filter to the list.
   *
   * @returns the tasks the current filter lets through, in insertion order.
   */
  private filterTasks(): Task[] {
    if (this.filter === 'active') return this.tasks.filter(task => !task.completed)
    if (this.filter === 'completed') return this.tasks.filter(task => task.completed)
    return this.tasks
  }

  /**
   * Builds the row for one task, listeners included.
   *
   * @param task - the task to draw.
   * @returns a detached `<li>` ready to be appended to the list.
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
    // textContent, never innerHTML: the task text is user input and must never be parsed
    // as markup.
    text.textContent = task.text

    const badge = document.createElement('span')
    // The class keeps the raw priority — it drives the colour and must not move with the
    // language. The label is a catalogue string: `badge.*` is the short chip, distinct from
    // `priority.*`, which holds the longer `<select>` wording ("Low Priority").
    badge.className = `priority-badge priority-${task.priority}`
    badge.textContent = t(`badge.${task.priority}`)

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
   * Builds the row that carries a storage problem to the user.
   *
   * It is a list item so it can sit at the top of the task list, where the user is already
   * looking; `styles.css` gives `.app-notice` the background and padding that make it read as
   * a message rather than as stray text in a bulletless list.
   *
   * @param message - the already-translated sentence to show.
   * @returns a detached `<li>` ready to be appended to the list.
   */
  private buildNoticeRow(message: string): HTMLLIElement {
    const notice = document.createElement('li')
    notice.className = 'app-notice app-notice--error'
    notice.setAttribute('role', 'alert')
    notice.textContent = message
    return notice
  }

  /** Writes the total and completed counts into the two `<span>` counters on the page. */
  private updateStats(): void {
    const totalCount = document.getElementById('total-count')
    const completedCount = document.getElementById('completed-count')

    if (totalCount) totalCount.textContent = String(this.tasks.length)
    if (completedCount) {
      completedCount.textContent = String(this.tasks.filter(task => task.completed).length)
    }
  }

  /**
   * Hands out an id that no task currently holds.
   *
   * Deliberately not `Math.max(...ids) + 1`: a stored `Number.MAX_SAFE_INTEGER` passes every
   * validation, and `max + 1` then leaves the safe range, after which the counter stops
   * incrementing and every later task receives the same id. Allocating against the ids in use,
   * and wrapping back to 1 at the edge, has no such saturation point.
   *
   * @returns a safe positive integer that is free right now.
   */
  private allocateId(): number {
    const used = new Set(this.tasks.map(task => task.id))
    let candidate = Number.isSafeInteger(this.nextId) && this.nextId > 0 ? this.nextId : 1
    while (used.has(candidate)) {
      candidate = Number.isSafeInteger(candidate + 1) ? candidate + 1 : 1
    }
    this.nextId = Number.isSafeInteger(candidate + 1) ? candidate + 1 : 1
    return candidate
  }

  /**
   * Persists the list, and raises a visible notice if the browser refuses the write.
   *
   * `localStorage.setItem` throws on a full quota and in Safari's private mode. Left
   * unguarded it escapes between the push and the repaint, so the task sits in memory, the
   * page never updates and storage stays empty — three states disagreeing with nothing said.
   * A successful write clears the notice, because a notice that cannot clear teaches the user
   * to ignore it.
   *
   * @returns `true` when the list reached storage.
   */
  private saveToStorage(): boolean {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks))
      this.storageNoticeKey = null
      return true
    } catch {
      this.storageNoticeKey = 'error.storage.write'
      return false
    }
  }

  /**
   * Restores the list from storage, discarding anything that is not a valid task.
   *
   * Never throws: unreadable JSON, a payload that is not an array, an entry that fails
   * validation and an entry whose id is already taken are all dropped, and any drop raises the
   * notice {@link render} paints above the rows.
   */
  // TODO: migrate to API backend
  private loadFromStorage(): void {
    let stored: string | null
    try {
      stored = localStorage.getItem(STORAGE_KEY)
    } catch {
      this.storageNoticeKey = 'error.storage.read'
      return
    }
    if (!stored) return

    let parsed: unknown
    try {
      parsed = JSON.parse(stored)
    } catch {
      this.storageNoticeKey = 'error.storage.read'
      return
    }
    if (!Array.isArray(parsed)) {
      this.storageNoticeKey = 'error.storage.read'
      return
    }

    const restored: Task[] = []
    const seen = new Set<number>()
    let discarded = false

    for (const candidate of parsed) {
      const task = TaskManager.parseStoredTask(candidate)
      if (!task || seen.has(task.id)) {
        discarded = true
        continue
      }
      seen.add(task.id)
      restored.push(task)
    }

    this.tasks = restored
    this.nextId = 1
    if (discarded) this.storageNoticeKey = 'error.storage.read'
  }

  /**
   * Turns one stored entry into a task, or rejects it.
   *
   * Every field the `Task` interface declares is checked, `createdAt` included: JSON turns a
   * `Date` into a string on the way out, so a guard written `value is Task` that skipped it
   * would hand the compiler a type it does not have. This returns a freshly built task
   * instead, with `createdAt` rebuilt as a real `Date`.
   *
   * `id` gets the strictest check because it is the key every destructive action is routed
   * through: it must be a safe positive integer.
   *
   * @param value - anything that came back out of storage.
   * @returns the task, or `null` when the entry cannot be trusted.
   */
  private static parseStoredTask(value: unknown): Task | null {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
    const raw = value as Record<string, unknown>

    const id = raw.id
    if (typeof id !== 'number' || !Number.isSafeInteger(id) || id <= 0) return null

    const text = raw.text
    if (typeof text !== 'string') return null

    const priority = raw.priority
    if (typeof priority !== 'string' || !PRIORITIES.includes(priority)) return null

    const completed = raw.completed
    if (typeof completed !== 'boolean') return null

    const rawDate = raw.createdAt
    const createdAt =
      rawDate instanceof Date
        ? rawDate
        : typeof rawDate === 'string' || typeof rawDate === 'number'
          ? new Date(rawDate)
          : null
    if (!createdAt || Number.isNaN(createdAt.getTime())) return null

    return { id, text, priority: priority as Task['priority'], completed, createdAt }
  }

  /**
   * Exposes the list itself, unfiltered and in insertion order.
   *
   * @returns the live array of tasks.
   */
  getTasks(): Task[] {
    return this.tasks
  }

  /**
   * Counts the tasks already ticked off, whatever filter is showing.
   *
   * @returns how many tasks are completed.
   */
  getCompletedCount(): number {
    return this.tasks.filter(task => task.completed).length
  }
}
