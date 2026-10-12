// ESLint flat config — Tcalm Firefox Extension
// Strict, security-oriented ruleset. `npm run lint` also runs `tsc --noEmit`
// and scripts/audit.mjs (forbidden-pattern security audit).
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['node_modules/**', 'dist/**', 'package-out/**', '*.xpi', '*.zip'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['scripts/**/*.mjs', 'eslint.config.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        browser: 'readonly',
        chrome: 'readonly',
      },
    },
    rules: {
      // --- Security-critical (mirrored by scripts/audit.mjs) ---
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-script-url': 'error',

      // --- Code quality ---
      'no-console': 'off', // extension uses a namespaced logger (src/shared/utils/log.ts)
      eqeqeq: ['error', 'smart'],
      'no-var': 'error',
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      'prefer-promise-reject-errors': 'error',

      // --- TypeScript strictness ---
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-import-type-side-effects': 'error',
    },
  },
);
