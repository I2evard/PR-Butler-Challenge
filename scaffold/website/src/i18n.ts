import { Translations } from './types'
import enTranslations from './translations/en.json'
import frTranslations from './translations/fr.json'

let currentLanguage = 'en'
const translations: Translations = {
  en: enTranslations,
  fr: frTranslations
}

/**
 * Settles the translation catalogues before the interface is first drawn.
 *
 * Both locales are bundled at build time, so there is nothing to fetch and this
 * resolves immediately. It exists as the seam to swap in a network- or file-backed
 * catalogue later without changing any caller.
 *
 * @returns A promise that resolves once the catalogues are usable.
 */
export async function loadTranslations() {
  // Translations are imported statically
  return Promise.resolve()
}

/**
 * Selects the locale that subsequent `t()` lookups resolve against.
 *
 * This only moves a module-level pointer; nothing already on the page is redrawn.
 * Call `applyTranslations()` afterwards to repaint the interface.
 *
 * @param lang Locale code matching a key of the catalogue, `'en'` or `'fr'`.
 */
export function setLanguage(lang: string) {
  currentLanguage = lang
}

/**
 * Resolves a catalogue key to a string in the active locale.
 *
 * An unknown key returns the key itself rather than an empty string, so a missing
 * translation shows up in the interface as `footer.text` instead of silently
 * blanking the element.
 *
 * @param key Catalogue key, for example `'button.delete'`.
 * @returns The translated string, or `key` when the active locale has no entry for it.
 */
export function t(key: string): string {
  return translations[currentLanguage]?.[key] || key
}

/**
 * Reports which locale `t()` is currently resolving against.
 *
 * @returns The active locale code.
 */
export function getCurrentLanguage() {
  return currentLanguage
}

/**
 * Rewrites the already-rendered DOM into the active locale.
 *
 * Elements opt in by carrying `data-i18n="<key>"` (replaces `textContent`) or
 * `data-i18n-placeholder="<key>"` (replaces the `placeholder` attribute). An element
 * whose attribute is empty is skipped rather than blanked. This is what makes a
 * language switch visible without a reload; content generated after the call — such
 * as the task list — has to be re-rendered separately.
 *
 * @param root Subtree to translate. Defaults to the whole document.
 */
export function applyTranslations(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n
    if (key) el.textContent = t(key)
  })

  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder
    if (key) el.setAttribute('placeholder', t(key))
  })
}
