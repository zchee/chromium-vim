import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from 'typescript-eslint';
import globals from "globals";
import path from "node:path";
import { fileURLToPath } from "node:url";
import eslint from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";
import eslintConfigPrettier from "eslint-config-prettier/flat";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: eslint.configs.recommended,
  allConfig: eslint.configs.all
});

export default defineConfig([globalIgnores([
  "**/dist/",
  "**/release/",
  "pages/codemirror/",
  "**/cvimrc_parser/",
  "**/node_modules/",
]), {
  extends: compat.extends(
    eslint.configs.recommended,
    tseslint.config.recommended,
    eslintConfigPrettier,
  ),

  plugins: {
    "typescript-eslint": tseslint,
  },

  languageOptions: {
    globals: {
      ...globals.browser,
      ...globals.node,
      ...globals.webextensions,
    },

    parser: tseslint.parser,
    ecmaVersion: 2022,
    sourceType: "module",

    parserOptions: {
      project: "./tsconfig.json",
    },
  },

  rules: {
    // "typescript-eslint/no-unused-vars": ["error", {
    //   argsIgnorePattern: "^_",
    // }],
    // "typescript-eslint/no-explicit-any": "warn",
    // // "@/prefer-const": "error",
    // "typescript-eslint/no-inferrable-types": "error",
    "prefer-const": "off",
    "no-var": "error",
  },
}]);
