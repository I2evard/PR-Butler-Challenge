import { TaskManager } from './taskManager'
import { loadTranslations, setLanguage, applyTranslations } from './i18n'
import { showError } from './ui'
import { TaskFilter } from './types'
import './styles.css'

let taskManager: TaskManager

/**
 * Démarre l'application : catalogues, première traduction de la page, liste de
 * tâches relue du stockage, câblage des commandes, premier rendu.
 *
 * L'ordre n'est pas décoratif. Les traductions sont appliquées avant que le
 * gestionnaire ne soit construit, pour qu'une erreur de relecture du stockage
 * s'affiche déjà dans la bonne langue.
 */
async function init() {
  await loadTranslations()
  applyTranslations()
  taskManager = new TaskManager()
  setupEventListeners()
  taskManager.render()
}

/**
 * Branche les commandes de la page sur le gestionnaire : soumission du formulaire,
 * choix de la langue, boutons de filtre.
 *
 * Appelée une seule fois au démarrage ; les lignes de tâches, elles, rebranchent
 * leurs propres écouteurs à chaque rendu puisqu'elles sont recréées.
 */
function setupEventListeners() {
  const form = document.getElementById('task-form') as HTMLFormElement
  const langEnBtn = document.getElementById('lang-en')
  const langFrBtn = document.getElementById('lang-fr')

  form?.addEventListener('submit', handleSubmit)
  langEnBtn?.addEventListener('click', () => switchLanguage('en'))
  langFrBtn?.addEventListener('click', () => switchLanguage('fr'))

  const filterBtns = document.querySelectorAll('.filter-btn')
  filterBtns.forEach(btn => {
    btn.addEventListener('click', e => {
      const target = e.target as HTMLElement
      const filter = target.dataset.filter
      if (filter) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'))
        target.classList.add('active')
        taskManager.setFilter(filter as TaskFilter)
      }
    })
  })
}

/**
 * Transforme une soumission du formulaire en nouvelle tâche.
 *
 * Empêche le rechargement de page, ignore une saisie vide ou faite d'espaces, et
 * vide le champ pour que la saisie suivante parte de zéro.
 *
 * @param e L'événement `submit` du formulaire.
 */
function handleSubmit(e: Event) {
  e.preventDefault()
  const input = document.getElementById('task-input') as HTMLInputElement
  const select = document.getElementById('priority-select') as HTMLSelectElement
  if (input.value.trim()) {
    taskManager.addTask(input.value, select.value as 'low' | 'medium' | 'high')
    input.value = ''
  }
}

/**
 * Bascule toute l'interface dans une autre langue.
 *
 * Déplacer la classe `active` ne suffisait pas : la page restait en anglais. Il faut
 * REPEINDRE le balisage statique (`applyTranslations`) ET REJOUER le rendu, parce
 * que le badge de priorité et le bouton de suppression sont construits en code et
 * qu'aucun `data-i18n` ne les atteint.
 *
 * @param lang Code de la langue à activer (`en` ou `fr`).
 */
function switchLanguage(lang: string) {
  setLanguage(lang)

  document.querySelectorAll('.language-selector button').forEach(btn => {
    btn.classList.remove('active')
  })

  const activeBtn = document.getElementById(`lang-${lang}`)
  activeBtn?.classList.add('active')

  applyTranslations()
  taskManager.render()
}

init().catch(error => {
  // La console seule ne suffit pas : un démarrage manqué laisse une page muette
  // que l'utilisateur croit simplement vide. Le détail reste pour le diagnostic.
  console.error('init failed', error)
  showError('error.init')
})
