export interface Task {
  id: number
  text: string
  priority: 'low' | 'medium' | 'high'
  completed: boolean
  createdAt: Date
}

export type TaskFilter = 'all' | 'active' | 'completed'

export interface Translations {
  [key: string]: {
    [key: string]: string
  }
}
