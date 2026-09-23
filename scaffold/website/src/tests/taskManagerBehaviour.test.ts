/*
 * SCENARIOS - gestion des taches
 *  1. Cocher une tache la marque terminee ; la decocher la remet active
 *  2. Cocher une tache qui n'existe pas ne change rien et ne plante pas
 *  3. Supprimer une tache retire la bonne et laisse les autres intactes
 *  4. Supprimer une tache qui n'existe pas laisse la liste inchangee
 *  5. Le filtre « actives » n'affiche que les taches non terminees
 *  6. Le filtre « terminees » n'affiche que les taches terminees
 *  7. Le filtre « toutes » reaffiche l'ensemble des taches
 *  8. Dessiner la liste sans zone d'affichage ne plante pas
 *  9. Chaque tache donne une ligne, les compteurs suivent, les terminees sont marquees
 * 10. Cocher la case d'une ligne bascule la tache correspondante
 * 11. Cliquer le bouton de suppression d'une ligne retire cette tache
 * 12. Une tache dont le texte ressemble a du HTML s'affiche comme du texte, jamais comme du HTML
 * 13. Les taches survivent a un rechargement et la numerotation reprend au bon endroit
 * 14. Un stockage illisible (JSON invalide) redemarre sur une liste vide sans plantage
 * 15. Un stockage qui ne contient pas une liste de taches redemarre sur une liste vide
 * 16. Un stockage contenant « null » redemarre sur une liste vide
 * 17. Le bouton de suppression est libelle dans la langue courante
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { TaskManager } from '../taskManager'
import { setLanguage } from '../i18n'

const PAGE = readFileSync(resolve(__dirname, '../../index.html'), 'utf-8')
const APP_MARKUP = PAGE.slice(PAGE.indexOf('<body>') + 6, PAGE.indexOf('</body>'))

function lignes(): HTMLLIElement[] {
  return Array.from(document.querySelectorAll('#tasks li'))
}

function textesAffiches(): string[] {
  return Array.from(document.querySelectorAll('#tasks .task-text')).map(n => n.textContent ?? '')
}

// Construit un gestionnaire en absorbant une eventuelle exception : le test echoue alors
// sur « construit » qui vaut undefined, au lieu de recracher le message d'erreur brut.
function construireDepuisLeStockage(contenu: string) {
  localStorage.setItem('tasks', contenu)
  let construit: TaskManager | undefined
  let aPlante = false
  try {
    construit = new TaskManager()
  } catch {
    aPlante = true
  }
  return { construit, aPlante }
}

describe('TaskManager - comportement', () => {
  let manager: TaskManager

  beforeEach(() => {
    localStorage.clear()
    setLanguage('en')
    document.body.innerHTML = APP_MARKUP
    manager = new TaskManager()
  })

  it('scenario 1 - bascule une tache puis la ramene a son etat initial', () => {
    manager.addTask('Une tache', 'low')
    const id = manager.getTasks()[0].id

    manager.toggleTask(id)
    expect(manager.getTasks()[0].completed).toBe(true)
    expect(manager.getCompletedCount()).toBe(1)

    manager.toggleTask(id)
    expect(manager.getTasks()[0].completed).toBe(false)
    expect(manager.getCompletedCount()).toBe(0)
  })

  it('scenario 2 - ignorer une bascule sur un identifiant inconnu', () => {
    manager.addTask('Une tache', 'low')

    expect(() => manager.toggleTask(9999)).not.toThrow()
    expect(manager.getTasks()).toHaveLength(1)
    expect(manager.getTasks()[0].completed).toBe(false)
  })

  it('scenario 3 - supprime la bonne tache', () => {
    manager.addTask('Premiere', 'low')
    manager.addTask('Deuxieme', 'high')
    const idPremiere = manager.getTasks()[0].id

    manager.deleteTask(idPremiere)

    expect(manager.getTasks()).toHaveLength(1)
    expect(manager.getTasks()[0].text).toBe('Deuxieme')
    expect(textesAffiches()).toEqual(['Deuxieme'])
  })

  it('scenario 4 - une suppression sur un identifiant inconnu laisse la liste intacte', () => {
    manager.addTask('Premiere', 'low')
    manager.addTask('Deuxieme', 'high')

    expect(() => manager.deleteTask(9999)).not.toThrow()
    expect(manager.getTasks().map(t => t.text)).toEqual(['Premiere', 'Deuxieme'])
  })

  it('scenario 5 - le filtre actives n affiche que les taches non terminees', () => {
    manager.addTask('Active', 'low')
    manager.addTask('Terminee', 'high')
    manager.toggleTask(manager.getTasks()[1].id)

    manager.setFilter('active')

    expect(textesAffiches()).toEqual(['Active'])
  })

  it('scenario 6 - le filtre terminees n affiche que les taches terminees', () => {
    manager.addTask('Active', 'low')
    manager.addTask('Terminee', 'high')
    manager.toggleTask(manager.getTasks()[1].id)

    manager.setFilter('completed')

    expect(textesAffiches()).toEqual(['Terminee'])
  })

  it('scenario 7 - le filtre toutes reaffiche l ensemble', () => {
    manager.addTask('Active', 'low')
    manager.addTask('Terminee', 'high')
    manager.toggleTask(manager.getTasks()[1].id)
    manager.setFilter('completed')

    manager.setFilter('all')

    expect(textesAffiches()).toEqual(['Active', 'Terminee'])
  })

  it('scenario 8 - dessiner sans zone d affichage ne plante pas', () => {
    document.body.innerHTML = ''

    expect(() => manager.render()).not.toThrow()
    expect(() => manager.addTask('Sans page', 'low')).not.toThrow()
    expect(manager.getTasks()).toHaveLength(1)
  })

  it('scenario 9 - une ligne par tache, compteurs a jour, terminees marquees', () => {
    manager.addTask('Premiere', 'low')
    manager.addTask('Deuxieme', 'medium')
    manager.addTask('Troisieme', 'high')
    manager.toggleTask(manager.getTasks()[2].id)

    expect(lignes()).toHaveLength(3)
    expect(document.getElementById('total-count')?.textContent).toBe('3')
    expect(document.getElementById('completed-count')?.textContent).toBe('1')
    expect(lignes()[0].classList.contains('completed')).toBe(false)
    expect(lignes()[2].classList.contains('completed')).toBe(true)
    const cases = document.querySelectorAll<HTMLInputElement>('#tasks .task-checkbox')
    expect(cases[2].checked).toBe(true)
    expect(document.querySelectorAll('#tasks .priority-badge.priority-high')).toHaveLength(1)
  })

  it('scenario 10 - cocher la case d une ligne bascule la tache', () => {
    manager.addTask('Une tache', 'low')
    const laCase = document.querySelector('#tasks .task-checkbox') as HTMLInputElement

    laCase.checked = true
    laCase.dispatchEvent(new Event('change'))

    expect(manager.getTasks()[0].completed).toBe(true)
    expect(document.getElementById('completed-count')?.textContent).toBe('1')
  })

  it('scenario 11 - cliquer le bouton de suppression retire la tache', () => {
    manager.addTask('Premiere', 'low')
    manager.addTask('Deuxieme', 'high')

    const premierBouton = document.querySelectorAll('#tasks .delete-btn')[0] as HTMLButtonElement
    premierBouton.click()

    expect(manager.getTasks().map(t => t.text)).toEqual(['Deuxieme'])
    expect(lignes()).toHaveLength(1)
  })

  it('scenario 12 - un texte de tache ressemblant a du HTML reste du texte', () => {
    const charge = '<img src=x onerror=alert(1)>'

    manager.addTask(charge, 'low')

    const cellule = document.querySelector('#tasks .task-text') as HTMLElement
    expect(cellule.querySelector('img')).toBeNull()
    expect(cellule.children).toHaveLength(0)
    expect(cellule.textContent).toBe(charge)
    expect(document.querySelector('#tasks img')).toBeNull()
  })

  it('scenario 13 - les taches survivent au rechargement et la numerotation reprend', () => {
    manager.addTask('Premiere', 'low')
    manager.addTask('Deuxieme', 'high')

    const rechargee = new TaskManager()
    expect(rechargee.getTasks().map(t => t.text)).toEqual(['Premiere', 'Deuxieme'])

    rechargee.addTask('Troisieme', 'medium')
    expect(rechargee.getTasks().map(t => t.id)).toEqual([1, 2, 3])
  })

  it('scenario 14 - un stockage illisible redemarre sur une liste vide', () => {
    const { construit, aPlante } = construireDepuisLeStockage('{{{pas du json')

    expect(aPlante, 'la construction a leve une exception').toBe(false)
    expect(construit?.getTasks()).toEqual([])
    construit?.addTask('Apres incident', 'low')
    expect(construit?.getTasks()).toHaveLength(1)
  })

  it('scenario 15 - un stockage qui n est pas une liste redemarre sur une liste vide', () => {
    const { construit, aPlante } = construireDepuisLeStockage('{"a":1}')

    expect(aPlante, 'la construction a leve une exception').toBe(false)
    expect(construit?.getTasks()).toEqual([])
  })

  it('scenario 16 - un stockage contenant null redemarre sur une liste vide', () => {
    const { construit, aPlante } = construireDepuisLeStockage('null')

    expect(aPlante, 'la construction a leve une exception').toBe(false)
    expect(construit?.getTasks()).toEqual([])
  })

  it('scenario 17 - le bouton de suppression suit la langue courante', () => {
    manager.addTask('Une tache', 'low')
    expect(document.querySelector('#tasks .delete-btn')?.textContent).toBe('Delete')

    setLanguage('fr')
    manager.render()

    expect(document.querySelector('#tasks .delete-btn')?.textContent).toBe('Supprimer')
  })
})
