import { Translations } from './types'
import enTranslations from './translations/en.json'
import frTranslations from './translations/fr.json'

let currentLanguage = 'en'
const translations: Translations = {
  en: enTranslations,
  fr: frTranslations
}

/**
 * Point d'entrée asynchrone du chargement des catalogues.
 *
 * Les deux catalogues sont aujourd'hui importés statiquement et intégrés au paquet :
 * la promesse est déjà résolue. La signature reste asynchrone pour que le passage à
 * un chargement par requête réseau ne force pas à réécrire les appelants.
 */
export async function loadTranslations(): Promise<void> {
  // Translations are imported statically
  return Promise.resolve()
}

/**
 * Choisit la langue dans laquelle `t()` répondra désormais.
 *
 * Ne touche pas à la page : c'est `applyTranslations()` qui la repeint. Les deux sont
 * séparés parce que le rendu des tâches doit être rejoué entre les deux.
 *
 * @param lang Code de langue (`en`, `fr`). Un code inconnu fait retomber `t()` sur les clés.
 */
export function setLanguage(lang: string): void {
  currentLanguage = lang
}

/**
 * Rend la chaîne traduite d'une clé.
 *
 * Retombe sur la clé elle-même quand elle manque au catalogue, ou quand la langue
 * courante est inconnue : une clé nue à l'écran est un défaut visible, alors qu'une
 * chaîne vide passerait inaperçue jusqu'en production.
 *
 * @param key Clé de catalogue, par exemple `button.add`.
 * @returns La traduction, ou la clé si elle n'existe pas.
 */
export function t(key: string): string {
  return translations[currentLanguage]?.[key] || key
}

/**
 * Rend la langue actuellement sélectionnée.
 *
 * Sert aux appelants qui doivent décider quelque chose d'après la langue plutôt que
 * de traduire une chaîne — par exemple aligner l'attribut `lang` du document.
 */
export function getCurrentLanguage(): string {
  return currentLanguage
}

/**
 * Repeint la page dans la langue courante.
 *
 * Sans elle, un catalogue français complet n'affiche rien de français : changer de
 * langue ne faisait que déplacer une classe CSS. Elle traduit tout élément porteur de
 * `data-i18n` (son texte) ou de `data-i18n-placeholder` (son attribut `placeholder`),
 * puis aligne l'attribut `lang` du document et son titre — deux choses qu'aucun
 * élément ne porte et que personne d'autre ne met à jour.
 *
 * Le titre est réécrit à chaque appel, y compris en anglais : c'est ce qui garantit
 * qu'un démarrage qui oublierait de traduire se voie tout de suite.
 *
 * @param root Sous-arbre à traduire. Par défaut le document entier ; une racine plus
 *             étroite permet de ne repeindre qu'un fragment fraîchement construit.
 */
export function applyTranslations(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n as string)
  })

  root.querySelectorAll<HTMLElement>('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.dataset.i18nPlaceholder as string))
  })

  document.documentElement.lang = currentLanguage
  document.title = t('page.title')
}
