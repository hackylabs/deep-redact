export default [
  {
    ignores: [
      'coverage/**',
      'dist/**',
      'benchmark.json',
      'load-test-results.json',
      'test/bench/**',
      'test/load/**',
      'test/unit/**',
    ],
  },
  {
    prettier: false,
    semicolon: false,
    space: 2,
    rules: {
      'n/no-unsupported-features/node-builtins': 'off',
      'unicorn/prevent-abbreviations': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.cts', '**/*.mts'],
    languageOptions: {
      parserOptions: {
        project: false,
      },
    },
    rules: {
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
]
