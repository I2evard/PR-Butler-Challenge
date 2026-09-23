import { Translations } from './types'
import enTranslations from './translations/en.json'
import frTranslations from './translations/fr.json'

let currentLanguage = 'en'
const translations: Translations = {
  en: enTranslations,
  fr: frTranslations
}

/**
 * Makes the catalogues usable by `t()`.
 *
 * The catalogues are bundled at build time, so there is nothing to fetch; the function
 * stays asynchronous so that moving them behind a network call later does not change
 * a single call site.
 *
 * @returns a promise that settles once the catalogues are ready to be read
 */
export async function loadTranslations() {
  // Translations are imported statically
  return Promise.resolve()
}

/**
 * Chooses the catalogue that `t()` reads from.
 *
 * Changing the language does not repaint anything on its own — call
 * {@link applyTranslations} afterwards to push the new wording into the page.
 *
 * @param lang two-letter code of the catalogue to use; an unknown code makes `t()`
 *   fall back to returning keys
 */
export function setLanguage(lang: string) {
  currentLanguage = lang
}

/**
 * Looks a wording up in the active catalogue.
 *
 * @param key catalogue key, e.g. `button.delete`
 * @returns the translated wording, or the key itself when the catalogue has no entry
 *   for it — a visible `button.delete` on screen is the signal that a key is missing
 */
export function t(key: string): string {
  return translations[currentLanguage]?.[key] || key
}

/**
 * Reports which catalogue is currently in force.
 *
 * @returns the two-letter code last given to {@link setLanguage}
 */
export function getCurrentLanguage() {
  return currentLanguage
}

/**
 * Pushes the active catalogue into the markup.
 *
 * Every element carrying `data-i18n="<key>"` has its text replaced, and every element
 * carrying `data-i18n-placeholder="<key>"` has its placeholder replaced. Those two
 * attributes are the only contract between the page and the catalogues: an element
 * without one keeps whatever the markup gave it.
 *
 * Because the text is written with `textContent`, only an element whose text is the
 * *whole* of its content may carry `data-i18n` — a label sitting beside a counter or a
 * date must be wrapped in its own element first, or the sibling is wiped.
 *
 * @param root subtree to translate; defaults to the whole document
 */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll('[data-i18n]').forEach(element => {
    const key = element.getAttribute('data-i18n')
    if (key) {
      element.textContent = t(key)
    }
  })

  root.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder')
    if (key) {
      element.setAttribute('placeholder', t(key))
    }
  })
}
