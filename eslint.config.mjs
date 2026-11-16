import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    ".open-next/**",
    ".wrangler/**",
    "cloudflare-env.d.ts",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Locally installed agent skills and their working files are not part of the app.
    ".claude/**",
    ".taste-skill/**",
  ]),
]);

export default eslintConfig;
