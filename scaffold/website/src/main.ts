import { TaskManager } from './taskManager'
import { applyTranslations, loadTranslations, setLanguage } from './i18n'
import { TaskFilter } from './types'
import './styles.css'

let taskManager: TaskManager

/** Shown in the task list when the app never finished starting. */
const BOOT_FAILURE_MESSAGE = 'The task manager failed to start. Reload the page to try again.'

/**
 * Brings the page to life: catalogues, state, listeners, first paint.
 *
 * The translation pass runs before anything is rendered, so the static English text in
 * `index.html` is replaced rather than briefly shown.
 *
 * @returns a promise that settles once the page is interactive
 */
async function init() {
  await loadTranslations()
  applyTranslations()
  taskManager = new TaskManager()
  setupEventListeners()
  taskManager.render()
}

/**
 * Binds the page's controls to the task manager.
 *
 * The filter buttons are bound as a group and read their own `data-filter`, so adding a
 * filter to the markup needs no change here.
 */
function setupEventListeners() {
  const form = document.getElementById('task-form') as HTMLFormElement
  const langEnBtn = document.getElementById('lang-en')
  const langFrBtn = document.getElementById('lang-fr')

  form?.addEventListener('submit', handleSubmit)
  langEnBtn?.addEventListener('click', () => switchLanguage('en'))
  langFrBtn?.addEventListener('click', () => switchLanguage('fr'))

  const filterBtns = document.querySelectorAll('.filter-btn')
  filterBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const filter = target.dataset.filter
      if (filter) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        target.classList.add('active')
        taskManager.setFilter(filter as TaskFilter)
      }
    })
  })
}

/**
 * Turns a form submission into a new task.
 *
 * Suppresses the browser's own navigation, and treats a blank or whitespace-only entry
 * as nothing at all rather than as an empty task.
 *
 * @param e the form's submit event
 */
function handleSubmit(e: Event) {
  e.preventDefault()
  const input = document.getElementById('task-input') as HTMLInputElement
  const select = document.getElementById('priority-select') as HTMLSelectElement
  if (input.value.trim()) {
    taskManager.addTask(input.value, select.value as 'low' | 'medium' | 'high')
    input.value = ''
  }
}

/**
 * Switches the interface to another language and repaints everything that carries text.
 *
 * Both halves matter: `applyTranslations()` rewrites the static markup, and the repaint
 * rewrites the task rows, whose delete button is built in code rather than in the page.
 *
 * @param lang two-letter code of the language to switch to
 */
function switchLanguage(lang: string) {
  setLanguage(lang)

  document.querySelectorAll('.language-selector button').forEach(btn => {
    btn.classList.remove('active')
  })

  const activeBtn = document.getElementById(`lang-${lang}`)
  activeBtn?.classList.add('active')

  applyTranslations()
  taskManager.render()
}

/**
 * Tells the user, in the page, that the app did not start.
 *
 * A `.catch` that only logs would be worse than the crash it replaces: the static HTML
 * still paints, no control is wired, and the page looks normal while every click does
 * nothing. The message has to land somewhere the user is already looking.
 */
function showStartupFailure() {
  const taskList = document.getElementById('tasks')

  if (taskList) {
    const banner = document.createElement('li')
    banner.className = 'app-error'
    banner.textContent = BOOT_FAILURE_MESSAGE
    taskList.replaceChildren(banner)
    return
  }

  const fallback = document.createElement('p')
  fallback.className = 'app-error'
  fallback.textContent = BOOT_FAILURE_MESSAGE
  document.body.appendChild(fallback)
}

init().catch(error => {
  console.error('Task Manager failed to start:', error)
  showStartupFailure()
})
