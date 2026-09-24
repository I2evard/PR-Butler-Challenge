import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// Le dépôt n'avait ni formateur ni linter. Ce fichier ne fait qu'activer les
// recommandations d'ESLint et de typescript-eslint : aucune règle maison n'est
// ajoutée, et aucune n'est désactivée. « 0 violation » veut donc dire
// « aucune sous les règles recommandées », pas « aucune dans l'absolu ».
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
      }
    }
  }
)
