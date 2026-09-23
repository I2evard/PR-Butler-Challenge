import { Translations } from './types'
import enTranslations from './translations/en.json'
import frTranslations from './translations/fr.json'

let currentLanguage = 'en'
const translations: Translations = {
  en: enTranslations,
  fr: frTranslations
}

export async function loadTranslations() {
  // Translations are imported statically
  return Promise.resolve()
}

export function setLanguage(lang: string) {
  currentLanguage = lang
}

export function t(key: string): string {
  return translations[currentLanguage]?.[key] || key
}

export function getCurrentLanguage() {
  return currentLanguage
}
