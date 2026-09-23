import { describe, it, expect, beforeEach, vi } from 'vitest'

/*
 * SCENARIOS - main.ts (the app wiring, exercised through real DOM events)
 *
 *  1. Importing the module boots the app: translations are applied and the list renders
 *  2. Tasks already in storage are rendered as soon as the app boots
 *  3. Submitting the form with text adds the task and clears the input
 *  4. The selected priority is the one carried by the new task
 *  5. Submitting with an empty input adds nothing
 *  6. Submitting with whitespace only adds nothing
 *  7. Clicking a filter button applies that filter to the rendered list
 *  8. Clicking a filter button moves the `active` class onto it
 *  9. Clicking the French button translates the static labels and the Delete button
 * 10. Clicking the English button translates everything back
 * 11. The language buttons carry the `active` class of the current language
 * 12. Added tasks survive a reboot of the app (storage is wired end to end)
 */

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
      <h2 data-i18n="task.add">Add New Task</h2>
      <form id="task-form">
        <input
          type="text"
          id="task-input"
          data-i18n-placeholder="task.placeholder"
          placeholder="Enter task description"
        />
        <select id="priority-select">
          <option value="low" data-i18n="priority.low">Low Priority</option>
          <option value="medium" data-i18n="priority.medium">Medium Priority</option>
          <option value="high" data-i18n="priority.high">High Priority</option>
        </select>
        <button type="submit" data-i18n="button.add">Add Task</button>
      </form>
      <div class="filter-buttons">
        <button class="filter-btn active" data-filter="all" data-i18n="filter.all">All Tasks</button>
        <button class="filter-btn" data-filter="active" data-i18n="filter.active">Active</button>
        <button class="filter-btn" data-filter="completed" data-i18n="filter.completed">
          Completed
        </button>
      </div>
      <ul id="tasks"></ul>
      <div class="stats">
        <p><span data-i18n="stats.total">Total tasks</span>: <span id="total-count">0</span></p>
        <p><span data-i18n="stats.completed">Completed</span>: <span id="completed-count">0</span></p>
      </div>
    </main>
    <footer><span data-i18n="footer.text">Built with TypeScript</span></footer>
  </div>
`

async function bootApp() {
  document.body.innerHTML = APP_MARKUP
  vi.resetModules()
  await import('../main')
  // init() is async, let the microtask queue drain before asserting
  await new Promise(resolve => setTimeout(resolve, 0))
}

function click(el: Element | null) {
  el?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function submitForm() {
  document
    .getElementById('task-form')
    ?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function addTaskThroughUi(text: string, priority = 'low') {
  const input = document.getElementById('task-input') as HTMLInputElement
  const select = document.getElementById('priority-select') as HTMLSelectElement
  input.value = text
  select.value = priority
  submitForm()
}

function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll('#tasks .task-text')).map(el => el.textContent ?? '')
}

function filterBtn(filter: string): Element | null {
  return document.querySelector(`.filter-btn[data-filter="${filter}"]`)
}

describe('main app wiring', () => {
  beforeEach(() => {
    localStorage.clear()
    document.body.innerHTML = ''
  })

  // Scenario 1
  it('boots with translations applied and an empty rendered list', async () => {
    await bootApp()

    expect(document.querySelector('h1')?.textContent).toBe('My Task Manager')
    expect(document.getElementById('task-input')?.getAttribute('placeholder')).toBe(
      'Enter task description'
    )
    expect(document.querySelectorAll('#tasks .task-item')).toHaveLength(0)
    expect(document.getElementById('total-count')?.textContent).toBe('0')
  })

  // Scenario 2
  it('renders the tasks already present in storage at boot time', async () => {
    localStorage.setItem(
      'tasks',
      JSON.stringify([
        { id: 1, text: 'From storage', priority: 'medium', completed: false, createdAt: null }
      ])
    )

    await bootApp()

    expect(renderedTexts()).toEqual(['From storage'])
    expect(document.getElementById('total-count')?.textContent).toBe('1')
  })

  // Scenario 3
  it('adds a task and clears the input when the form is submitted', async () => {
    await bootApp()

    addTaskThroughUi('Buy milk')

    expect(renderedTexts()).toEqual(['Buy milk'])
    expect((document.getElementById('task-input') as HTMLInputElement).value).toBe('')
    expect(document.getElementById('total-count')?.textContent).toBe('1')
  })

  // Scenario 4
  it('carries the selected priority onto the new task', async () => {
    await bootApp()

    addTaskThroughUi('Urgent thing', 'high')

    const badge = document.querySelector('#tasks .priority-badge')
    expect(badge?.textContent).toBe('HIGH')
    expect(badge?.classList.contains('priority-high')).toBe(true)
  })

  // Scenario 5
  it('adds nothing when the input is empty', async () => {
    await bootApp()

    addTaskThroughUi('')

    expect(document.querySelectorAll('#tasks .task-item')).toHaveLength(0)
    expect(document.getElementById('total-count')?.textContent).toBe('0')
  })

  // Scenario 6
  it('adds nothing when the input holds only whitespace', async () => {
    await bootApp()

    addTaskThroughUi('    ')

    expect(document.querySelectorAll('#tasks .task-item')).toHaveLength(0)
  })

  // Scenarios 7 and 8
  it('applies the clicked filter and moves the active class onto that button', async () => {
    await bootApp()
    addTaskThroughUi('Still open')
    addTaskThroughUi('Finished')
    click(document.querySelectorAll('#tasks .task-checkbox')[1])

    click(filterBtn('active'))
    expect(renderedTexts()).toEqual(['Still open'])
    expect(filterBtn('active')?.classList.contains('active')).toBe(true)
    expect(filterBtn('all')?.classList.contains('active')).toBe(false)

    click(filterBtn('completed'))
    expect(renderedTexts()).toEqual(['Finished'])
    expect(filterBtn('completed')?.classList.contains('active')).toBe(true)
    expect(filterBtn('active')?.classList.contains('active')).toBe(false)

    click(filterBtn('all'))
    expect(renderedTexts()).toEqual(['Still open', 'Finished'])
    expect(filterBtn('all')?.classList.contains('active')).toBe(true)
  })

  // Scenarios 9, 10 and 11
  it('switches the whole interface between French and English', async () => {
    await bootApp()
    addTaskThroughUi('Something to do')

    click(document.getElementById('lang-fr'))

    expect(document.querySelector('h1')?.textContent).toBe('Mon Gestionnaire de Tâches')
    expect(filterBtn('all')?.textContent).toBe('Toutes les tâches')
    expect(document.querySelector('#tasks .delete-btn')?.textContent).toBe('Supprimer')
    expect(document.getElementById('task-input')?.getAttribute('placeholder')).toBe(
      'Saisir la description de la tâche'
    )
    expect(document.getElementById('lang-fr')?.classList.contains('active')).toBe(true)
    expect(document.getElementById('lang-en')?.classList.contains('active')).toBe(false)

    click(document.getElementById('lang-en'))

    expect(document.querySelector('h1')?.textContent).toBe('My Task Manager')
    expect(filterBtn('all')?.textContent).toBe('All Tasks')
    expect(document.querySelector('#tasks .delete-btn')?.textContent).toBe('Delete')
    expect(document.getElementById('lang-en')?.classList.contains('active')).toBe(true)
    expect(document.getElementById('lang-fr')?.classList.contains('active')).toBe(false)
  })

  // Scenario 12
  it('keeps tasks added through the UI across a reboot of the app', async () => {
    await bootApp()
    addTaskThroughUi('Survives a reload')

    await bootApp()

    expect(renderedTexts()).toEqual(['Survives a reload'])
  })
})
