import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  // A Playwright tesztek nem Next.js kod: a Next szabalyai (kepek, linkek,
  // hookok) ott csak zajt adnanak. Sajat tsconfig-juk van, lasd e2e/tsconfig.json.
  { ignores: ["e2e/**", "playwright.config.ts", "test-results/**", "playwright-report/**"] },
  ...nextVitals
];

export default eslintConfig;
