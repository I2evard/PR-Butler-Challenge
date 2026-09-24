import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'

const HERE = dirname(fileURLToPath(import.meta.url))
const PAGE = readFileSync(resolve(HERE, '../../index.html'), 'utf-8')

/** The page's `<body>` content, read from `index.html` rather than retyped. */
export const APP_MARKUP = PAGE.slice(PAGE.indexOf('<body>') + 6, PAGE.indexOf('</body>'))

/**
 * The page's `<title>`, read from `index.html` rather than retyped. `mountPage()` only mounts
 * `<body>`, so a test that cares about the browser-tab title must seed it with this value to
 * reproduce what a browser actually loads.
 */
export const PAGE_TITLE = PAGE.slice(PAGE.indexOf('<title>') + 7, PAGE.indexOf('</title>')).trim()

/**
 * Sentinel value written over translatable strings before a test runs, so that the value a
 * test expects is provably absent from the initial state and cannot pass by accident.
 */
export const UNTRANSLATED = '__UNTRANSLATED__'

/** Mounts the real page markup into the jsdom document, replacing whatever was there. */
export function mountPage(): void {
  document.body.innerHTML = APP_MARKUP
}

/**
 * Overwrites every translatable string with {@link UNTRANSLATED}: the `textContent` of each
 * `[data-i18n]` element and the `placeholder` attribute of each `[data-i18n-placeholder]` one.
 */
export function blankTranslatableText(root: ParentNode = document): void {
  root.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = UNTRANSLATED
  })
  root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.setAttribute('placeholder', UNTRANSLATED)
  })
}
