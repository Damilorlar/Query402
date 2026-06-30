import { Router } from "express";
import { z } from "zod";
import { providers } from "../lib/pricing.js";
import { getAnalyticsSummary, getUsageEvents } from "../lib/persistence.js";
import { config, getFacilitatorConfigured } from "../lib/config.js";
import { apiVersion, buildMetadata } from "../lib/build-metadata.js";
import { getCatalog } from "../services/query-service.js";
import { MAX_USAGE_EVENTS } from "../lib/storage/constants.js";
import { isStorageAvailable } from "../lib/storage/index.js";
import { checkFacilitatorSupported } from "../lib/facilitator-check.js";

export const publicRouter = Router();

const usageQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(MAX_USAGE_EVENTS).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const analyticsQuerySchema = z.object({
  recentUsageLimit: z.coerce.number().int().min(1).max(MAX_USAGE_EVENTS).optional(),
  recentPaymentLimit: z.coerce.number().int().min(1).max(500).optional()
});

publicRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "query402-api",
    version: apiVersion,
    nodeEnv: config.NODE_ENV,
    network: config.STELLAR_NETWORK,
    sponsorshipEnabled: config.sponsorshipEnabled,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    diagnostics: getConfigSnapshot()
  });
});

publicRouter.get("/api/readiness", async (_req, res) => {
  const facilitatorSupported = await checkFacilitatorSupported();

  const providersByMode = {
    live: providers.filter((p) => p.sourceType === "live").length,
    fallback: providers.filter((p) => p.sourceType !== "live").length
  };

  res.json({
    ok: true,
    version: buildMetadata.version,
    gitCommit: buildMetadata.gitCommit,
    buildTime: buildMetadata.buildTime,
    timestamp: new Date().toISOString(),
    uptimeSeconds: process.uptime(),
    demoMode: config.demoMode,
    network: config.STELLAR_NETWORK,
    facilitatorConfigured: getFacilitatorConfigured(),
    facilitatorSupported: facilitatorSupported.ok,
    providersByMode,
    storageAvailable: isStorageAvailable()
  });
});

publicRouter.get("/api/providers", (_req, res) => {
  res.json({ providers });
});

publicRouter.get("/api/catalog", (_req, res) => {
  res.json(getCatalog());
});

publicRouter.get("/api/usage", async (req, res, next) => {
  try {
    const parsed = usageQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const usage = await getUsageEvents({
      limit: parsed.data.limit,
      offset: parsed.data.offset
    });

    res.json({
      usage,
      pagination: {
        limit: parsed.data.limit ?? usage.length,
        offset: parsed.data.offset ?? 0,
        count: usage.length
      }
    });
  } catch (error) {
    next(error);
  }
});

publicRouter.get("/api/analytics", async (req, res, next) => {
  try {
    const parsed = analyticsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.flatten() });
    }

    const analytics = await getAnalyticsSummary({
      recentUsageLimit: parsed.data.recentUsageLimit,
      recentPaymentLimit: parsed.data.recentPaymentLimit
    });
    res.json(analytics);
  } catch (error) {
    next(error);
  }
});
