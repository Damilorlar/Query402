import { Router } from "express";
import { nanoid } from "nanoid";
import { searchQuerySchema, newsQuerySchema, scrapeQuerySchema } from "@query402/shared";
import { executeQuery } from "../services/query-service.js";
import { config } from "../lib/config.js";
import { getPaymentAttempts, saveUsageEvent } from "../lib/persistence.js";
import type { Request } from "express";

export const protectedRouter = Router();

function persistUsageEvent(input: {
  req: Request;
  mode: "search" | "news" | "scrape";
  endpoint: string;
  provider: string;
  queryOrUrl: string;
  priceUsd: number;
  latencyMs: number;
  traceId: string;
}) {
  const paymentId = input.req.header("x-payment-attempt-id");
  if (!paymentId) throw new Error("Payment attempt ID missing from request headers");

  const paymentAttempt = getPaymentAttempts().find(p => p.id === paymentId);
  if (!paymentAttempt) throw new Error("Payment attempt not found");

  const now = new Date().toISOString();

  saveUsageEvent({
    id: `use_${nanoid(10)}`,
    mode: input.mode,
    endpoint: input.endpoint,
    providerId: input.provider,
    queryOrUrl: input.queryOrUrl,
    priceUsd: input.priceUsd,
    evidence: paymentAttempt.evidence,
    traceId: input.traceId,
    createdAt: now,
    latencyMs: input.latencyMs
  });

  return paymentId;
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

    const paymentId = persistUsageEvent({
      req,
      mode: "search",
      endpoint: "/x402/search",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId
    });

    res.setHeader("x-payment-attempt-id", paymentId);
    res.setHeader("x-payment-trace-id", result.traceId);

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: req.header("payment-response") ?? null
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

    const paymentId = persistUsageEvent({
      req,
      mode: "news",
      endpoint: "/x402/news",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId
    });

    res.setHeader("x-payment-attempt-id", paymentId);
    res.setHeader("x-payment-trace-id", result.traceId);

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: req.header("payment-response") ?? null
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

    const paymentId = persistUsageEvent({
      req,
      mode: "scrape",
      endpoint: "/x402/scrape",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.url,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId
    });

    res.setHeader("x-payment-attempt-id", paymentId);
    res.setHeader("x-payment-trace-id", result.traceId);

    return res.json({
      payment: {
        network: config.STELLAR_NETWORK,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        paymentResponseHeader: req.header("payment-response") ?? null
      },
      result
    });
  } catch (error) {
    return next(error);
  }
});
