# Privacy-Safe Analytics - Quick Reference

## For Backend Developers

### Using Analytics Functions

```typescript
import { getPublicAnalytics, getDetailedAnalytics } from "./lib/analytics-service";
import { getUsageEvents, getPaymentAttempts } from "./lib/persistence";

// Get public analytics
const publicAnalytics = getPublicAnalytics(
  usageEvents,
  paymentAttempts,
  { cursor: "cursor_if_paginating", limit: 20 },
  { retentionDays: 90, maxPageLimit: 100, defaultPageLimit: 20 }
);

// Get detailed analytics (for authorized use)
const detailedAnalytics = getDetailedAnalytics(
  usageEvents,
  paymentAttempts,
  { cursor: "cursor_if_paginating", limit: 20 },
  { retentionDays: 90, maxPageLimit: 100, defaultPageLimit: 20 }
);
```

### API Endpoints to Add to Express Router

```typescript
// In public.ts
publicRouter.get("/api/v1/analytics", (req, res) => {
  const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
  const limit = typeof req.query.limit === "string" ? parseInt(req.query.limit, 10) : undefined;
  
  if (limit !== undefined && (isNaN(limit) || limit < 1 || limit > 100)) {
    return res.status(400).json({ error: "Invalid limit" });
  }
  
  const analytics = getPublicAnalyticsData(cursor, limit);
  res.json(analytics);
});

// In protected.ts
protectedRouter.get("/x402/analytics/detailed", (req, res) => {
  // Same validation as above
  const analytics = getDetailedAnalyticsData(cursor, limit);
  res.json(analytics);
});
```

### Privacy Utility Functions

```typescript
import { 
  hashPayerKey,
  isWithinRetention,
  encodeCursor,
  decodeCursor,
  generateNextCursor
} from "./lib/analytics-privacy";

// Hash a payer address
const hash = hashPayerKey("GBLL3LQ..."); // → "a1b2c3d4e5f6g7h8"

// Check retention
const inRetention = isWithinRetention("2024-01-15T10:00:00Z", 90); // → true/false

// Encode cursor for pagination
const cursor = encodeCursor({ timestamp: "2024-01-15T10:00:00Z", id: "use_123" });

// Decode cursor
const decoded = decodeCursor(cursor); // → { timestamp, id } or null

// Generate cursor for "next page"
const nextCursor = generateNextCursor(records); // → string | undefined
```

### Types to Use

```typescript
import type {
  PrivacySafeAnalyticsAggregation,
  PrivacySafeUsageRecord,
  PrivacySafeAnalyticsResponse,
  DetailedAnalyticsRecord,
  DetailedAnalyticsResponse,
  CursorPaginationMeta,
  CursorPaginationParams,
  AnalyticsConfig
} from "@query402/shared";
```

## For Frontend Developers

### Fetching Analytics

```typescript
import type { PrivacySafeAnalyticsResponse } from "@query402/shared";

// Public analytics (no auth)
const response = await fetch("/api/v1/analytics?limit=20");
const analytics = (await response.json()) as PrivacySafeAnalyticsResponse;

// Display settled volume
console.log(`Settled: $${analytics.aggregation.settled.totalVolumeUsd}`);
console.log(`Demo: ${analytics.aggregation.demoPaid.totalCount} queries`);

// Handle pagination
if (analytics.pagination.hasMore) {
  const nextPage = await fetch(
    `/api/v1/analytics?cursor=${analytics.pagination.nextCursor}&limit=20`
  );
  const nextData = (await nextPage.json()) as PrivacySafeAnalyticsResponse;
  // ... merge or update UI
}
```

### Dashboard Display Component

```tsx
import type { PrivacySafeAnalyticsResponse } from "@query402/shared";

export function AnalyticsBadge({ analytics }: { analytics: PrivacySafeAnalyticsResponse }) {
  return (
    <div className="analytics-panel privacy-safe">
      <h3>On-Chain Analytics (Privacy-Safe)</h3>
      
      {/* Settled */}
      <div className="settlement-group">
        <div className="settlement-header">
          <span className="badge settled">SETTLED</span>
          <span className="settlement-label">On-Chain Confirmed</span>
        </div>
        <ul>
          <li>
            <span>Volume</span>
            <strong>${analytics.aggregation.settled.totalVolumeUsd.toFixed(6)}</strong>
          </li>
          <li>
            <span>Queries</span>
            <strong>{analytics.aggregation.settled.totalCount}</strong>
          </li>
        </ul>
      </div>
      
      {/* Demo */}
      {analytics.aggregation.demoPaid.totalCount > 0 && (
        <div className="settlement-group demo">
          <div className="settlement-header">
            <span className="badge demo">DEMO</span>
            <span className="settlement-label">Demo Queries (No Payment)</span>
          </div>
          <ul>
            <li>
              <span>Queries</span>
              <strong>{analytics.aggregation.demoPaid.totalCount}</strong>
            </li>
          </ul>
        </div>
      )}
      
      <p className="privacy-notice">
        ✓ Query text and URLs redacted. Payer addresses hashed. Raw payments never exposed.
      </p>
    </div>
  );
}
```

## Data Flow

