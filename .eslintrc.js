module.exports = {
  extends: ['next/core-web-vitals'],
  rules: {
    // Prevent deep relative imports - use path aliases instead
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['../../../../lib/*', '../../../lib/*'],
            message: 'Do not import from ../../../../lib/* — always use "@/lib/*". Path aliases are configured in tsconfig.json.',
          },
        ],
      },
    ],
  },
};
