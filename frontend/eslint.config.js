import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

// ESLint 9's core no-unused-vars can't see variables used as JSX tags
// (<motion.div>, <Tag>, <Icon>), so it reported every one as unused. This
// marks them used, the way eslint-plugin-react's jsx-uses-vars does, without
// pulling in that plugin for one rule.
const jsxUsesVars = {
  create(context) {
    return {
      JSXOpeningElement(node) {
        let name = node.name
        const member = name.type === 'JSXMemberExpression'
        while (name.type === 'JSXMemberExpression') name = name.object
        // <div> is an HTML tag, not a variable; <Tag> and <motion.div> are.
        if (name.type === 'JSXIdentifier' && (member || /^[A-Z]/.test(name.name))) {
          context.sourceCode.markVariableAsUsed(name.name, node)
        }
      },
    }
  },
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
    plugins: {
      local: { rules: { 'jsx-uses-vars': jsxUsesVars } },
    },
    rules: {
      'local/jsx-uses-vars': 'error',
      // Each context file exports its hook beside its provider, the usual
      // React pattern; the cost is a full reload when those two files are
      // edited in development, not a bug.
      'react-refresh/only-export-components': ['error', { allowConstantExport: true, allowExportNames: ['useAuth', 'useMovie'] }],
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
])
