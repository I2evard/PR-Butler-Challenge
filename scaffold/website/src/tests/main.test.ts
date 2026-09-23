/**
 * SCENARIOS — application bootstrap (main.ts)
 *
 * The module boots itself on load, so every scenario mounts the page markup first and
 * then imports the module, which is what the browser does with the <script> tag.
 *
 *  1. On load, the page is translated into the starting language
 *  2. On load, tasks left over from a previous visit are back on screen
 *  3. Submitting the form adds the typed task and shows it
 *  4. Submitting the form empties the input, ready for the next task
 *  5. Submitting blank or whitespace-only text adds nothing
 *  6. Submitting does not navigate away (the default submit is prevented)
 *  7. The chosen priority is the one carried by the new task
 *  8. Clicking the French button puts the interface in French
 *  9. Clicking the French button marks it as the active language and unmarks English
 * 10. Clicking English again brings the interface back to English
 * 11. Clicking a filter button shows only the matching tasks
 * 12. Clicking a filter button moves the active mark onto it
 * 13. Deleting from a rendered row removes the task and its row
 * 14. Loading the script on a page without the expected markup does not crash
 * 15. A failure while booting is reported instead of taking the page down silently
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/** The markup of index.html, as the browser hands it to the module. */
const APP_MARKUP = `
  <div class="container">
    <header>
      <h1 data-i18n="app.title">My Task Manager</h1>
      <div class="language-selector">
        <button id="lang-en" class="active">English</button>
        <button id="lang-fr">Français</button>
      </div>
    </header>
    <main>
      <section class="add-task">
        <h2 data-i18n="task.add">Add New Task</h2>
        <form id="task-form">
          <input type="text" id="task-input" data-i18n-placeholder="task.placeholder"
                 placeholder="Enter task description">
          <select id="priority-select">
            <option value="low" data-i18n="priority.low">Low Priority</option>
            <option value="medium" data-i18n="priority.medium">Medium Priority</option>
            <option value="high" data-i18n="priority.high">High Priority</option>
          </select>
          <button type="submit" data-i18n="button.add">Add Task</button>
        </form>
      </section>
      <section class="task-list">
        <div class="filter-buttons">
          <button class="filter-btn active" data-filter="all" data-i18n="filter.all">All Tasks</button>
          <button class="filter-btn" data-filter="active" data-i18n="filter.active">Active</button>
          <button class="filter-btn" data-filter="completed" data-i18n="filter.completed">Completed</button>
        </div>
        <ul id="tasks"></ul>
        <div class="stats">
          <span id="total-count">0</span>
          <span id="completed-count">0</span>
        </div>
      </section>
    </main>
  </div>
`

/** Puts the page on screen, exactly as index.html does. */
function mountAppDom(): void {
  document.body.innerHTML = APP_MARKUP
}

/** Loads the module, which boots the app, and waits for the boot to finish. */
async function bootApp(): Promise<void> {
  await import('../main')
  await new Promise(resolve => setTimeout(resolve, 0))
}

/** The task texts currently on screen, in display order. */
function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#tasks .task-text')).map(
    element => element.textContent ?? ''
  )
}

