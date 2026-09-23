import { TaskManager } from './taskManager'
import { applyTranslations, loadTranslations, setLanguage } from './i18n'
import { TaskFilter } from './types'
import './styles.css'

let taskManager: TaskManager

/**
 * Boots the application: loads the catalogues, restores saved tasks, wires the
 * page up and paints the first frame in the active language.
 *
 * @returns A promise that settles once the page is interactive.
 */
async function init() {
  await loadTranslations()
  taskManager = new TaskManager()
  setupEventListeners()
  applyTranslations()
  taskManager.render()
}

/**
 * Binds the page controls to the task manager.
 *
 * Every lookup is optional: the app is expected to survive a page that is
 * missing a control rather than abort the whole boot for one absent node.
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
 * Turns a form submission into a new task and clears the field.
 *
 * Blank and whitespace-only input is ignored, so the native `required`
 * attribute is not the only thing standing between the user and an empty task.
 *
 * @param e - The form's submit event; its default navigation is suppressed.
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
 * Switches the interface to another language.
 *
 * Moves the active marker onto the chosen button, retranslates the static
 * markup, then repaints the task list — the rows are built in code, so they
 * carry labels that `applyTranslations` alone would not reach.
 *
 * @param lang - Language code to switch to, such as `'en'` or `'fr'`.
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

init().catch(error => {
  console.error('Task manager failed to start', error)
})
