import { t } from './i18n'

/** Identifiant de la bannière déclarée dans index.html. */
const ERROR_BANNER_ID = 'app-error'

/**
 * Porte une panne jusqu'à l'utilisateur plutôt que jusqu'à la console.
 *
 * Une écriture de stockage refusée ou un démarrage manqué laissent sinon une page
 * d'apparence normale mais qui ne retient plus rien : l'utilisateur continue à
 * saisir des tâches et les perd sans jamais l'apprendre.
 *
 * La clé est posée sur la bannière en `data-i18n`, ce qui fait suivre le message
 * lors d'un changement de langue sans avoir à mémoriser l'erreur en cours ailleurs.
 *
 * @param key Clé de catalogue du message à afficher (`error.load`, `error.save`…).
 */
export function showError(key: string): void {
  const banner = document.getElementById(ERROR_BANNER_ID)
  if (!banner) return
  banner.dataset.i18n = key
  banner.textContent = t(key)
  banner.removeAttribute('hidden')
}

/**
 * Remet la bannière d'erreur au repos : masquée, vide, et sans clé de traduction
 * résiduelle qui la ferait réapparaître au prochain changement de langue.
 *
 * Volontairement JAMAIS appelée par le rendu : une erreur d'écriture serait effacée
 * par le rendu qui la suit immédiatement, et la panne redeviendrait silencieuse.
 */
export function clearError(): void {
  const banner = document.getElementById(ERROR_BANNER_ID)
  if (!banner) return
  delete banner.dataset.i18n
  banner.textContent = ''
  banner.setAttribute('hidden', '')
}