```
Client                           API                        Storage
├─ GET /api/v1/analytics    ──→  /routes/public.ts
                                  ├─ persistence.getPublicAnalyticsData()
                                  ├─ analytics-service.getPublicAnalytics()
                                  │  ├─ Reads usage + payments from DB
                                  │  ├─ Aggregates by settlement status
                                  │  ├─ Redacts sensitive fields
                                  │  ├─ Hashes payer keys
                                  │  └─ Handles pagination
                                  │
                                  └─ Returns PrivacySafeAnalyticsResponse
                            ←─────┤
├─ Display with badges ◄────────────┘

Client                           API                        Storage
├─ GET /x402/analytics/detailed ──→  /routes/protected.ts
                                      ├─ X402 middleware (requires payment)
                                      ├─ persistence.getDetailedAnalyticsData()
                                      ├─ analytics-service.getDetailedAnalytics()
                                      │  ├─ Same as public, but:
                                      │  ├─ Includes transaction hashes (retention)
                                      │  └─ Includes payer key hashes (retention)
                                      │
                                      └─ Returns DetailedAnalyticsResponse
                            ◄──────────┤
├─ Display detailed records ◄─────────┘
```

## What Gets Redacted

### Always (Public & Detailed)
```
❌ queryOrUrl: "SELECT * FROM users"        // NEVER exposed
❌ facilitatorUrl: "http://internal..."     // NEVER exposed
❌ Full payer address: "GBLL3LQ..."         // NEVER exposed (hashed instead)
```

### In Public Only
```
❌ paymentTxHash: "tx_abc123..."            // Not in public endpoint
```

### After Retention (Both)
```
🕐 payerHash: undefined                     // After 90 days
🕐 paymentTxHash: undefined                 // After 90 days (detailed only)
```

### Always Safe ✓
```
✅ aggregation counts and volumes
✅ settlement status (demo/verified/settled/failed)
✅ mode (search/news/scrape)
✅ providerId
✅ priceUsd
✅ latencyMs
✅ createdAt
✅ traceId
✅ payerHash (16-char SHA256 within retention)
```

## Pagination Example

```typescript
async function getAllAnalytics() {
  const all: PrivacySafeUsageRecord[] = [];
  let cursor: string | undefined;
  
  while (true) {
    const params = new URLSearchParams({ limit: "50" });
    if (cursor) params.append("cursor", cursor);
    
    const response = await fetch(`/api/v1/analytics?${params}`);
    const data = (await response.json()) as PrivacySafeAnalyticsResponse;
    
    all.push(...data.recentRecords);
    
    if (!data.pagination.hasMore) break;
    cursor = data.pagination.nextCursor;
  }
  
  return all;
}
```

## Configuration Options

```typescript
// Override defaults in service calls
getPublicAnalytics(
  usageEvents,
  paymentAttempts,
  { limit: 50 },  // query params
  {               // config override
    retentionDays: 30,      // Redact sensitive fields after 30 days
    maxPageLimit: 50,       // Max records per page
    defaultPageLimit: 10    // Default if limit not specified
  }
);
```

## Tests

```bash
# Run all analytics tests
npm test -- analytics

# Run specific test file
npm test -- analytics-service.test.ts
npm test -- analytics-privacy.test.ts
npm test -- analytics-security.test.ts

# Run with coverage
npm test -- analytics --coverage
```

## Documentation

- **Full API Docs**: [docs/ANALYTICS_API.md](docs/ANALYTICS_API.md)
- **Implementation Details**: [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md)
- **Source Code**: See files list below

## Files

| File | Purpose |
|------|---------|
| `packages/shared/src/types.ts` | Type definitions for all analytics responses |
| `apps/api/src/lib/analytics-privacy.ts` | Privacy utilities (hashing, cursor encoding, retention) |
| `apps/api/src/lib/analytics-service.ts` | Aggregation and pagination logic |
| `apps/api/src/lib/persistence.ts` | Database access for analytics |
| `apps/api/src/routes/public.ts` | Public `/api/v1/analytics` endpoint |
| `apps/api/src/routes/protected.ts` | Protected `/x402/analytics/detailed` endpoint |
| `apps/web/src/pages/ControlDeckPage.tsx` | Dashboard UI with analytics display |
| `apps/web/src/styles.css` | Settlement badge styling |
| `docs/ANALYTICS_API.md` | Full API documentation |

## Debugging

```typescript
// Log aggregation breakdown
console.log(analytics.aggregation);
// {
//   demoPaid: { totalCount: 5, totalVolumeUsd: 0.05, byCategory: {...} },
//   verified: { totalCount: 0, totalVolumeUsd: 0, byCategory: {...} },
//   settled: { totalCount: 2, totalVolumeUsd: 0.03, byCategory: {...} },
//   failed: { totalCount: 1, totalVolumeUsd: 0.01, byCategory: {...} }
// }

// Check pagination status
console.log(analytics.pagination);
// { cursor: "start", limit: 20, hasMore: true, nextCursor: "eyJ..." }

// Verify redaction worked
console.log(analytics.recentRecords[0]);
// {
//   id: "use_abc123",
//   mode: "search",
//   providerId: "search.basic",
//   paymentStatus: "demo-paid",
//   payerHash: "a1b2c3d4e5f6g7h8",  // 16-char hash, not full address
//   // ❌ NO queryOrUrl, facilitatorUrl, paymentTxHash (in public)
// }
```

## Common Issues

**Issue**: Cursor not working or not returning results
- **Fix**: Ensure cursor is base64-encoded. Invalid cursors default to "start".

**Issue**: Payer hash undefined
- **Fix**: Record may be older than retention period (>90 days). Check `createdAt`.

**Issue**: Query appears in aggregation but not in recent records
- **Fix**: May be on a different page. Use cursor pagination to fetch other pages.

**Issue**: Transaction hash not in response
- **Fix**: Public endpoint never returns txHash. Use `/x402/analytics/detailed` and check retention.
