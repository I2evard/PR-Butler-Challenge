// SCENARIOS - what the page does on its own, from the moment it is loaded
//   1. Starting the app translates the page it was given
//   2. Starting the app records the active language on the <html> element
//   3. Submitting the form with a description adds a task, shows it and empties the field
//   4. Submitting the form with nothing but spaces adds nothing
//   5. Clicking a filter button moves the selection and narrows the list
//   6. Clicking "Francais" translates the whole page, list and tab title included
//   7. Clicking "English" brings it all back
//   8. If the app cannot start, the user is told so inside the task list
//   9. If the app cannot start and there is no task list, the user is told so anyway
//
// The "is any English left on the French page" walk deliberately does NOT live here: it is a
// whole-page detector, not a boot behaviour, and it lives alone in noEnglishLeft.test.ts.

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountPage, blankTranslatableText, UNTRANSLATED } from './fixture'
import enCatalogue from '../translations/en.json'

const EN = enCatalogue as Record<string, string>

/** Imports `main.ts` from scratch, which starts the app, and waits for its boot to settle. */
async function boot(): Promise<void> {
  vi.resetModules()
  await import('../main')
  await new Promise(resolve => setTimeout(resolve, 0))
}

/** Registers a `TaskManager` that explodes on construction, so that booting fails. */
function breakTaskManager(): void {
  vi.doMock('../taskManager', () => ({
    TaskManager: class {
      constructor() {
        throw new Error('boom')
      }
    }
  }))
}

function heading(): HTMLHeadingElement {
  return document.querySelector<HTMLHeadingElement>('h1')!
}

/** The "Your Tasks" heading, found by the key it declares rather than by the words in it. */
function taskListHeading(): HTMLHeadingElement {
  return document.querySelector<HTMLHeadingElement>('h2[data-i18n="task.list"]')!
}

function taskInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('#task-input')!
}

function submitForm(): void {
  const form = document.querySelector<HTMLFormElement>('#task-form')!
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll('#tasks .task-text')).map(
    element => element.textContent ?? ''
  )
}

describe('application boot', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.lang = 'en'
    document.title = UNTRANSLATED
    mountPage()
  })

  afterEach(() => {
    vi.doUnmock('../taskManager')
    vi.resetModules()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('translates the page it was given', async () => {
    blankTranslatableText()
    expect(heading().textContent).toBe(UNTRANSLATED)
    expect(taskInput().getAttribute('placeholder')).toBe(UNTRANSLATED)

    await boot()

    expect(heading().textContent).toBe('My Task Manager')
    expect(taskInput().getAttribute('placeholder')).toBe('Enter task description')
  })

  it('records the active language on the <html> element', async () => {
    document.documentElement.lang = 'zz'

    await boot()

    expect(document.documentElement.lang).toBe('en')
  })

  it('translates the browser-tab title', async () => {
    expect(document.title).toBe(UNTRANSLATED)

    await boot()

    expect(document.title).toBe('Task Manager')
  })

  it('adds a task, shows it and empties the field when the form is submitted', async () => {
    await boot()

    taskInput().value = 'Buy milk'
    submitForm()

    expect(renderedTexts()).toEqual(['Buy milk'])
    expect(taskInput().value).toBe('')
  })

  it('adds nothing when the form is submitted with nothing but spaces', async () => {
    await boot()

    taskInput().value = '   '
    submitForm()

    expect(renderedTexts()).toEqual([])
    expect(document.querySelector('#total-count')!.textContent).toBe('0')
  })

  it('moves the selection and narrows the list when a filter is clicked', async () => {
    await boot()

    taskInput().value = 'Still to do'
    submitForm()
    taskInput().value = 'Already done'
    submitForm()

    const checkboxes = document.querySelectorAll<HTMLInputElement>('.task-checkbox')
    checkboxes[1].checked = true
    checkboxes[1].dispatchEvent(new Event('change'))

    const activeFilter = document.querySelector<HTMLButtonElement>(
      '.filter-btn[data-filter="active"]'
    )!
    activeFilter.click()

    expect(activeFilter.classList.contains('active')).toBe(true)
    expect(
      document.querySelector('.filter-btn[data-filter="all"]')!.classList.contains('active')
    ).toBe(false)
    expect(renderedTexts()).toEqual(['Still to do'])
  })

  it('translates the whole page, list included, when French is chosen', async () => {
    await boot()

    taskInput().value = 'Une tache'
    submitForm()

    const frenchButton = document.querySelector<HTMLButtonElement>('#lang-fr')!
    frenchButton.click()

    expect(frenchButton.classList.contains('active')).toBe(true)
    expect(document.querySelector('#lang-en')!.classList.contains('active')).toBe(false)
    expect(heading().textContent).toBe('Mon Gestionnaire de Tâches')
    expect(taskListHeading().textContent).toBe('Vos tâches')
    expect(document.documentElement.lang).toBe('fr')
    expect(document.title).toBe('Gestionnaire de tâches')
    expect(document.querySelector('.delete-btn')!.textContent).toBe('Supprimer')
    expect(document.querySelector('.priority-badge')!.textContent).toBe('FAIBLE')
  })

  it('brings the page back to English when English is chosen again', async () => {
    await boot()

    taskInput().value = 'A task'
    submitForm()

    document.querySelector<HTMLButtonElement>('#lang-fr')!.click()
    const englishButton = document.querySelector<HTMLButtonElement>('#lang-en')!
    englishButton.click()

    expect(englishButton.classList.contains('active')).toBe(true)
    expect(document.querySelector('#lang-fr')!.classList.contains('active')).toBe(false)
    expect(heading().textContent).toBe('My Task Manager')
    expect(taskListHeading().textContent).toBe('Your Tasks')
    expect(document.documentElement.lang).toBe('en')
    expect(document.title).toBe('Task Manager')
    expect(document.querySelector('.delete-btn')!.textContent).toBe('Delete')
    expect(document.querySelector('.priority-badge')!.textContent).toBe('LOW')
  })

  it('tells the user inside the task list when it cannot start', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    breakTaskManager()

    await boot()

    const notice = document.querySelector('#tasks .app-notice')
    expect(notice).not.toBeNull()
    expect(notice!.tagName).toBe('LI')
    expect(notice!.classList.contains('app-notice--error')).toBe(true)
    expect(notice!.getAttribute('role')).toBe('alert')
    expect(notice!.textContent).toBe(EN['error.boot'])
    expect(consoleError).toHaveBeenCalled()
  })

  it('tells the user in the body when it cannot start and there is no task list', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    document.body.innerHTML = '<div></div>'
    breakTaskManager()

    await boot()

    const notice = document.querySelector('.app-notice')
    expect(notice).not.toBeNull()
    expect(notice!.tagName).toBe('P')
    expect(notice!.parentElement).toBe(document.body)
    expect(document.body.firstElementChild).toBe(notice)
    expect(notice!.getAttribute('role')).toBe('alert')
    expect(notice!.textContent).toBe(EN['error.boot'])
  })
})