/** Fills the add-task form and submits it, as a user would. */
function submitTask(text: string, priority?: 'low' | 'medium' | 'high'): void {
  const input = document.getElementById('task-input') as HTMLInputElement
  const select = document.getElementById('priority-select') as HTMLSelectElement
  input.value = text
  if (priority) select.value = priority
  const form = document.getElementById('task-form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

/** The tasks as they were persisted, read back from storage. */
function storedTasks(): { text: string; priority: string; completed: boolean }[] {
  return JSON.parse(localStorage.getItem('tasks') ?? '[]')
}

describe('application bootstrap', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.doUnmock('../i18n')
  })

  describe('on load', () => {
    it('translates the page into the starting language', async () => {
      mountAppDom()

      await bootApp()

      expect(document.querySelector('h1')?.textContent).toBe('My Task Manager')
      expect(document.querySelector<HTMLInputElement>('#task-input')?.placeholder).toBe(
        'Enter task description'
      )
    })

    it('puts the tasks of a previous visit back on screen', async () => {
      localStorage.setItem(
        'tasks',
        JSON.stringify([
          { id: 1, text: 'From last time', priority: 'high', completed: false },
          { id: 2, text: 'Already done', priority: 'low', completed: true }
        ])
      )
      mountAppDom()

      await bootApp()

      expect(renderedTexts()).toEqual(['From last time', 'Already done'])
      expect(document.getElementById('total-count')?.textContent).toBe('2')
      expect(document.getElementById('completed-count')?.textContent).toBe('1')
    })

    it('does not crash on a page without the expected markup', async () => {
      document.body.innerHTML = '<p>Some other page</p>'
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

      await expect(bootApp()).resolves.toBeUndefined()
      expect(consoleError).not.toHaveBeenCalled()
    })

    it('reports a boot failure instead of failing silently', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
      vi.doMock('../i18n', () => ({
        loadTranslations: () => Promise.reject(new Error('catalogues unreachable')),
        setLanguage: () => undefined,
        getCurrentLanguage: () => 'en',
        t: (key: string) => key,
        applyTranslations: () => undefined
      }))
      mountAppDom()

      await bootApp()

      expect(consoleError).toHaveBeenCalledWith('Application failed to start:', expect.any(Error))
    })
  })

  describe('adding a task from the form', () => {
    beforeEach(async () => {
      mountAppDom()
      await bootApp()
    })

    it('shows the typed task in the list', () => {
      submitTask('Buy milk')

      expect(renderedTexts()).toEqual(['Buy milk'])
      expect(document.getElementById('total-count')?.textContent).toBe('1')
    })

    it('empties the input so the next task can be typed', () => {
      submitTask('Buy milk')

      expect(document.querySelector<HTMLInputElement>('#task-input')?.value).toBe('')
    })

    it('carries the priority chosen in the select', () => {
      submitTask('Call the bank', 'high')

      expect(storedTasks()[0].priority).toBe('high')
      expect(document.querySelector('.priority-badge')?.textContent).toBe('HIGH')
    })

    it('adds nothing when the input is empty', () => {
      submitTask('')

      expect(renderedTexts()).toEqual([])
      expect(storedTasks()).toEqual([])
    })

    it('adds nothing when the input holds only whitespace', () => {
      submitTask('    ')

      expect(renderedTexts()).toEqual([])
      expect(storedTasks()).toEqual([])
    })

    it('does not let the form navigate away', () => {
      const input = document.getElementById('task-input') as HTMLInputElement
      input.value = 'Buy milk'
      const submitEvent = new Event('submit', { bubbles: true, cancelable: true })

      document.getElementById('task-form')?.dispatchEvent(submitEvent)

      expect(submitEvent.defaultPrevented).toBe(true)
    })

    it('keeps the tasks added so far when another one arrives', () => {
      submitTask('Buy milk')
      submitTask('Call Ana')

      expect(renderedTexts()).toEqual(['Buy milk', 'Call Ana'])
    })
  })

  describe('switching language', () => {
    beforeEach(async () => {
      mountAppDom()
      await bootApp()
    })

    it('puts the interface in French when the French button is clicked', () => {
      document.getElementById('lang-fr')?.click()

      expect(document.querySelector('h1')?.textContent).toBe('Mon Gestionnaire de Tâches')
      expect(document.querySelector<HTMLInputElement>('#task-input')?.placeholder).toBe(
        'Saisir la description de la tâche'
      )
    })

    it('marks French as the active language and unmarks English', () => {
      document.getElementById('lang-fr')?.click()

      expect(document.getElementById('lang-fr')?.classList.contains('active')).toBe(true)
      expect(document.getElementById('lang-en')?.classList.contains('active')).toBe(false)
    })

    it('brings the interface back to English', () => {
      document.getElementById('lang-fr')?.click()
      document.getElementById('lang-en')?.click()

      expect(document.querySelector('h1')?.textContent).toBe('My Task Manager')
      expect(document.getElementById('lang-en')?.classList.contains('active')).toBe(true)
      expect(document.getElementById('lang-fr')?.classList.contains('active')).toBe(false)
    })

    it('repaints the task rows in the new language', () => {
      submitTask('Acheter du lait')

      document.getElementById('lang-fr')?.click()

      expect(document.querySelector('.delete-btn')?.textContent).toBe('Supprimer')
      expect(renderedTexts()).toEqual(['Acheter du lait'])
    })
  })

  describe('filtering from the filter buttons', () => {
    beforeEach(async () => {
      mountAppDom()
      await bootApp()
      submitTask('Still to do')
      submitTask('Already done')
      const rows = document.querySelectorAll<HTMLInputElement>('#tasks .task-checkbox')
      rows[1].click()
    })

    it('shows only unfinished tasks under Active', () => {
      document.querySelector<HTMLButtonElement>('[data-filter="active"]')?.click()

      expect(renderedTexts()).toEqual(['Still to do'])
    })

    it('shows only finished tasks under Completed', () => {
      document.querySelector<HTMLButtonElement>('[data-filter="completed"]')?.click()

      expect(renderedTexts()).toEqual(['Already done'])
    })

    it('shows every task again under All', () => {
      document.querySelector<HTMLButtonElement>('[data-filter="completed"]')?.click()
      document.querySelector<HTMLButtonElement>('[data-filter="all"]')?.click()

      expect(renderedTexts()).toEqual(['Still to do', 'Already done'])
    })

    it('moves the active mark onto the button that was clicked', () => {
      document.querySelector<HTMLButtonElement>('[data-filter="active"]')?.click()

      const marked = Array.from(document.querySelectorAll('.filter-btn.active')).map(button =>
        button.getAttribute('data-filter')
      )
      expect(marked).toEqual(['active'])
    })

    it('removes a task and its row when its delete button is clicked', () => {
      document.querySelector<HTMLButtonElement>('#tasks .delete-btn')?.click()

      expect(renderedTexts()).toEqual(['Already done'])
      expect(storedTasks().map(task => task.text)).toEqual(['Already done'])
    })
  })
})
