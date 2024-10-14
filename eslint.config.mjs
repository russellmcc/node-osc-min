import preferArrowFunctions from "eslint-plugin-prefer-arrow-functions";
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
export default [
  {
    ignores: ["**/dist", "**/test", "**/eslint.config.mjs"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    plugins: {
      "prefer-arrow-functions": preferArrowFunctions,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      "@typescript-eslint/no-non-null-assertion": "off",

      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
        },
      ],

      "@typescript-eslint/no-unnecessary-condition": [
        "error",
        {
          allowConstantLoopConditions: true,
        },
      ],

      "prefer-arrow-functions/prefer-arrow-functions": [
        "error",
        {
          returnStyle: "implicit",
        },
      ],

      "@typescript-eslint/consistent-type-definitions": ["error", "type"],
      "no-warning-comments": "error",
    },
  },
  {
    files: ["**/examples/*.mjs", "**/examples/*.js"],
    ...tseslint.configs.disableTypeChecked,
  },
  {
    files: ["**/examples/*.mjs", "**/examples/*.js"],
    languageOptions: {
      globals: globals.node,
    },
  },
];
