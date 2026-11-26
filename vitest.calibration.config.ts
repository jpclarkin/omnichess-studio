import { defineConfig } from "vitest/config";

// Separate from the normal test run: `npx vitest run --config vitest.calibration.config.ts`
export default defineConfig({
  test: {
    include: ["scripts/calibration/**/*.calib.ts"],
    testTimeout: 6 * 60 * 60 * 1000,
    environment: "node",
  },
});
