import { TaskManager } from './taskManager'
import { applyTranslations, loadTranslations, setLanguage } from './i18n'
import { TaskFilter } from './types'
import './styles.css'

let taskManager: TaskManager

/**
 * Boots the application against the document already in the page.
 *
 * Loads the catalogues, restores saved tasks, binds the handlers, translates the
 * static markup, and draws the first list — in that order, because the handlers
 * close over `taskManager` and the translation pass must precede the first paint.
 * Runs once at module import; there is no teardown.
 *
 * @returns A promise that resolves when the first paint is done.
 */
async function init() {
  await loadTranslations()
  taskManager = new TaskManager()
  setupEventListeners()
  applyTranslations()
  taskManager.render()
}

/**
 * Binds every interaction handler the page needs, once.
 *
 * Covers form submission, the two language buttons and the three filter buttons.
 * Elements are looked up defensively, so a page missing one of them still boots.
 * Calling this twice would attach duplicate handlers.
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
 * Turns a submitted form into a new task and clears the field.
 *
 * Suppresses the browser's navigation, ignores input that is blank or only
 * whitespace, and stores the raw (untrimmed) value with the chosen priority.
 *
 * @param e The form's submit event.
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
 * Switches the interface language and repaints everything already on screen.
 *
 * Moves the `active` highlight to the chosen button, retranslates the static
 * markup, then re-renders the task list so dynamically built labels such as the
 * Delete button follow too. The choice is not persisted across reloads.
 *
 * @param lang Locale code to switch to, `'en'` or `'fr'`.
 */
function switchLanguage(lang: string) {
  setLanguage(lang)

  document.querySelectorAll('.language-selector button').forEach(btn => {
    btn.classList.remove('active')
  })

  const activeBtn = document.getElementById(`lang-${lang}`)
  activeBtn?.classList.add('active')

  applyTranslations()
  taskManager?.render()
}

// Missing error handling
init()
