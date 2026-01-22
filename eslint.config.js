import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = (value) => {
    if (value === undefined) return value
    const json = JSON.stringify(value)
    return json === undefined ? value : JSON.parse(json)
  }
}

if (globalThis.AbortSignal && typeof globalThis.AbortSignal.prototype.throwIfAborted !== 'function') {
  globalThis.AbortSignal.prototype.throwIfAborted = function () {
    if (this.aborted) {
      throw new Error('AbortError')
    }
  }
}

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-hooks/set-state-in-effect': 'off',
      'react-refresh/only-export-components': ['error', {
        allowExportNames: ['useAuth', 'useLists', 'useTheme', 'useWatchProgress', 'useWatchlist'],
      }],
    },
  },
  {
    files: ['api/**/*.js', 'server.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
])
