import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGE = readFileSync(resolve(HERE, '../../index.html'), 'utf-8')

/** The page's `<body>` content, read from `index.html` rather than retyped. */
export const APP_MARKUP = PAGE.slice(PAGE.indexOf('<body>') + 6, PAGE.indexOf('</body>'))

/**
 * The same markup, but with every translatable slot blanked out with a sentinel.
 *
 * Derived from `index.html` -- never retyped -- so it cannot drift from the page.
 * A boot test mounts this and then asserts the ENGLISH strings are on screen: that
 * assertion can only pass if something actually applied the translations, because
 * the expected value was not in the initial state.
 */
export function markupWithSentinels(sentinel = '__UNTRANSLATED__'): string {
  const root = document.createElement('div')
  root.innerHTML = APP_MARKUP
  root.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = sentinel
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.setAttribute('placeholder', sentinel)
  })
  return root.innerHTML
}

/** The DOM `TaskManager.render()` needs, and nothing else. */
export const RENDER_DOM =
  '<ul id="tasks"></ul><span id="total-count"></span><span id="completed-count"></span>'

/** `querySelector` that fails loudly instead of handing back `null`. */
export function queryOrThrow<T extends Element>(selector: string, root: ParentNode = document): T {
  const element = root.querySelector(selector)
  if (!element) {
    throw new Error(`Expected to find "${selector}" in the DOM, found nothing`)
  }
  return element as T
}

/** Trimmed `textContent` of a selector, for readable assertions. */
export function textOf(selector: string, root: ParentNode = document): string {
  return (queryOrThrow(selector, root).textContent ?? '').trim()
}
