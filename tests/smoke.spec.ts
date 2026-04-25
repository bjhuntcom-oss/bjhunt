import { test, expect } from "@playwright/test";

// Minimal smoke test so `npx playwright test` finds at least one spec
// (DEP-P2-1: previously the testDir './tests' didn't exist and the runner
// errored "no tests found"). Real coverage lives in CI workflows; this
// stub keeps the tooling functional during development.

test("backend health endpoint reachable", async ({ request }) => {
  const url = process.env.BACKEND_URL ?? "http://localhost:3001/api/health/live";
  const res = await request.get(url, { failOnStatusCode: false });
  expect([200, 404]).toContain(res.status());
});
