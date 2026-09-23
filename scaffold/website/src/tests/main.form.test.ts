/**
 * SCÉNARIOS — nettoyage de la saisie du formulaire (main.ts)
 *
 * Ces cas décrivent le comportement VOULU : ils sont rouges tant que `handleSubmit`
 * valide sur `trim()` mais enregistre la valeur brute (défaut 5 du rapport).
 *
 * 1. Saisir « ␣␣lait␣␣ » enregistre « lait »
 * 2. Et affiche « lait », sans ses espaces, dans la liste
 * 3. Les espaces à l'intérieur du texte sont conservés : « acheter du lait » reste tel quel
 * 4. Une saisie déjà propre traverse le formulaire sans être modifiée
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

/** The part of index.html the add-task flow needs. */
const APP_MARKUP = `
  <form id="task-form">
    <input type="text" id="task-input" placeholder="Enter task description">
    <select id="priority-select">
      <option value="low">Low Priority</option>
      <option value="medium">Medium Priority</option>
      <option value="high">High Priority</option>
    </select>
    <button type="submit">Add Task</button>
  </form>
  <ul id="tasks"></ul>
  <span id="total-count">0</span>
  <span id="completed-count">0</span>
`

/** Loads the module, which boots the app, and waits for the boot to finish. */
async function bootApp(): Promise<void> {
  await import('../main')
  await new Promise(resolve => setTimeout(resolve, 0))
}

/** Fills the add-task form and submits it, as a user would. */
function submitTask(text: string): void {
  const input = document.getElementById('task-input') as HTMLInputElement
  input.value = text
  const form = document.getElementById('task-form') as HTMLFormElement
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

/** The tasks as they were persisted, read back from storage. */
function storedTasks(): { text: string }[] {
  return JSON.parse(localStorage.getItem('tasks') ?? '[]')
}

/** The task texts currently on screen, in display order. */
function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#tasks .task-text')).map(
    element => element.textContent ?? ''
  )
}

describe('add-task form — trimming the typed text', () => {
  beforeEach(async () => {
    localStorage.clear()
    document.body.innerHTML = APP_MARKUP
    vi.resetModules()
    await bootApp()
  })

  it('stores the text without the spaces typed around it', () => {
    submitTask('  lait  ')

    expect(storedTasks()[0].text).toBe('lait')
  })

  it('shows the text without the spaces typed around it', () => {
    submitTask('  lait  ')

    expect(renderedTexts()).toEqual(['lait'])
  })

  it('keeps the spaces inside the text', () => {
    submitTask('  acheter du lait  ')

    expect(storedTasks()[0].text).toBe('acheter du lait')
  })

  it('leaves an already clean text exactly as typed', () => {
    submitTask('acheter du lait')

    expect(storedTasks()[0].text).toBe('acheter du lait')
    expect(renderedTexts()).toEqual(['acheter du lait'])
  })
})
