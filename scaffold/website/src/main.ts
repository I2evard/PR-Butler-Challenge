import { TaskManager } from './taskManager'
import { applyTranslations, loadTranslations, setLanguage, t } from './i18n'
import { TaskFilter } from './types'
import './styles.css'

/** The one task list the page works on. Left undefined when the boot sequence failed. */
let taskManager: TaskManager | undefined

/**
 * Brings the page to life: loads the catalogues, translates the static markup, restores the
 * saved tasks, wires the controls and paints the first frame.
 *
 * The translation pass runs before the list is built so the page is never shown in a mix of
 * two languages.
 *
 * @returns a promise that rejects if any of those steps fails, so the caller can tell the user.
 */
async function init(): Promise<void> {
  await loadTranslations()
  applyTranslations()
  taskManager = new TaskManager()
  setupEventListeners()
  taskManager.render()
}

/**
 * Subscribes the page's controls to the task list: the add form, the two language buttons and
 * the three filter buttons.
 *
 * Called once, from {@link init}; the per-task checkbox and delete listeners are attached by
 * the renderer instead, because those elements are rebuilt on every repaint.
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
        taskManager?.setFilter(filter as TaskFilter)
      }
    })
  })
}

/**
 * Turns a form submission into a new task and clears the field.
 *
 * A description of nothing but whitespace is dropped silently: the field is `required`, so the
 * browser has already asked once, and a second complaint would add noise, not information.
 *
 * @param e - the form's submit event; its default navigation is cancelled.
 */
function handleSubmit(e: Event): void {
  e.preventDefault()
  const input = document.getElementById('task-input') as HTMLInputElement
  const select = document.getElementById('priority-select') as HTMLSelectElement
  if (input.value.trim()) {
    taskManager?.addTask(input.value, select.value as 'low' | 'medium' | 'high')
    input.value = ''
  }
}

/**
 * Switches the interface to another language: marks the chosen button, rewrites every
 * catalogue-driven string on the page, then repaints the task list so the strings the renderer
 * owns — the delete buttons, a pending storage notice — follow too.
 *
 * @param lang - the language code to switch to, `'en'` or `'fr'`.
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

/**
 * Puts a boot failure where the user is already looking.
 *
 * A `.catch` that only logged would turn a loud failure into a silent one: the static markup
 * still paints, no control is wired, and the page looks normal while every click does nothing.
 * The notice goes into the task list when there is one, and into the top of the body when the
 * page is so broken that there is not.
 *
 * @param message - the already-translated sentence to show.
 */
function showBootFailure(message: string): void {
  const list = document.getElementById('tasks')
  const host = list ?? document.body
  if (!host) return

  const notice = document.createElement(list ? 'li' : 'p')
  notice.className = 'app-notice app-notice--error'
  notice.setAttribute('role', 'alert')
  notice.textContent = message
  host.prepend(notice)
}

init().catch(error => {
  console.error('Task Manager failed to start', error)
  showBootFailure(t('error.boot'))
})
