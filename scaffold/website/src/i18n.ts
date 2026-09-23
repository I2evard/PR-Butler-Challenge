import { Translations } from './types'
import enTranslations from './translations/en.json'
import frTranslations from './translations/fr.json'

let currentLanguage = 'en'
const translations: Translations = {
  en: enTranslations,
  fr: frTranslations
}

/**
 * Prepares the translation catalogues for use.
 *
 * Both locales are bundled at build time, so nothing is fetched. The function stays
 * async so that a future move to remote catalogues does not change any caller.
 *
 * @returns A promise that settles once translations are ready.
 */
export async function loadTranslations(): Promise<void> {
  return Promise.resolve()
}

/**
 * Switches the active locale used by {@link t}.
 *
 * Changing the locale does not repaint anything on its own — call
 * {@link applyTranslations} afterwards to push the new strings into the DOM.
 *
 * @param lang Locale code, `'en'` or `'fr'`.
 */
export function setLanguage(lang: string): void {
  currentLanguage = lang
}

/**
 * Looks up a translated string in the active locale.
 *
 * @param key Dotted translation key, such as `'button.add'`.
 * @returns The translated string, or the key itself when no translation exists — a
 *   visible key in the interface is a deliberate signal that a translation is missing.
 */
export function t(key: string): string {
  return translations[currentLanguage]?.[key] || key
}

/**
 * Returns the locale currently in use.
 *
 * @returns The active locale code.
 */
export function getCurrentLanguage(): string {
  return currentLanguage
}

/**
 * Rewrites every translatable element in the document with the active locale.
 *
 * Walks two sets of anchors: `data-i18n` replaces an element's text, and
 * `data-i18n-placeholder` replaces an input's placeholder. Anything without one of
 * these attributes is left untouched.
 *
 * @param root Subtree to translate. Defaults to the whole document.
 */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n
    if (key) element.textContent = t(key)
  })

  root.querySelectorAll<HTMLInputElement>('[data-i18n-placeholder]').forEach(element => {
    const key = element.dataset.i18nPlaceholder
    if (key) element.placeholder = t(key)
  })
}
