import { Translations } from './types'
import enTranslations from './translations/en.json'
import frTranslations from './translations/fr.json'

let currentLanguage = 'en'
const translations: Translations = {
  en: enTranslations,
  fr: frTranslations
}

/**
 * Makes the catalogues available to the rest of the app.
 *
 * Both locales are bundled at build time, so there is nothing to fetch. The
 * function stays async so a later move to on-demand loading does not ripple
 * through every caller.
 *
 * @returns A promise that settles once the catalogues are usable.
 */
export async function loadTranslations() {
  // Translations are imported statically
  return Promise.resolve()
}

/**
 * Selects the catalogue that {@link t} reads from.
 *
 * Nothing is repainted and the choice is not persisted: callers decide when to
 * refresh the DOM, normally through {@link applyTranslations}.
 *
 * @param lang - Language code to activate, such as `'en'` or `'fr'`.
 */
export function setLanguage(lang: string) {
  currentLanguage = lang
}

/**
 * Looks a label up in the active catalogue.
 *
 * An unknown key resolves to the key itself rather than an empty string, so a
 * gap in a catalogue shows up on screen instead of silently blanking the label.
 *
 * @param key - Catalogue entry, such as `'button.delete'`.
 * @returns The translated label, or `key` when no entry exists.
 */
export function t(key: string): string {
  return translations[currentLanguage]?.[key] || key
}

/**
 * Reports which catalogue is currently active.
 *
 * @returns The language code last passed to {@link setLanguage}.
 */
export function getCurrentLanguage() {
  return currentLanguage
}

/**
 * Rewrites the visible strings of a subtree into the active language.
 *
 * Elements opt in by carrying `data-i18n` (replaces text content) or
 * `data-i18n-placeholder` (replaces the placeholder attribute). Anything
 * untagged is left alone, which is how the strings with no catalogue entry keep
 * their markup text.
 *
 * @param root - Subtree to translate; defaults to the whole document.
 */
export function applyTranslations(root: ParentNode = document) {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n
    if (key) element.textContent = t(key)
  })

  root
    .querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-i18n-placeholder]')
    .forEach(element => {
      const key = element.dataset.i18nPlaceholder
      if (key) element.placeholder = t(key)
    })
}
