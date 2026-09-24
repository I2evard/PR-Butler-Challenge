/**
 * Une tâche telle qu'elle vit en mémoire.
 *
 * `createdAt` est un vrai `Date` y compris après relecture du stockage, où JSON ne
 * sait rendre qu'une chaîne : la conversion se fait à la validation.
 */
export interface Task {
  id: number
  text: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  createdAt: Date
}

/** Le sous-ensemble de tâches que la liste affiche. N'altère jamais les données. */
export type TaskFilter = 'all' | 'active' | 'completed'

/** Les catalogues de traduction, indexés par code de langue puis par clé. */
export interface Translations {
  [key: string]: {
    [key: string]: string
  }
}
