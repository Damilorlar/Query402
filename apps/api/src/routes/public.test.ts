import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildTestUsageEvent } from "../test/storage-test-helpers.js";
import { applyApiTestEnv, resetApiTestStorage } from "../test/api-test-helpers.js";

describe("public routes", () => {
  let analyticsDbPath: string;

  beforeEach(() => {
    ({ analyticsDbPath } = applyApiTestEnv());
  });

  afterEach(async () => {
    await resetApiTestStorage(analyticsDbPath);
    vi.restoreAllMocks();
  });

  async function createPublicApp() {
    const { publicRouter } = await import("../routes/public.js");
    const app = express();
    app.use(publicRouter);
    return app;
  }

  it("returns health metadata", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T10:00:00.000Z"));

    try {
      const app = await createPublicApp();
      const response = await request(app).get("/health");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        service: "query402-api",
        version: "0.1.0",
        nodeEnv: "test",
        network: "stellar:testnet",
        timestamp: "2026-06-21T10:00:00.000Z"
      });
      expect(typeof response.body.sponsorshipEnabled).toBe("boolean");
      expect(typeof response.body.uptimeSeconds).toBe("number");
      expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns readiness metadata without sensitive values", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-21T10:00:00.000Z"));

    try {
      const app = await createPublicApp();
      const response = await request(app).get("/api/readiness");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ok: true,
        version: "0.1.0",
        timestamp: "2026-06-21T10:00:00.000Z",
        demoMode: true,
        network: "stellar:testnet",
        facilitatorConfigured: false,
        facilitatorSupported: false,
        storageAvailable: true
      });
      expect(typeof response.body.uptimeSeconds).toBe("number");
      expect(response.body.uptimeSeconds).toBeGreaterThanOrEqual(0);
      expect(response.body.providersByMode).toMatchObject({
        live: 1,
        fallback: 7
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not expose secret config values in readiness response", async () => {
    const app = await createPublicApp();
    const response = await request(app).get("/api/readiness");

    expect(response.status).toBe(200);

    const bodyStr = JSON.stringify(response.body);
    expect(bodyStr).not.toContain("API_KEY");
    expect(bodyStr).not.toContain("SECRET");
    expect(bodyStr).not.toContain("PRIVATE");
    expect(bodyStr).not.toContain("BEARER");
    expect(bodyStr).not.toContain("token");
    expect(bodyStr).not.toMatch(/[A-Za-z0-9]{56}/);
  });

  it("returns readiness endpoint working in demo mode without live facilitator credentials", async () => {
    const app = await createPublicApp();

    const response = await request(app).get("/api/readiness");

    expect(response.status).toBe(200);
    expect(response.body.demoMode).toBe(true);
    expect(response.body.facilitatorConfigured).toBe(false);
    expect(response.body.facilitatorSupported).toBe(false);
  });

  it("returns provider catalog and category groupings", async () => {
    const app = await createPublicApp();

    const providersResponse = await request(app).get("/api/providers");
    const catalogResponse = await request(app).get("/api/catalog");

    expect(providersResponse.status).toBe(200);
    expect(
      providersResponse.body.providers.some(
        (provider: { id: string }) => provider.id === "search.basic"
      )
    ).toBe(true);

    expect(catalogResponse.status).toBe(200);
    expect(catalogResponse.body.providerCount).toBeGreaterThan(0);
    expect(catalogResponse.body.byCategory.search.length).toBeGreaterThan(0);
    expect(catalogResponse.body.byCategory.news.length).toBeGreaterThan(0);
    expect(catalogResponse.body.byCategory.scrape.length).toBeGreaterThan(0);
  });

});
