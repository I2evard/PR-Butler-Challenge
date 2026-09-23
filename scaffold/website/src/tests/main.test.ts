/**
 * SCENARIOS -- the page as a user meets it
 *
 *  1. Booting the app puts the English wording on screen, even when the markup
 *     arrived with every translatable slot blanked out.
 *  2. Clicking "Français" translates the heading, the submit button, the three filter
 *     buttons, the two stats labels, the footer label and the input placeholder.
 *  3. Translating does not destroy the counters or the footer year, because the labels
 *     live in their own spans.
 *  4. Clicking "English" puts it all back, and the active language button follows.
 *  5. Submitting the form adds one task and clears the input.
 *  6. Submitting whitespace adds nothing.
 *  7. Clicking a filter button filters the list and takes the `active` class.
 *  8. Clicking a row's delete button removes that row from the page.
 *  9. When start-up fails, the user is told so IN THE PAGE rather than in the console.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { APP_MARKUP, markupWithSentinels, queryOrThrow, textOf } from './fixture'

const SENTINEL = '__UNTRANSLATED__'
const BOOT_FAILURE_MESSAGE = 'The task manager failed to start. Reload the page to try again.'

/** Load `main.ts` fresh and let `init()`'s microtasks drain. */
async function boot(): Promise<void> {
  vi.resetModules()
  await import('../main')
  await new Promise(resolve => setTimeout(resolve, 0))
}

function click(selector: string): void {
  queryOrThrow<HTMLElement>(selector).click()
}

function submitForm(text: string, priority = 'low'): void {
  const input = queryOrThrow<HTMLInputElement>('#task-input')
  const select = queryOrThrow<HTMLSelectElement>('#priority-select')
  input.value = text
  select.value = priority
  queryOrThrow('#task-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function renderedRows(): Element[] {
  return Array.from(document.querySelectorAll('#tasks li:not(.storage-notice):not(.app-error)'))
}

function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll('#tasks .task-text')).map(
    element => element.textContent ?? ''
  )
}

describe('the page at start-up', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('applies the English translations on boot', async () => {
    // The markup is mounted with every translatable slot replaced by a sentinel, so the
    // English wording is NOT in the initial state. These assertions can therefore only
    // pass if init() actually ran applyTranslations().
    document.body.innerHTML = markupWithSentinels(SENTINEL)
    expect(textOf('h1'), 'precondition: the heading starts blanked out').toBe(SENTINEL)
    expect(queryOrThrow<HTMLInputElement>('#task-input').placeholder).toBe(SENTINEL)

    await boot()

    expect(textOf('h1')).toBe('My Task Manager')
    expect(queryOrThrow<HTMLInputElement>('#task-input').placeholder).toBe('Enter task description')
  })
})

describe('switching language', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.body.innerHTML = APP_MARKUP
    await boot()
  })

  it('translates the whole page into French', () => {
    click('#lang-fr')

    expect(textOf('h1')).toBe('Mon Gestionnaire de Tâches')
    expect(textOf('#task-form button[type="submit"]')).toBe('Ajouter la tâche')
    expect(textOf('[data-filter="all"]')).toBe('Toutes les tâches')
    expect(textOf('[data-filter="active"]')).toBe('Actives')
    expect(textOf('[data-filter="completed"]')).toBe('Terminées')
    expect(textOf('[data-i18n="stats.total"]')).toBe('Total des tâches')
    expect(textOf('[data-i18n="stats.completed"]')).toBe('Terminées')
    expect(textOf('[data-i18n="footer.text"]')).toBe('Conçu avec TypeScript')
    expect(queryOrThrow<HTMLInputElement>('#task-input').placeholder).toBe(
      'Saisir la description de la tâche'
    )
  })

  it('keeps the counters and the footer year alive through the translation', () => {
    submitForm('A task to count')
    click('#lang-fr')

    expect(document.getElementById('total-count')).not.toBeNull()
    expect(document.getElementById('completed-count')).not.toBeNull()
    expect(textOf('#total-count')).toBe('1')
    expect(textOf('#completed-count')).toBe('0')
    expect(textOf('footer p')).toContain('2026')
  })

  it('repaints the task list in the new language', () => {
    submitForm('A task to relabel')

    click('#lang-fr')

    expect(textOf('#tasks .delete-btn')).toBe('Supprimer')
  })

  it('puts English back and moves the active class', () => {
    click('#lang-fr')
    click('#lang-en')

    expect(textOf('h1')).toBe('My Task Manager')
    expect(textOf('#task-form button[type="submit"]')).toBe('Add Task')
    expect(queryOrThrow('#lang-en').classList.contains('active')).toBe(true)
    expect(queryOrThrow('#lang-fr').classList.contains('active')).toBe(false)
  })
})

describe('using the page', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.body.innerHTML = APP_MARKUP
    await boot()
  })

  it('adds one task on submit and clears the input', () => {
    submitForm('Buy milk', 'high')

    expect(renderedRows()).toHaveLength(1)
    expect(renderedTexts()).toEqual(['Buy milk'])
    expect(queryOrThrow<HTMLInputElement>('#task-input').value).toBe('')
  })

  it('adds nothing when the input holds only whitespace', () => {
    submitForm('   ')

    expect(renderedRows()).toHaveLength(0)
  })

  it('filters the list when a filter button is clicked', () => {
    submitForm('Still to do')
    submitForm('Already done')
    const checkboxes = document.querySelectorAll<HTMLInputElement>('#tasks .task-checkbox')
    checkboxes[1].click()

    click('[data-filter="completed"]')

    expect(renderedTexts()).toEqual(['Already done'])
    expect(queryOrThrow('[data-filter="completed"]').classList.contains('active')).toBe(true)
    expect(queryOrThrow('[data-filter="all"]').classList.contains('active')).toBe(false)
  })

  it('removes a row when its delete button is clicked', () => {
    submitForm('Temporary')
    submitForm('Permanent')

    click('#tasks .delete-btn')

    expect(renderedTexts()).toEqual(['Permanent'])
  })
})

describe('when start-up fails', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  afterEach(() => {
    vi.doUnmock('../i18n')
    vi.resetModules()
    vi.restoreAllMocks()
  })

  it('tells the user in the page instead of failing silently', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.doMock('../i18n', async importOriginal => {
      const actual = await importOriginal<typeof import('../i18n')>()
      return {
        ...actual,
        loadTranslations: () => Promise.reject(new Error('translations unavailable'))
      }
    })
    document.body.innerHTML = APP_MARKUP

    await boot()

    const banner = queryOrThrow('#tasks li.app-error')
    expect(banner.textContent).toBe(BOOT_FAILURE_MESSAGE)
    expect(document.querySelectorAll('#tasks li.app-error')).toHaveLength(1)
    consoleError.mockRestore()
  })
})
