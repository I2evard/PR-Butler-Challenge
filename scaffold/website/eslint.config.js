import js from '@eslint/js'
import tseslint from 'typescript-eslint'

// Minimal rule set, chosen to match the style the repository already uses rather than to
// impose a new one: unused symbols, const-over-let, no var, strict equality.
export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: 'module'
    },
    rules: {
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'always'],
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
)
