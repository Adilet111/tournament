import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // dist = build output; webapp = the original standalone design prototype
  // (not part of the Vite build); new_code = scratch experiments. Lint targets
  // the shipped app under src/ only.
  globalIgnores(['dist', 'webapp', 'new_code']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  {
    // Config files run in Node, not the browser.
    files: ['*.config.js', 'vite.config.js'],
    languageOptions: { globals: globals.node },
  },
])
