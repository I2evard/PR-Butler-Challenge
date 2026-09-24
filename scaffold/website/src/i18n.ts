import { Translations } from './types'
import enTranslations from './translations/en.json'
import frTranslations from './translations/fr.json'

let currentLanguage = 'en'
const translations: Translations = {
  en: enTranslations,
  fr: frTranslations
}

/**
 * Makes the catalogues available to {@link t}.
 *
 * Both files are bundled statically, so there is nothing to fetch. The function stays
 * asynchronous so that moving the catalogues behind a network call later would not change a
 * single call site.
 *
 * @returns a promise that settles once the catalogues can be read.
 */
export async function loadTranslations(): Promise<void> {
  return Promise.resolve()
}

/**
 * Chooses which catalogue {@link t} reads from.
 *
 * An unrecognised code is accepted rather than replaced by a fallback: `t()` then returns each
 * key unchanged, which puts a bad language code on screen instead of hiding it behind English.
 *
 * @param lang - the language code to activate, for instance `'en'` or `'fr'`.
 */
export function setLanguage(lang: string): void {
  currentLanguage = lang
}

/**
 * Resolves one user-facing string in the active catalogue.
 *
 * @param key - the catalogue key, for instance `'button.delete'`.
 * @returns the translated string, or the key itself when either the key or the language is
 *          unknown — never an empty string, so a gap in the catalogue stays visible.
 */
export function t(key: string): string {
  return translations[currentLanguage]?.[key] || key
}

/**
 * Reports which catalogue {@link t} is reading from.
 *
 * @returns the active language code.
 */
export function getCurrentLanguage(): string {
  return currentLanguage
}

/**
 * Pushes the active catalogue into the page.
 *
 * Rewrites the `textContent` of every `[data-i18n]` element and the `placeholder` of every
 * `[data-i18n-placeholder]` element found under `root`.
 *
 * It then touches two things `root` does not scope, deliberately: `document.documentElement.lang`
 * and `document.title`. Both are global by nature and neither can be reached through
 * `textContent`, yet both are visible — the first to a screen reader, which otherwise pronounces
 * French with an English voice, and the second in the browser tab. Scoping them to the subtree
 * would mean a caller who translates one panel leaves the tab reading the old language, so they
 * happen on every pass regardless of `root`.
 *
 * @param root - the subtree whose elements are translated; defaults to the whole document.
 */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(element => {
    const key = element.dataset.i18n
    if (key) element.textContent = t(key)
  })

  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach(element => {
    const key = element.dataset.i18nPlaceholder
    if (key) element.setAttribute('placeholder', t(key))
  })

  document.documentElement.lang = currentLanguage
  document.title = t('page.title')
}
