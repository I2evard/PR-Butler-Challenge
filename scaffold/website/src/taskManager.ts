import { Task, TaskFilter } from './types'
import { t } from './i18n'
import { showError } from './ui'

/** Clé sous laquelle la liste est conservée dans localStorage. */
const STORAGE_KEY = 'tasks'

/** Les seules priorités acceptées à la relecture du stockage. */
const PRIORITIES: readonly Task['priority'][] = ['low', 'medium', 'high']

/**
 * La liste de tâches et son rendu.
 *
 * Elle est sa propre source de vérité : le DOM est reconstruit à partir d'elle à
 * chaque changement, jamais lu pour savoir ce qui existe. Le stockage local n'est
 * qu'un miroir, et il est traité comme une entrée hostile — n'importe qui peut
 * l'éditer depuis la console du navigateur.
 */
export class TaskManager {
  private tasks: Task[] = []
  private filter: TaskFilter = 'all'
  private nextId = 1

  /**
   * Construit le gestionnaire et relit immédiatement le stockage local.
   *
   * Une relecture qui échoue ne fait pas échouer la construction : l'objet reste
   * utilisable avec une liste vide, et l'utilisateur en est averti.
   */
  constructor() {
    this.loadFromStorage()
  }

  /**
   * Inscrit une nouvelle tâche, la persiste et redessine la liste.
   *
   * Le texte est pris tel quel : c'est le rendu qui garantit qu'il ne sera jamais
   * interprété comme du balisage.
   *
   * @param text Texte saisi par l'utilisateur.
   * @param priority Priorité choisie dans la liste déroulante.
   */
  addTask(text: string, priority: 'low' | 'medium' | 'high') {
    const task: Task = {
      id: this.allocateId(),
      text,
      priority,
      completed: false,
      createdAt: new Date()
    }
    this.tasks.push(task)
    this.saveToStorage()
    this.render()
  }

  /**
   * Bascule une tâche entre « à faire » et « terminée ».
   *
   * Un identifiant inconnu ne fait rien et ne lève pas : le rendu précédent a pu
   * être construit avant une suppression venue d'un autre onglet.
   *
   * @param id Identifiant de la tâche visée.
   */
  toggleTask(id: number) {
    const task = this.tasks.find(t => t.id === id)
    if (task) {
      task.completed = !task.completed
      this.saveToStorage()
      this.render()
    }
  }

  /**
   * Retire définitivement une tâche, persiste et redessine.
   *
   * @param id Identifiant de la tâche à retirer ; un identifiant absent est sans effet.
   */
  deleteTask(id: number) {
    this.tasks = this.tasks.filter(t => t.id !== id)
    this.saveToStorage()
    this.render()
  }

  /**
   * Change le sous-ensemble affiché sans rien supprimer.
   *
   * Le filtre ne touche que l'affichage : `getTasks()` reste complet, ce qui évite
   * qu'une sauvegarde déclenchée pendant un filtrage n'écrive une liste amputée.
   *
   * @param filter `all`, `active` ou `completed`.
   */
  setFilter(filter: TaskFilter) {
    this.filter = filter
    this.render()
  }

  /**
   * Reconstruit la liste affichée à partir de l'état courant.
   *
   * Le contenu précédent est jeté plutôt que rapiécé : c'est ce qui fait qu'un
   * changement de langue repeint aussi les libellés construits en code.
   *
   * Ne fait rien si la page ne porte pas de liste — le module est importé par des
   * tests et par des pages partielles.
   */
  render() {
    const taskList = document.getElementById('tasks')
    if (!taskList) return

    taskList.innerHTML = ''
    this.filterTasks().forEach(task => taskList.appendChild(this.buildTaskRow(task)))

    this.updateStats()
  }

  /**
   * Applique le filtre courant sans toucher à la liste réelle.
   *
   * @returns Les tâches à afficher, dans l'ordre d'ajout.
   */
  private filterTasks(): Task[] {
    if (this.filter === 'active') return this.tasks.filter(task => !task.completed)
    if (this.filter === 'completed') return this.tasks.filter(task => task.completed)
    return this.tasks
  }

  /**
   * Fabrique la ligne d'une tâche, écouteurs compris.
   *
   * @param task La tâche à représenter.
   * @returns L'élément `<li>` prêt à être inséré.
   */
  private buildTaskRow(task: Task): HTMLLIElement {
    const li = document.createElement('li')
    li.className = `task-item ${task.completed ? 'completed' : ''}`

    const content = document.createElement('div')
    content.className = 'task-content'

    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'task-checkbox'
    checkbox.checked = task.completed
    checkbox.addEventListener('change', () => this.toggleTask(task.id))

    const text = document.createElement('span')
    text.className = 'task-text'
    // textContent et jamais innerHTML : le texte vient de l'utilisateur.
    text.textContent = task.text

    const badge = document.createElement('span')
    // La priorité BRUTE reste dans la classe : le style ne doit pas dépendre de la langue.
    badge.className = `priority-badge priority-${task.priority}`
    badge.textContent = t(`badge.${task.priority}`)

    content.appendChild(checkbox)
    content.appendChild(text)
    content.appendChild(badge)

    const deleteBtn = document.createElement('button')
    deleteBtn.className = 'delete-btn'
    deleteBtn.textContent = t('button.delete')
    deleteBtn.addEventListener('click', () => this.deleteTask(task.id))

    li.appendChild(content)
    li.appendChild(deleteBtn)
    return li
  }

