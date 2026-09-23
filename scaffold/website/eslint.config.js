import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// Minimal, deliberately conventional rule set: the repository shipped without a linter,
// so these rules are the ones this run introduces. "0 violations" means "none under
// these rules", not "the code is perfect" — a stricter config would find more.
export default tseslint.config(
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always']
    }
  }
)
