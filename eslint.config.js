import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'src/services/server.ts.bak'],
  },

  // Regras base de JS/TS recomendadas
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // Frontend (src/) — roda no navegador, com JSX/React
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2021 },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // Regras que a base "recommended" do typescript-eslint deixaria como erro,
      // mas que hoje têm muitas ocorrências legadas no projeto — começam como aviso
      // para não travar o build; o objetivo é ir corrigindo aos poucos.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Recomendado pelo React: pega closures "presas" (stale) em useEffect/useCallback/useMemo —
      // exatamente a categoria de bug que já apareceu neste projeto (ex.: fila offline).
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/rules-of-hooks': 'error',
    },
  },

  // Backend (server.ts, api/**) — roda em Node, sem JSX
  {
    files: ['server.ts', 'api/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // logs de servidor são esperados
    },
  },

  // Config files (vite.config.ts, etc.) — Node também
  {
    files: ['*.config.{ts,js}'],
    languageOptions: { globals: { ...globals.node } },
  },

  // Desliga regras de estilo que conflitariam com o Prettier (deixa o Prettier
  // cuidar de formatação; o ESLint cuida só de qualidade/bugs).
  eslintConfigPrettier
);
