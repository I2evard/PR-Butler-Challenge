/**
 * Fixture DOM partagée — DÉRIVÉE de index.html, jamais retapée.
 *
 * Si le balisage change, ces helpers changent avec lui : aucun test ne doit
 * contenir une copie du HTML.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/**
 * La base de résolution. Elle passe par une variable EXPRÈS : Vite réécrit à la
 * compilation le motif littéral `new URL('...', import.meta.url)` en URL d'actif
 * (on obtient alors http://localhost:3000/index.html, que fileURLToPath refuse).
 */
const MODULE_URL = import.meta.url

/** Le contenu brut de index.html (source de vérité du balisage). */
export const INDEX_HTML: string = readFileSync(
  fileURLToPath(new URL('../../index.html', MODULE_URL)),
  'utf8'
)

function matchOrThrow(re: RegExp, what: string): string {
  const m = INDEX_HTML.match(re)
  if (!m) throw new Error(`fixture: impossible de trouver ${what} dans index.html`)
  return m[1]
}

/** Le texte de <title> tel qu'il apparaît dans index.html. */
export const PAGE_TITLE: string = matchOrThrow(/<title[^>]*>([\s\S]*?)<\/title>/i, '<title>').trim()

/** L'attribut lang de <html> tel qu'il apparaît dans index.html. */
export const HTML_LANG: string = matchOrThrow(
  /<html[^>]*\slang="([^"]*)"/i,
  'l\u2019attribut lang de <html>'
)

/** L'intérieur de <body>, tous les <script> retirés. */
export const BODY_HTML: string = matchOrThrow(/<body[^>]*>([\s\S]*)<\/body>/i, '<body>').replace(
  /<script\b[^>]*>[\s\S]*?<\/script>/gi,
  ''
)

/** Remonte la page dans le document jsdom courant. */
export function mountFixture(): void {
  document.documentElement.lang = HTML_LANG
  document.body.innerHTML = BODY_HTML
  document.title = PAGE_TITLE
}

/** Laisse tourner les microtâches (init() est async). */
export function flush(): Promise<void> {
  return new Promise<void>(resolve => setTimeout(resolve, 0))
}

/** L'élément d'erreur applicatif, s'il existe. */
export function appError(): HTMLElement | null {
  return document.getElementById('app-error')
}

/** Vrai si la bannière d'erreur est présente ET visible (pas d'attribut hidden). */
export function isErrorVisible(): boolean {
  const el = appError()
  return el !== null && !el.hasAttribute('hidden')
}

/** Une tâche valide, au format attendu dans localStorage. */
export function storedTask(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    text: 'Tache stockee',
    priority: 'low',
    completed: false,
    createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    ...over
  }
}

/** Écrit directement dans localStorage, sans passer par le TaskManager. */
export function seedStorage(value: unknown): void {
  localStorage.setItem('tasks', typeof value === 'string' ? value : JSON.stringify(value))
}

/** Les <li> effectivement rendus dans #tasks. */
export function renderedRows(): HTMLLIElement[] {
  return Array.from(document.querySelectorAll<HTMLLIElement>('#tasks li'))
}

/** Les textes des tâches rendues. */
export function renderedTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLElement>('#tasks .task-text')).map(
    el => el.textContent ?? ''
  )
}
