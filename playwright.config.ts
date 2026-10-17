import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure" },
  reporter: "list",
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60000,
    env: {
      SUPABASE_URL: "",
      SUPABASE_PUBLISHABLE_KEY: "",
      SUPABASE_ANON_KEY: "",
      SUPABASE_ORDER_TOKEN: "",
      VERCEL: "",
      ORDER_DATA_DIR: ".data/e2e",
      ADMIN_EMAIL: "admin@example.test",
      ADMIN_PASSWORD: "test-fixture-password-only",
      ADMIN_SESSION_SECRET:
        "test-fixture-signing-secret-not-for-any-deployment",
    },
  },
});
