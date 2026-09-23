/*
 * SCENARIOS - fichiers de traduction
 *  1. fr.json expose exactement les memes cles que en.json
 *  2. fr.json presente ces cles dans le meme ordre que en.json
 *  3. chaque cle francaise porte la valeur francaise convenue
 *  4. aucune valeur francaise n'est vide ni identique a un simple report de la cle
 */
import { describe, it, expect } from 'vitest'
import en from '../translations/en.json'
import fr from '../translations/fr.json'

const FR_ATTENDU: Record<string, string> = {
  'app.title': 'Mon Gestionnaire de Tâches',
  'task.add': 'Ajouter une Nouvelle Tâche',
  'task.placeholder': 'Saisir la description de la tâche',
  'priority.low': 'Priorité faible',
  'priority.medium': 'Priorité moyenne',
  'priority.high': 'Priorité élevée',
  'button.add': 'Ajouter la tâche',
  'filter.all': 'Toutes les tâches',
  'filter.active': 'Actives',
  'filter.completed': 'Terminées',
  'stats.total': 'Total des tâches',
  'stats.completed': 'Terminées',
  'button.delete': 'Supprimer',
  'footer.text': 'Conçu avec TypeScript'
}

describe('translations', () => {
  it('scenario 1 - le francais couvre toutes les cles de l anglais', () => {
    expect(Object.keys(fr).sort()).toEqual(Object.keys(en).sort())
  })

  it('scenario 2 - les cles francaises sont dans le meme ordre que les anglaises', () => {
    expect(Object.keys(fr)).toEqual(Object.keys(en))
  })

  it('scenario 3 - chaque cle porte la valeur francaise convenue', () => {
    expect(fr).toEqual(FR_ATTENDU)
  })

  it('scenario 4 - aucune valeur francaise n est vide ou laissee telle quelle', () => {
    const traductions = fr as Record<string, string>
    Object.keys(en).forEach(cle => {
      expect(traductions[cle], `cle ${cle}`).toBeTruthy()
      expect(traductions[cle], `cle ${cle}`).not.toBe(cle)
    })
  })
})
