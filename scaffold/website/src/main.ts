import { TaskManager } from './taskManager'
import { loadTranslations, setLanguage, applyTranslations } from './i18n'
import { TaskFilter } from './types'
import './styles.css'

let taskManager: TaskManager

/**
 * Boots the application.
 *
 * Loads translations, creates the task manager, wires the event listeners and paints
 * the first render. Any failure here leaves the page unusable, so it is reported
 * rather than swallowed.
 *
 * @returns A promise that settles once the app is on screen.
 */
async function init(): Promise<void> {
  await loadTranslations()
  taskManager = new TaskManager()
  setupEventListeners()
  applyTranslations()
  taskManager.render()
}

/**
 * Binds every interactive control to its handler.
 *
 * Covers the add-task form, the two language buttons and the three filter buttons.
 * Called once, from {@link init}.
 */
function setupEventListeners(): void {
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
 * Handles submission of the add-task form.
 *
 * Reads the text input and the priority select, adds the task when the text is not
 * blank, then clears the input. Whitespace-only input is ignored.
 *
 * @param e The form's submit event; its default navigation is prevented.
 */
function handleSubmit(e: Event): void {
  e.preventDefault()

  const input = document.getElementById('task-input') as HTMLInputElement
  const select = document.getElementById('priority-select') as HTMLSelectElement

  // Validate and store the same value: trimming only to test the input, then storing the
  // untrimmed one, saved the user's stray spaces into the task for good.
  const text = input.value.trim()
  if (text) {
    taskManager.addTask(text, select.value as 'low' | 'medium' | 'high')
    input.value = ''
  }
}

/**
 * Switches the interface to another language.
 *
 * Marks the matching language button active, then repaints every translatable
 * element and the task list, so the change is visible immediately.
 *
 * @param lang Locale code, `'en'` or `'fr'`.
 */
function switchLanguage(lang: string): void {
  setLanguage(lang)

  document.querySelectorAll('.language-selector button').forEach(btn => {
    btn.classList.remove('active')
  })

  const activeBtn = document.getElementById(`lang-${lang}`)
  activeBtn?.classList.add('active')

  applyTranslations()
  taskManager?.render()
}

init().catch(error => {
  console.error('Application failed to start:', error)
})
