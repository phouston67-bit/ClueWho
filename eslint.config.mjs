import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Next.js 16 removed `next lint` in favor of running ESLint directly via the
// CLI (`eslint .`, wired up as the `lint` script in package.json). This flat
// config spreads in Next's recommended Core Web Vitals + TypeScript rule
// sets, which is the officially documented setup for eslint-config-next 16.
const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // This is a one-off, manually-run Node.js utility (not part of the app
    // build) that intentionally uses CommonJS require() rather than ESM.
    files: ["scripts/gen-placeholder-icons.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
