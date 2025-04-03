
module.exports = {
  parser: '@typescript-eslint/parser',
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended', // Должен быть последним
  ],
  plugins: ['react', '@typescript-eslint', 'prettier'],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  settings: {
    react: {
      version: 'detect', // Автоматически определяет версию React
    },
  },
  env: {
    browser: true, // Для рендерер-процесса
    node: true,    // Для main-процесса и скриптов сборки
    es6: true,
  },
  rules: {
    // Здесь можно переопределить или добавить правила
    'react/prop-types': 'off', // Отключаем, так как используем TypeScript
    'react/react-in-jsx-scope': 'off', // Не нужно в новых версиях React
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Можно включить для строгости
    'prettier/prettier': 'warn', // Показывать ошибки Prettier как предупреждения
  },
};