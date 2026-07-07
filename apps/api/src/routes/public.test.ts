import express from "express";
import request from "supertest";
import { providerCapabilitySchema } from "@query402/shared";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { persistPaymentAndUsage } from "../lib/persistence.js";
import { buildTestPaymentAttempt, buildTestUsageEvent } from "../test/storage-test-helpers.js";
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

  it("health response includes diagnostics sub-object with safe booleans and enums only", async () => {
    const app = await createPublicApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);

    const { diagnostics } = response.body;
    expect(diagnostics).toBeDefined();

    // All fields are either booleans or safe enum strings — never raw secrets
    expect(typeof diagnostics.network).toBe("string");
    expect(typeof diagnostics.demoMode).toBe("boolean");
    expect(typeof diagnostics.facilitatorConfigured).toBe("boolean");
    expect(typeof diagnostics.facilitatorApiKeyConfigured).toBe("boolean");
    expect(typeof diagnostics.payToConfigured).toBe("boolean");
    expect(typeof diagnostics.sponsorshipEnabled).toBe("boolean");
    expect(typeof diagnostics.sponsorshipSigningSecretConfigured).toBe("boolean");
    expect(typeof diagnostics.anyProviderKeyConfigured).toBe("boolean");
  });

  it("health diagnostics reflects testnet network and demo mode from test env", async () => {
    const app = await createPublicApp();
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body.diagnostics.network).toBe("stellar:testnet");
    expect(response.body.diagnostics.demoMode).toBe(true); // applyApiTestEnv sets DEMO_MODE=true
    expect(response.body.diagnostics.payToConfigured).toBe(true); // TEST_WALLET is set by applySponsorshipTestEnv
  });

  describe("health diagnostics — secret redaction", () => {
    it("never exposes raw secret values in health response body", async () => {
      // Set all secret-like env vars to recognisable sentinel values,
      // then confirm none of them appear anywhere in the response JSON.
      applyApiTestEnv({
        X402_FACILITATOR_API_KEY: "super-secret-facilitator-key",
        SPONSORSHIP_SIGNING_SECRET: "ultra-secret-signing-secret",
        BRAVE_API_KEY: "brave-secret-key",
        SERPAPI_API_KEY: "serpapi-secret-key",
        NEWS_API_KEY: "news-secret-key",
        GROQ_API_KEY: "groq-secret-key"
      });

      const { publicRouter } = await import("../routes/public.js");
      const app = express();
      app.use(publicRouter);

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);

      const body = JSON.stringify(response.body);
      const secretValues = [
        "super-secret-facilitator-key",
        "ultra-secret-signing-secret",
        "brave-secret-key",
        "serpapi-secret-key",
        "news-secret-key",
        "groq-secret-key"
      ];

      for (const secret of secretValues) {
        expect(body).not.toContain(secret);
      }
    });

    it("reports facilitatorApiKeyConfigured=true when key is set, without leaking the value", async () => {
      applyApiTestEnv({ X402_FACILITATOR_API_KEY: "my-confidential-api-key" });

      const { publicRouter } = await import("../routes/public.js");
      const app = express();
      app.use(publicRouter);

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.diagnostics.facilitatorApiKeyConfigured).toBe(true);
      expect(JSON.stringify(response.body)).not.toContain("my-confidential-api-key");
    });

    it("reports facilitatorApiKeyConfigured=false when key is absent", async () => {
      applyApiTestEnv({ X402_FACILITATOR_API_KEY: "" });

      const { publicRouter } = await import("../routes/public.js");
      const app = express();
      app.use(publicRouter);

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.diagnostics.facilitatorApiKeyConfigured).toBe(false);
    });

    it("reports sponsorshipSigningSecretConfigured=true when secret is set, without leaking the value", async () => {
      applyApiTestEnv({ SPONSORSHIP_SIGNING_SECRET: "top-secret-signing-value" });

      const { publicRouter } = await import("../routes/public.js");
      const app = express();
      app.use(publicRouter);

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.diagnostics.sponsorshipSigningSecretConfigured).toBe(true);
      expect(JSON.stringify(response.body)).not.toContain("top-secret-signing-value");
    });

    it("reports anyProviderKeyConfigured=true when at least one provider key is set", async () => {
      applyApiTestEnv({ GROQ_API_KEY: "gsk_test_provider_key" });

      const { publicRouter } = await import("../routes/public.js");
      const app = express();
      app.use(publicRouter);

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.diagnostics.anyProviderKeyConfigured).toBe(true);
      expect(JSON.stringify(response.body)).not.toContain("gsk_test_provider_key");
    });

    it("reports anyProviderKeyConfigured=false when no provider keys are set", async () => {
      applyApiTestEnv({
        BRAVE_API_KEY: "",
        SERPAPI_API_KEY: "",
        NEWS_API_KEY: "",
        GROQ_API_KEY: ""
      });

      const { publicRouter } = await import("../routes/public.js");
      const app = express();
      app.use(publicRouter);

      const response = await request(app).get("/health");
      expect(response.status).toBe(200);
      expect(response.body.diagnostics.anyProviderKeyConfigured).toBe(false);
    });
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

  it("returns an empty settlement digest when no paid runs are recorded", async () => {
    const app = await createPublicApp();

    const response = await request(app).get("/api/audit/digest");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalPaidRuns: 0,
      totalSettledAmountUsd: 0,
      settledAmountByAssetNetwork: {},
      withPaymentEvidence: 0,
      missingPaymentEvidence: 0,
      latestPaymentTimestamp: null
    });
    expect(response.body.generatedAt).toEqual(expect.any(String));
  });

  it("returns a populated settlement digest for recorded paid runs", async () => {
    const firstPayment = buildTestPaymentAttempt({
      id: "pay_001",
      amountUsd: 1.25,
      createdAt: "2026-06-21T10:00:00.000Z",
      transactionHash: "tx_001"
    });
    const firstUsage = buildTestUsageEvent({
      id: "use_001",
      createdAt: firstPayment.createdAt,
      paymentStatus: "settled"
    });

    const secondPayment = buildTestPaymentAttempt({
      id: "pay_002",
      amountUsd: 0.5,
      createdAt: "2026-06-21T10:05:00.000Z"
    });
    const secondUsage = buildTestUsageEvent({
      id: "use_002",
      createdAt: secondPayment.createdAt,
      paymentStatus: "settled"
    });

    await persistPaymentAndUsage({ payment: firstPayment, usage: firstUsage });
    await persistPaymentAndUsage({ payment: secondPayment, usage: secondUsage });

    const app = await createPublicApp();
    const response = await request(app).get("/api/audit/digest");

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      totalPaidRuns: 2,
      totalSettledAmountUsd: 1.75,
      settledAmountByAssetNetwork: {
        "stellar:testnet": 1.75
      },
      withPaymentEvidence: 1,
      missingPaymentEvidence: 1,
      latestPaymentTimestamp: secondPayment.createdAt
    });
    expect(response.body.generatedAt).toEqual(expect.any(String));
  });

  it("returns safe default analytics shape for fresh storage", async () => {
    const app = await createPublicApp();

    const analyticsResponse = await request(app).get("/api/analytics");

    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.body).toMatchObject({
      totalQueries: 0,
      totalSpendUsd: 0,
      spendByCategory: {
        search: 0,
        news: 0,
        scrape: 0
      },
      executionSummary: {
        totalExecutions: 0,
        liveExecutions: 0,
        fallbackExecutions: 0,
        unavailableExecutions: 0,
        timeoutExecutions: 0,
        circuitOpenExecutions: 0
      },
      totalDemoQueries: 0,
      totalSettledPayments: 0,
      spendByPaymentSource: {},
      recentDemoActivity: [],
      recentSettledPayments: [],
      recentUsage: [],
      recentTransactions: []
    });
  });

  it("returns usage and analytics summaries from isolated sqlite storage", async () => {
    const app = await createPublicApp();
    const { persistPaymentAndUsage } = await import("../lib/persistence.js");
    const { buildTestPaymentAttempt } = await import("../test/storage-test-helpers.js");

    await persistPaymentAndUsage({
      payment: buildTestPaymentAttempt({
        id: "pay_demo_1",
        status: "demo-paid",
        paymentSource: "demo",
        amountUsd: 0.01
      }),
      usage: buildTestUsageEvent({
        id: "use_demo_1",
        queryOrUrl: "stellar x402",
        paymentStatus: "demo-paid",
        traceId: "trace_demo_1",
        createdAt: "2026-06-21T10:00:00.000Z",
        latencyMs: 12
      })
    });

    await persistPaymentAndUsage({
      payment: buildTestPaymentAttempt({
        id: "pay_settled_1",
        status: "settled",
        paymentSource: "wallet",
        amountUsd: 0.02
      }),
      usage: buildTestUsageEvent({
        id: "use_settled_1",
        queryOrUrl: "settled query",
        paymentStatus: "settled",
        traceId: "trace_settled_1",
        createdAt: "2026-06-21T11:00:00.000Z",
        latencyMs: 34
      })
    });

    const usageResponse = await request(app).get("/api/usage");
    const analyticsResponse = await request(app).get("/api/analytics");

    expect(usageResponse.status).toBe(200);
    expect(usageResponse.body.usage).toHaveLength(2);
    expect(usageResponse.body.pagination).toMatchObject({
      count: 2,
      offset: 0
    });

    expect(analyticsResponse.status).toBe(200);
    expect(analyticsResponse.body.totalQueries).toBe(2);
    expect(analyticsResponse.body.totalSpendUsd).toBe(0.02);
    expect(analyticsResponse.body.spendByCategory.search).toBe(0.02);
    expect(analyticsResponse.body.totalDemoQueries).toBe(1);
    expect(analyticsResponse.body.totalSettledPayments).toBe(1);
    expect(analyticsResponse.body.recentDemoActivity).toHaveLength(1);
    expect(analyticsResponse.body.recentDemoActivity[0].id).toBe("pay_demo_1");
    expect(analyticsResponse.body.recentSettledPayments).toHaveLength(1);
    expect(analyticsResponse.body.recentSettledPayments[0].id).toBe("pay_settled_1");
    expect(analyticsResponse.body.spendByPaymentSource).toMatchObject({
      demo: 0.01,
      wallet: 0.02
    });
  });

  it("returns capability matrix with correct shape and deterministic order", async () => {
    const app = await createPublicApp();
    const response = await request(app).get("/api/matrix");

    expect(response.status).toBe(200);
    expect(response.body.updatedAt).toEqual(expect.any(String));

    const { providers: matrix } = response.body;
    expect(Array.isArray(matrix)).toBe(true);
    expect(matrix.length).toBeGreaterThan(0);

    for (const entry of matrix) {
      const parsed = providerCapabilitySchema.safeParse(entry);
      expect(parsed.success).toBe(true);
    }

    for (let i = 1; i < matrix.length; i++) {
      const prev = matrix[i - 1];
      const curr = matrix[i];
      const catCmp = prev.category.localeCompare(curr.category);
      if (catCmp === 0) {
        expect(prev.id.localeCompare(curr.id)).toBeLessThanOrEqual(0);
      } else {
        expect(catCmp).toBeLessThan(0);
      }
    }
  });
});
