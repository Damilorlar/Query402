import { Router } from "express";
import { nanoid } from "nanoid";
import { searchQuerySchema, newsQuerySchema, scrapeQuerySchema } from "@query402/shared";
import { executeQuery } from "../services/query-service.js";
import { config } from "../lib/config.js";
import { savePaymentAttempt, saveUsageEvent, getDetailedAnalyticsData } from "../lib/persistence.js";

export const protectedRouter = Router();

function persistPaidRequest(input: {
  mode: "search" | "news" | "scrape";
  endpoint: string;
  provider: string;
  queryOrUrl: string;
  priceUsd: number;
  latencyMs: number;
  traceId: string;
  paymentResponseHeader: string | null;
  payerPublicKey?: string;
}) {
  const now = new Date().toISOString();
  const paymentId = `pay_${nanoid(10)}`;

  savePaymentAttempt({
    id: paymentId,
    endpoint: input.endpoint,
    providerId: input.provider,
    amountUsd: input.priceUsd,
    network: config.STELLAR_NETWORK,
    payerPublicKey: input.payerPublicKey,
    payToAddress: config.X402_PAY_TO_ADDRESS,
    facilitatorUrl: config.X402_FACILITATOR_URL,
    status: "settled",
    transactionHash: input.paymentResponseHeader ?? undefined,
    createdAt: now
  });

  saveUsageEvent({
    id: `use_${nanoid(10)}`,
    mode: input.mode,
    endpoint: input.endpoint,
    providerId: input.provider,
    queryOrUrl: input.queryOrUrl,
    priceUsd: input.priceUsd,
    network: config.STELLAR_NETWORK,
    paymentStatus: "paid",
    paymentTxHash: input.paymentResponseHeader ?? undefined,
    facilitatorUrl: config.X402_FACILITATOR_URL,
    payerPublicKey: input.payerPublicKey,
    traceId: input.traceId,
    createdAt: now,
    latencyMs: input.latencyMs
  });
}

protectedRouter.get("/x402/search", async (req, res, next) => {
  try {
    const parsed = searchQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const result = await executeQuery({
      mode: "search",
      provider: parsed.data.provider,
      q: parsed.data.q
    });

    const paymentHeader = req.header("payment-response") ?? null;
    persistPaidRequest({
      mode: "search",
      endpoint: "/x402/search",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined
    });

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: paymentHeader
      },
      result
    });
  } catch (error) {
    return next(error);
  }
});

protectedRouter.get("/x402/news", async (req, res, next) => {
  try {
    const parsed = newsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const result = await executeQuery({
      mode: "news",
      provider: parsed.data.provider,
      q: parsed.data.q
    });

    const paymentHeader = req.header("payment-response") ?? null;
    persistPaidRequest({
      mode: "news",
      endpoint: "/x402/news",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined
    });

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: paymentHeader
      },
      result
    });
  } catch (error) {
    return next(error);
  }
});

protectedRouter.get("/x402/scrape", async (req, res, next) => {
  try {
    const parsed = scrapeQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const result = await executeQuery({
      mode: "scrape",
      provider: parsed.data.provider,
      url: parsed.data.url
    });

    const paymentHeader = req.header("payment-response") ?? null;
    persistPaidRequest({
      mode: "scrape",
      endpoint: "/x402/scrape",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.url,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined
    });

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: paymentHeader
      },
      result
    });
  } catch (error) {
    return next(error);
  }
});

/**
 * Detailed analytics endpoint - for authorized access only
 * Includes transaction hashes and payer key hashes (but never full addresses)
 * GET /x402/analytics/detailed?cursor=<cursor>&limit=<limit>
 */
protectedRouter.get("/x402/analytics/detailed", (_req, res, next) => {
  try {
    const cursor = typeof _req.query.cursor === "string" ? _req.query.cursor : undefined;
    const limit = typeof _req.query.limit === "string" ? parseInt(_req.query.limit, 10) : undefined;

    // Validate limit
    if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
      return res.status(400).json({
        error: "Invalid limit parameter",
        message: "limit must be a number between 1 and 100"
      });
    }

    const analytics = getDetailedAnalyticsData(cursor, limit);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({
      error: "Invalid analytics request",
      message: error?.message ?? "Unknown error"
    });
  }
});