  /**
   * Met les deux compteurs de la page à jour.
   *
   * Compte sur la liste COMPLÈTE et non sur le sous-ensemble affiché : un total qui
   * changerait en cliquant un filtre ferait croire à une perte de tâches.
   */
  private updateStats() {
    const totalCount = document.getElementById('total-count')
    const completedCount = document.getElementById('completed-count')

    if (totalCount) totalCount.textContent = String(this.tasks.length)
    if (completedCount) {
      completedCount.textContent = String(this.tasks.filter(t => t.completed).length)
    }
  }

  /**
   * Réserve un identifiant qu'aucune tâche en place n'utilise.
   *
   * `max + 1` ne convient pas : arrivé à `Number.MAX_SAFE_INTEGER`, l'incrément
   * SATURE et rend deux fois le même nombre, donc deux tâches partagent un
   * identifiant et supprimer l'une supprime l'autre. On cherche donc un trou réel,
   * en repartant du début si le haut de la plage est atteint.
   */
  private allocateId(): number {
    const used = new Set(this.tasks.map(task => task.id))

    let candidate = this.nextId
    while (candidate <= Number.MAX_SAFE_INTEGER && used.has(candidate)) candidate++

    if (candidate > Number.MAX_SAFE_INTEGER) {
      candidate = 1
      while (candidate <= Number.MAX_SAFE_INTEGER && used.has(candidate)) candidate++
    }

    this.nextId = candidate < Number.MAX_SAFE_INTEGER ? candidate + 1 : 1
    return candidate
  }

  /**
   * Écrit la liste dans le stockage local.
   *
   * N'échoue jamais bruyamment : un quota dépassé ou un mode privé ne doit pas
   * interrompre l'action en cours, mais ne doit pas non plus passer inaperçu.
   */
  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.tasks))
    } catch {
      // Quota dépassé, mode privé, stockage désactivé : la page a l'air normale et
      // ne retient plus rien. Le silence ferait perdre des tâches sans le dire.
      showError('error.save')
    }
  }

  /**
   * Relit la liste depuis le stockage local en la traitant comme une entrée hostile.
   *
   * N'importe qui peut éditer `localStorage` depuis la console : le contenu est donc
   * analysé sous garde, validé entrée par entrée, et tout ce qui ne tient pas est
   * écarté plutôt que de faire tomber la page sur un écran blanc.
   */
  private loadFromStorage() {
    // TODO: migrate to API backend
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return

    let parsed: unknown
    try {
      parsed = JSON.parse(stored)
    } catch {
      this.discardStorage()
      return
    }

    if (!Array.isArray(parsed)) {
      this.discardStorage()
      return
    }

    const seen = new Set<number>()
    const kept: Task[] = []
    for (const entry of parsed) {
      const task = this.toTask(entry)
      if (!task || seen.has(task.id)) continue
      seen.add(task.id)
      kept.push(task)
    }

    this.tasks = kept
    if (kept.length !== parsed.length) this.reportDiscarded()

    const maxId = kept.reduce((highest, task) => Math.max(highest, task.id), 0)
    this.nextId = maxId < Number.MAX_SAFE_INTEGER ? maxId + 1 : 1
  }

  /**
   * Valide une entrée relue du stockage et la convertit en tâche.
   *
   * @returns La tâche, ou `null` si l'entrée est inexploitable.
   */
  private toTask(entry: unknown): Task | null {
    if (typeof entry !== 'object' || entry === null) return null
    const raw = entry as Record<string, unknown>

    // Un identifiant doit être un entier sûr et strictement positif : au-delà,
    // l'arithmétique de JavaScript ne distingue plus deux valeurs voisines.
    if (!Number.isSafeInteger(raw.id) || (raw.id as number) <= 0) return null
    if (typeof raw.text !== 'string') return null
    if (typeof raw.priority !== 'string') return null
    if (!PRIORITIES.includes(raw.priority as Task['priority'])) return null
    if (typeof raw.completed !== 'boolean') return null

    const createdAt = new Date(raw.createdAt as string)

    return {
      id: raw.id as number,
      text: raw.text,
      priority: raw.priority as Task['priority'],
      completed: raw.completed,
      createdAt: Number.isNaN(createdAt.getTime()) ? new Date() : createdAt
    }
  }

  /** Abandonne un contenu de stockage inexploitable et repart d'une liste vide. */
  private discardStorage() {
    this.tasks = []
    this.reportDiscarded()
  }

  /** Signale à l'utilisateur que des tâches enregistrées ont été écartées. */
  private reportDiscarded() {
    showError('error.load')
  }

  /**
   * Rend la liste complète, filtre courant ignoré.
   *
   * @returns Le tableau interne lui-même — les appelants ne doivent pas le muter.
   */
  getTasks() {
    return this.tasks
  }

  /**
   * Compte les tâches terminées, filtre courant ignoré.
   */
  getCompletedCount() {
    return this.tasks.filter(t => t.completed).length
  }
}
