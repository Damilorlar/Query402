import { Router } from "express";
import { providers } from "../lib/pricing.js";
import { getAnalyticsSummary, getUsageEvents, getPublicAnalyticsData } from "../lib/persistence.js";
import { config } from "../lib/config.js";
import { getCatalog } from "../services/query-service.js";

export const publicRouter = Router();

publicRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "query402-api",
    network: config.STELLAR_NETWORK,
    timestamp: new Date().toISOString()
  });
});

publicRouter.get("/api/providers", (_req, res) => {
  res.json({ providers });
});

publicRouter.get("/api/catalog", (_req, res) => {
  res.json(getCatalog());
});

publicRouter.get("/api/usage", (_req, res) => {
  res.json({ usage: getUsageEvents() });
});

publicRouter.get("/api/analytics", (_req, res) => {
  res.json(getAnalyticsSummary());
});

/**
 * Public analytics endpoint - privacy-safe aggregation and paginated records
 * No raw query text, URLs, or full payer addresses
 * GET /api/v1/analytics?cursor=<cursor>&limit=<limit>
 */
publicRouter.get("/api/v1/analytics", (_req, res) => {
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

    const analytics = getPublicAnalyticsData(cursor, limit);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({
      error: "Invalid analytics request",
      message: error?.message ?? "Unknown error"
    });
  }
});
