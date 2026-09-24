/**
 * SCÉNARIOS — plus rien en anglais quand la page est en français
 *
 * Compter les clés, comparer les catalogues et vérifier élément par élément
 * sortent tous en vert avec un titre anglais en travers d'une page française :
 * les coupables n'ont pas de clé, c'est précisément pour ça qu'on les rate.
 * On fait donc l'inverse : on parcourt la page rendue et on refuse toute chaîne
 * qui n'est pas une valeur du catalogue français.
 *
 *  1. Après démarrage, ajout d'une tâche et passage au français, aucune chaîne
 *     visible de la page n'est étrangère au catalogue français
 *  2. Le parcours a réellement vu la page (plus de 10 chaînes récoltées) — sans
 *     cette borne, un parcours qui ne ramène rien passerait au vert
 *  3. Les attributs visibles (placeholder, title, aria-label) sont couverts eux aussi
 *  4. Le titre du document est couvert lui aussi
 *  5. Les deux boutons de langue restent dans leur propre langue, par conception
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mountFixture, flush } from './fixture'
import frCatalogue from '../translations/fr.json'

const fr = frCatalogue as Record<string, string>

/** Le texte de la tâche saisie par l'utilisateur : il n'a pas à être traduit. */
const TYPED_TASK = 'Relire la demande de tirage'

/** Chaque bouton de langue est déjà écrit dans la langue qu'il sélectionne. */
const ALLOWED = new Set(['English', 'Français', TYPED_TASK])

/** Les attributs qui portent du texte lu par un humain. */
const TEXT_ATTRIBUTES = ['placeholder', 'title', 'aria-label']

function collectVisibleStrings(): string[] {
  const found: string[] = []

  const walker = document.createTreeWalker(document.documentElement, NodeFilter.SHOW_TEXT)
  let node = walker.nextNode()
  while (node) {
    found.push(node.textContent ?? '')
    node = walker.nextNode()
  }

  document.querySelectorAll('*').forEach(el => {
    for (const attr of TEXT_ATTRIBUTES) {
      const value = el.getAttribute(attr)
      if (value !== null) found.push(value)
    }
  })

  found.push(document.title)

  // Les compteurs, séparateurs et millésimes ne sont pas des mots.
  return found.map(s => s.trim()).filter(s => /\p{L}/u.test(s))
}

beforeEach(() => {
  localStorage.clear()
  vi.resetModules()
})

afterEach(() => {
  vi.resetModules()
  localStorage.clear()
})

describe('aucun anglais residuel sur la page francaise', () => {
  it('ne laisse aucune chaine etrangere au catalogue francais', async () => {
    mountFixture()
    await import('../main')
    await flush()

    const input = document.getElementById('task-input') as HTMLInputElement
    input.value = TYPED_TASK
    ;(document.getElementById('priority-select') as HTMLSelectElement).value = 'high'
    document
      .getElementById('task-form')!
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))

    document.getElementById('lang-fr')!.click()
    await flush()

    const strings = collectVisibleStrings()
    const french = new Set(Object.values(fr))

    // Sans cette borne, un parcours qui n'a rien collecte passerait au vert.
    expect(strings.length).toBeGreaterThan(10)
    expect(strings.filter(s => !french.has(s) && !ALLOWED.has(s))).toEqual([])
  })
})
