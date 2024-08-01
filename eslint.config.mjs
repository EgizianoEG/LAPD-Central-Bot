import { FlatCompat } from "@eslint/eslintrc";
import { fileURLToPath } from "node:url";
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import sonarjs from "eslint-plugin-sonarjs";
import globals from "globals";
import path from "node:path";
import js from "@eslint/js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  recommendedConfig: js.configs.recommended,
  baseDirectory: __dirname,
  allConfig: js.configs.all,
});

export default [
  { ...sonarjs.configs.recommended },

  {
    // files: ["Source/**/*"],
    ignores: [
      "*.*",
      "!Source/**/*",
      "**/node_modules",
      "[Bb]uild/**/*",
      "[Dd]ist/**/*",
      "Source/Types",
      "Source/Typings",
    ],
  },

  {
    plugins: {
      "@typescript-eslint": typescriptEslint,
    },
  },

  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, "off"])),
        ...Object.fromEntries(Object.entries(globals.commonjs).map(([key]) => [key, "off"])),
      },

      parser: tsParser,
      ecmaVersion: "latest",
      sourceType: "module",
    },
  },

  ...compat.extends(
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    // TODO: "eslint-config-love",
    "prettier"
  ),

  {
    rules: {
      "no-var": "error",
      "no-undef": "off",
      camelcase: "off",
      "no-useless-call": "error",
      quotes: ["error", "double"],
      semi: ["error", "always"],
      "sonarjs/cognitive-complexity": ["warn", 35],
      "no-extra-parens": ["off", "functions"],

      "no-irregular-whitespace": [
        "error",
        {
          skipStrings: true,
          skipTemplates: true,
        },
      ],

      "capitalized-comments": [
        "warn",
        "always",
        {
          ignoreConsecutiveComments: true,
        },
      ],

      "no-unused-vars": "off",
      "no-use-before-define": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn"],

      "@typescript-eslint/no-use-before-define": [
        "error",
        {
          functions: false,
          classes: false,
          enums: true,
        },
      ],

      indent: [
        "error",
        2,
        {
          SwitchCase: 1,
          ignoredNodes: ["ConditionalExpression"],
        },
      ],
    },
  },
];

