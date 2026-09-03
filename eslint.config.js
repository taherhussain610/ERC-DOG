const eslint = require("@eslint/js");
const prettier = require("eslint-config-prettier");
const globals = require("globals");

module.exports = [
  {
    ignores: ["node_modules/**", "data/**", "coverage/**"],
  },
  eslint.configs.recommended,
  {
    files: ["src/**/*.js", "scripts/**/*.js", "tests/**/*.js", "*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "script",
      globals: {
        ...globals.browser,
        io: "readonly",
        Chart: "readonly",
        solana: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-var": "error",
      "prefer-const": "warn",
    },
  },
  {
    files: ["public/app.js"],
    languageOptions: {
      globals: {
        WebSocketManager: "readonly",
      },
    },
  },
  {
    files: ["tests/ui-smoke.js"],
    languageOptions: {
      globals: globals.browser,
    },
  },
  prettier,
];
