export type QueryMode = "search" | "news" | "scrape";
export type ProviderCategory = QueryMode;
export type SourceType = "live" | "deterministic-fallback" | "unavailable";
export type ExecutionFallbackReason =
  | "timeout"
  | "circuit-open"
  | "unhealthy"
  | "adapter-error"
  | "deterministic-provider"
  | "missing-fallback";
export type CircuitBreakerState = "closed" | "half-open" | "open";
export type PaymentSource = "sponsored" | "wallet" | "demo";

export interface ProviderExecutionMetadata {
  providerId: string;
  source: SourceType;
  usedFallback: boolean;
  fallbackReason?: ExecutionFallbackReason;
  latencyEstimateMs: number;
  observedDurationMs: number;
  circuitBreakerState?: CircuitBreakerState;
}

export interface ProviderDefinition {
  id: string;
  name: string;
  category: ProviderCategory;
  priceUsd: number;
  description: string;
  latencyEstimateMs: number;
  qualityScore: number;
  sourceType: SourceType;
  enabled: boolean;
}

export interface ProviderResultItem {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export interface QueryResult {
  mode: QueryMode;
  providerId: string;
  providerName: string;
  priceUsd: number;
  latencyMs: number;
  timestamp: string;
  traceId: string;
  items: ProviderResultItem[];
  source: SourceType;
  execution: ProviderExecutionMetadata;
  raw?: Record<string, unknown>;
}

export interface UsageEvent {
  id: string;
  mode: QueryMode;
  endpoint: string;
  providerId: string;
  queryOrUrl: string;
  priceUsd: number;
  network: string;
  paymentStatus: "verified" | "settled" | "failed" | "demo-paid";
  paymentKind?: "demo" | "verified" | "settled" | "failed";
  paymentTxHash?: string;
  asset?: string;
  payToAddress?: string;
  amount?: string;
  facilitatorUrl?: string;
  payerPublicKey?: string;
  traceId: string;
  createdAt: string;
  latencyMs: number;
  execution?: ProviderExecutionMetadata;
  sponsorshipGrantId?: string;
  policyDecision?: string;
  paymentSource?: PaymentSource;
  sponsorPublicKey?: string;
  priceOutlier?: boolean;
  priceOutlierReason?: string;
}

export interface PaymentAttempt {
  id: string;
  endpoint: string;
  providerId: string;
  amountUsd: number;
  network: string;
  asset?: string;
  amount?: string;
  evidenceKind?: "demo" | "verified" | "settled" | "failed";
  payerPublicKey?: string;
  payToAddress: string;
  facilitatorUrl: string;
  status: "demo-paid" | "verified" | "settled" | "failed";
  transactionHash?: string;
  facilitatorResult?: Record<string, unknown>;
  error?: string;
  createdAt: string;
  sponsorshipGrantId?: string;
  policyDecision?: string;
  paymentSource?: PaymentSource;
  sponsorPublicKey?: string;
}

export interface AnalyticsSummary {
  totalQueries: number;
  totalSpendUsd: number;
  settledSpendUsd: number;
  demoSpendUsd: number;
  failedSpendUsd: number;
  spendByCategory: Record<QueryMode, number>;
  settledSpendByCategory: Record<QueryMode, number>;
  demoSpendByCategory: Record<QueryMode, number>;
  executionSummary: {
    totalExecutions: number;
    liveExecutions: number;
    fallbackExecutions: number;
    unavailableExecutions: number;
    timeoutExecutions: number;
    circuitOpenExecutions: number;
    fallbackByCategory: Record<QueryMode, number>;
    fallbackReasonCounts: Record<ExecutionFallbackReason, number>;
  };
  totalDemoQueries: number;
  totalSettledPayments: number;
  spendByPaymentSource: Record<string, number>;
  recentDemoActivity: PaymentAttempt[];
  recentSettledPayments: PaymentAttempt[];
  recentTransactions: PaymentAttempt[];
  recentUsage: UsageEvent[];
}

// Privacy-safe analytics types

/**
 * Aggregated metrics separated by demo and settlement status
 */
export interface SettlementMetrics {
  count: number;
  volumeUsd: number;
}

export interface CategoryMetrics {
  search: SettlementMetrics;
  news: SettlementMetrics;
  scrape: SettlementMetrics;
}

/**
 * Public analytics aggregation - privacy-safe, no raw queries/URLs/payer data
 */
export interface PrivacySafeAnalyticsAggregation {
  /** Demo-paid queries without settlement */
  demoPaid: {
    totalCount: number;
    totalVolumeUsd: number;
    byCategory: CategoryMetrics;
  };
  /** Verified payments - on-chain record exists */
  verified: {
    totalCount: number;
    totalVolumeUsd: number;
    byCategory: CategoryMetrics;
  };
  /** Settled payments - fully confirmed on-chain */
  settled: {
    totalCount: number;
    totalVolumeUsd: number;
    byCategory: CategoryMetrics;
  };
  /** Failed payment attempts */
  failed: {
    totalCount: number;
    totalVolumeUsd: number;
    byCategory: CategoryMetrics;
  };
}

/**
 * Redacted usage record for public analytics endpoints
 * No raw query text, URLs, or full payer addresses
 */
export interface PrivacySafeUsageRecord {
  id: string;
  mode: QueryMode;
  endpoint: string;
  providerId: string;
  priceUsd: number;
  paymentStatus: "demo-paid" | "paid" | "failed";
  createdAt: string;
  latencyMs: number;
  traceId: string;
  /** Hashed payer identifier (redacted in public endpoint) */
  payerHash?: string;
}

/**
 * Cursor-based pagination parameters
 */
export interface CursorPaginationParams {
  cursor?: string;
  limit: number;
}

/**
 * Cursor-based pagination metadata
 */
export interface CursorPaginationMeta {
  cursor: string;
  limit: number;
  hasMore: boolean;
  nextCursor?: string;
}

/**
 * Public analytics endpoint response - paginated, redacted
 */
export interface PrivacySafeAnalyticsResponse {
  aggregation: PrivacySafeAnalyticsAggregation;
  recentRecords: PrivacySafeUsageRecord[];
  pagination: CursorPaginationMeta;
}

/**
 * Detailed analytics for authorized access
 * Still redacts sensitive fields but includes more data
 */
export interface DetailedAnalyticsRecord {
  id: string;
  mode: QueryMode;
  endpoint: string;
  providerId: string;
  priceUsd: number;
  paymentStatus: "demo-paid" | "paid" | "failed";
  paymentTxHash?: string;
  payerKeyHash?: string;
  createdAt: string;
  latencyMs: number;
  traceId: string;
}

/**
 * Detailed analytics response for private/authorized endpoints
 */
export interface DetailedAnalyticsResponse {
  aggregation: PrivacySafeAnalyticsAggregation;
  records: DetailedAnalyticsRecord[];
  pagination: CursorPaginationMeta;
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  /** Retention days for sensitive fields (queryOrUrl, payerPublicKey) */
  retentionDays: number;
  /** Maximum records per page */
  maxPageLimit: number;
  /** Default page limit */
  defaultPageLimit: number;
}
