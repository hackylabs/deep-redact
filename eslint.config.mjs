import js from '@eslint/js'
import stylistic from '@stylistic/eslint-plugin'
import unicorn from 'eslint-plugin-unicorn'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const typescriptFiles = ['**/*.ts', '**/*.mts', '**/*.cts']
const javascriptFiles = ['**/*.js', '**/*.mjs', '**/*.cjs']

const stylisticRules = {
  '@stylistic/brace-style': 'off',
  '@stylistic/function-call-argument-newline': 'off',
  '@stylistic/function-paren-newline': 'off',
  '@stylistic/member-delimiter-style': [
    'error',
    {
      multiline: {
        delimiter: 'semi',
        requireLast: true,
      },
      singleline: {
        delimiter: 'semi',
        requireLast: false,
      },
    },
  ],
  '@stylistic/operator-linebreak': 'off',
  '@stylistic/quotes': [
    'error',
    'single',
    {
      avoidEscape: true,
    },
  ],
  '@stylistic/semi': ['error', 'never'],
}

export default tseslint.config(
  {
    ignores: [
      '**/coverage/**',
      '**/dist/**',
      'benchmark.json',
      'load-test-results.json',
      'test/bench/**',
      'test/unit/**',
    ],
  },
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.builtin,
        ...globals.node,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: stylisticRules,
  },
  js.configs.recommended,
  unicorn.configs.recommended,
  {
    rules: {
      'unicorn/filename-case': 'off',
      'unicorn/import-style': 'off',
      'unicorn/no-null': 'off',
      'unicorn/no-useless-undefined': 'off',
      'unicorn/prefer-array-index-of': 'off',
      'unicorn/prefer-global-this': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    files: typescriptFiles,
    extends: [
      ...tseslint.configs.recommended,
      ...tseslint.configs.stylistic,
    ],
    rules: {
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
          varsIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    files: javascriptFiles,
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    files: ['**/*.test.ts', '**/vitest*.config.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'no-sparse-arrays': 'off',
      'unicorn/consistent-function-scoping': 'off',
    },
  },
  {
    files: ['src/core/runtime/redact-value.ts'],
    rules: {
      'unicorn/no-new-array': 'off',
      'unicorn/prefer-spread': 'off',
    },
  },
  {
    files: ['test/fixtures/consumers/types-cjs/**/*.cts'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
