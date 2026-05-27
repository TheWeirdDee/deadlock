/**
 * ESLint configuration for the Deadlock Next.js dApp.
 *
 * Uses the new flat config format (eslint.config.mjs) introduced in ESLint v9.
 *
 * Rule layers applied (in order):
 *  1. `eslint-config-next/core-web-vitals` — enforces Core Web Vitals performance
 *     rules (e.g. no-html-link-for-pages, next/no-img-element, etc.)
 *  2. `eslint-config-next/typescript` — adds TypeScript-aware rules on top
 *     (e.g. @typescript-eslint/no-unused-vars, consistent type assertions)
 *
 * globalIgnores: overrides Next.js default ignores to explicitly exclude build
 * artifacts from linting. This prevents false positives from generated files.
 */

import { defineConfig, globalIgnores } from "eslint/config";

// Core Web Vitals rules — catches perf regressions at lint time
import nextVitals from "eslint-config-next/core-web-vitals";

// TypeScript-specific rules — type safety on top of the base Next.js config
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // Apply CWV rules first (lower priority)
  ...nextVitals,
  // Layer TypeScript rules on top (higher priority, can override CWV)
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Exclude Next.js build output — these are generated, not authored
    ".next/**",
    "out/**",
    "build/**",
    // Exclude generated Next.js type declarations
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
