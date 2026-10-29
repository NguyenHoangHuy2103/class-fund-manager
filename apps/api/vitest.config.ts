import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/**/*.live.ts", "tests/e2e-live-neon.ts", "node_modules"],
    env: {
      NODE_ENV: "test",
      DATABASE_URL:
        "postgresql://postgres:postgres123@localhost:5432/class_fund_test?schema=public",
      JWT_SECRET: "test_jwt_secret_must_be_at_least_32_characters_long_123456",
      FRONTEND_ORIGIN: "http://localhost:5173,http://localhost:8443",
    },
  },
})
