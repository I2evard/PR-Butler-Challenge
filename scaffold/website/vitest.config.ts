import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      // Sans ce seuil, `vitest run --coverage` imprime un tableau et sort en 0 quelle
      // que soit la couverture : lire le nombre dans le tableau est une mesure, pas
      // une barrière. C'est le coureur qui doit refuser.
      thresholds: { statements: 80 }
    }
  }
})
