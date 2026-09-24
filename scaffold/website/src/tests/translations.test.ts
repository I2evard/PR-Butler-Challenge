/**
 * SCÉNARIOS — intégrité des catalogues de traduction
 *
 *  1. Les 14 clés exigées par l'énoncé sont présentes dans le catalogue anglais
 *  2. Les 14 clés exigées par l'énoncé sont présentes dans le catalogue français
 *  3. Aucune clé du français n'est absente de l'anglais (et réciproquement)
 *  4. Les clés apparaissent dans le MÊME ORDRE dans les deux fichiers
 *  5. Les clés du contrat apparaissent dans l'ordre annoncé par le contrat
 *  6. Chaque catalogue contient au moins les 14 clés exigées (plancher, pas plafond)
 *  7. Aucune valeur n'est vide ou faite d'espaces
 *  8. Aucune valeur française n'est restée identique à sa valeur anglaise
 *  9. Les libellés de badge valent LOW/MEDIUM/HIGH en anglais, BASSE/MOYENNE/HAUTE en français
 * 10. Les clés d'erreur error.init / error.load / error.save existent et sont traduites
 */
import { describe, it, expect } from 'vitest'
import enCatalogue from '../translations/en.json'
import frCatalogue from '../translations/fr.json'

const en = enCatalogue as Record<string, string>
const fr = frCatalogue as Record<string, string>

/** Les 14 clés nommées comme obligatoires dans l'énoncé. */
const REQUIRED_KEYS = [
  'app.title',
  'task.add',
  'task.placeholder',
  'priority.low',
  'priority.medium',
  'priority.high',
  'button.add',
  'filter.all',
  'filter.active',
  'filter.completed',
  'stats.total',
  'stats.completed',
  'button.delete',
  'footer.text'
]

/** L'ordre imposé par le contrat. D'autres clés peuvent s'y intercaler. */
const CONTRACT_ORDER = [
  'page.title',
  'app.title',
  'task.add',
  'task.placeholder',
  'priority.low',
  'priority.medium',
  'priority.high',
  'button.add',
  'task.list',
  'filter.all',
  'filter.active',
  'filter.completed',
  'badge.low',
  'badge.medium',
  'badge.high',
  'stats.total',
  'stats.completed',
  'button.delete',
  'footer.text',
  'error.init',
  'error.load',
  'error.save'
]

/** Ces clés désignent du texte affiché : le français DOIT différer de l'anglais. */
const MUST_DIFFER = CONTRACT_ORDER

describe('catalogues de traduction', () => {
  it.each(REQUIRED_KEYS)('le catalogue anglais contient la cle %s', key => {
    expect(Object.prototype.hasOwnProperty.call(en, key)).toBe(true)
  })

  it.each(REQUIRED_KEYS)('le catalogue francais contient la cle %s', key => {
    expect(Object.prototype.hasOwnProperty.call(fr, key)).toBe(true)
  })

  it('aucune cle anglaise ne manque au francais', () => {
    const manquantes = Object.keys(en).filter(k => !(k in fr))
    expect(manquantes).toEqual([])
  })

  it('aucune cle francaise ne manque a l anglais', () => {
    const manquantes = Object.keys(fr).filter(k => !(k in en))
    expect(manquantes).toEqual([])
  })

  it('les cles sont dans le meme ordre dans les deux fichiers', () => {
    expect(Object.keys(en)).toEqual(Object.keys(fr))
  })

  it('les cles du contrat apparaissent dans l ordre annonce', () => {
    const ordreEn = Object.keys(en).filter(k => CONTRACT_ORDER.includes(k))
    expect(ordreEn).toEqual(CONTRACT_ORDER)
  })

  it('chaque catalogue contient au moins les 14 cles exigees', () => {
    // plancher, pas plafond : jamais d'egalite stricte sur le nombre de cles
    expect(Object.keys(en).length).toBeGreaterThanOrEqual(REQUIRED_KEYS.length)
    expect(Object.keys(fr).length).toBeGreaterThanOrEqual(REQUIRED_KEYS.length)
  })

  it('aucune valeur n est vide', () => {
    const videsEn = Object.entries(en).filter(([, v]) => typeof v !== 'string' || v.trim() === '')
    const videsFr = Object.entries(fr).filter(([, v]) => typeof v !== 'string' || v.trim() === '')
    expect(videsEn).toEqual([])
    expect(videsFr).toEqual([])
  })

  it('aucune valeur francaise n est restee identique a l anglaise', () => {
    const nonTraduites = MUST_DIFFER.filter(k => k in en && k in fr && en[k] === fr[k])
    expect(nonTraduites).toEqual([])
  })

  it('les libelles de badge sont ceux du contrat', () => {
    expect(en['badge.low']).toBe('LOW')
    expect(en['badge.medium']).toBe('MEDIUM')
    expect(en['badge.high']).toBe('HIGH')
    expect(fr['badge.low']).toBe('BASSE')
    expect(fr['badge.medium']).toBe('MOYENNE')
    expect(fr['badge.high']).toBe('HAUTE')
  })

  it('les cles d erreur existent et sont traduites', () => {
    for (const key of ['error.init', 'error.load', 'error.save']) {
      expect(typeof en[key]).toBe('string')
      expect(typeof fr[key]).toBe('string')
      expect(fr[key]).not.toBe(en[key])
    }
  })
})
