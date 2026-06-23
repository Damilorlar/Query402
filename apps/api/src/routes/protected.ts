import { Router } from "express";
import { nanoid } from "nanoid";
import { searchQuerySchema, newsQuerySchema, scrapeQuerySchema } from "@query402/shared";
import { executeQuery } from "../services/query-service.js";
import { config } from "../lib/config.js";
import { savePaymentAttempt, saveUsageEvent } from "../lib/persistence.js";
import type { PaymentEvidence } from "@query402/shared";

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
  isDemo?: boolean;
}) {
  const now = new Date().toISOString();
  const paymentId = `pay_${nanoid(10)}`;

  const evidence: PaymentEvidence = input.isDemo
    ? {
        status: "demo-paid",
        network: config.STELLAR_NETWORK,
        amountUsd: input.priceUsd,
        payToAddress: config.X402_PAY_TO_ADDRESS,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        payerPublicKey: input.payerPublicKey,
        demoId: input.paymentResponseHeader ?? "",
      }
    : {
        status: "verified",
        network: config.STELLAR_NETWORK,
        amountUsd: input.priceUsd,
        payToAddress: config.X402_PAY_TO_ADDRESS,
        facilitatorUrl: config.X402_FACILITATOR_URL,
        payerPublicKey: input.payerPublicKey,
        paymentPayload: input.paymentResponseHeader ?? "",
      };

  savePaymentAttempt({
    id: paymentId,
    endpoint: input.endpoint,
    providerId: input.provider,
    evidence,
    createdAt: now
  });

  saveUsageEvent({
    id: `use_${nanoid(10)}`,
    mode: input.mode,
    endpoint: input.endpoint,
    providerId: input.provider,
    queryOrUrl: input.queryOrUrl,
    priceUsd: input.priceUsd,
    evidence,
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

    const paymentHeader = req.header("payment-response") ?? null;
    const isDemo = req.header("x-query402-demo-paid") === "true";
    const paymentId = persistPaidRequest({
      mode: "search",
      endpoint: "/x402/search",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined,
      isDemo
    });

    res.setHeader("x-payment-attempt-id", paymentId);
    res.setHeader("x-payment-trace-id", result.traceId);

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
    const isDemo = req.header("x-query402-demo-paid") === "true";
    const paymentId = persistPaidRequest({
      mode: "news",
      endpoint: "/x402/news",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.q,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined,
      isDemo
    });

    res.setHeader("x-payment-attempt-id", paymentId);
    res.setHeader("x-payment-trace-id", result.traceId);

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
    const isDemo = req.header("x-query402-demo-paid") === "true";
    const paymentId = persistPaidRequest({
      mode: "scrape",
      endpoint: "/x402/scrape",
      provider: parsed.data.provider,
      queryOrUrl: parsed.data.url,
      priceUsd: result.priceUsd,
      latencyMs: result.latencyMs,
      traceId: result.traceId,
      paymentResponseHeader: paymentHeader,
      payerPublicKey: req.header("x-demo-payer") ?? undefined,
      isDemo
    });

    res.setHeader("x-payment-attempt-id", paymentId);
    res.setHeader("x-payment-trace-id", result.traceId);

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
