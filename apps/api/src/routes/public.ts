import { Router } from "express";
import { providers } from "../lib/pricing.js";
import { getAnalyticsSummary, getUsageEvents } from "../lib/persistence.js";
import { config } from "../lib/config.js";
import { getCatalog, fetchPaginatedAnalytics } from "../services/query-service.js";

export const publicRouter = Router();

publicRouter.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "query402-api",
    network: config.STELLAR_NETWORK,
    sponsorshipEnabled: config.sponsorshipEnabled,
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

publicRouter.get("/api/analytics", async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const cursor = req.query.cursor ? (req.query.cursor as string) : null;

    const result = await fetchPaginatedAnalytics(limit, cursor);
    return res.json(result);
  } catch (error) {
    next(error);
  }
});
