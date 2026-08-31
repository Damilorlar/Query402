import { z } from "zod";
import { paidRouteErrorCodeSchema } from "./schemas.js";

export type QueryMode = "search" | "news" | "scrape";
export type ProviderCategory = QueryMode;
export type SourceType = "live" | "deterministic-fallback" | "unavailable";
export type Provenance = "mock" | "fallback" | "live" | "unknown";
export type ExecutionFallbackReason =
  | "timeout"
  | "circuit-open"
  | "unhealthy"
  | "adapter-error"
  | "deterministic-provider"
  | "missing-fallback";
export type CircuitBreakerState = "closed" | "half-open" | "open";
export type PaymentSource = "sponsored" | "wallet" | "demo";
export type PaidRouteErrorCode = z.infer<typeof paidRouteErrorCodeSchema>;

export type LatencyBucket = "<1s" | "1-3s" | "3-10s" | ">10s" | "unknown";

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
  provenance: Provenance;
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

export type PaymentEvidenceStatus = "demo-paid" | "verified" | "settled" | "failed";

export interface BasePaymentEvidence {
  status: PaymentEvidenceStatus;
  network: string;
  amountUsd: number;
  payToAddress: string;
  facilitatorUrl: string;
  payerPublicKey?: string;
  error?: string;
}

export interface DemoPaymentEvidence extends BasePaymentEvidence {
  status: "demo-paid";
  demoId: string;
}

export interface VerifiedPaymentEvidence extends BasePaymentEvidence {
  status: "verified";
  paymentPayload: string;
}

export interface SettledPaymentEvidence extends BasePaymentEvidence {
  status: "settled";
  transactionHash: string;
  paymentPayload: string;
}

export interface FailedPaymentEvidence extends BasePaymentEvidence {
  status: "failed";
  error: string;
  paymentPayload?: string;
}

export type PaymentEvidence =
  | DemoPaymentEvidence
  | VerifiedPaymentEvidence
  | SettledPaymentEvidence
  | FailedPaymentEvidence;

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
  paymentId: string;
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
  errorCode?: PaidRouteErrorCode;
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

export interface ProviderCapability {
  id: string;
  name: string;
  category: ProviderCategory;
  priceUsd: number;
  sourceType: SourceType;
  latencyEstimateMs: number;
  enabled: boolean;
  hasFallback: boolean;
  caveat: string | null;
}

export interface SponsorshipGrant {
  grantId: string;
  wallet: string;
  network: string;
  mode?: QueryMode;
  providerId?: string;
  maxAmountUsd: number;
  expiresAt: string;
  nonce: string;
  issuedAt: string;
}

export interface PaginatedAnalyticsResponse {
  success: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  data: PrivacySafeAnalyticsRecord[];
}

export interface PrivacySafeAnalyticsRecord {
  id: string;
  timestamp: string;
  payerAddress: string;
  volumeType: 'demo' | 'settled';
  amount: number;
  asset: string;
}

export interface PaginatedAnalyticsResponse {
  success: boolean;
  hasMore: boolean;
  nextCursor: string | null;
  data: PrivacySafeAnalyticsRecord[];
}

export interface SponsorshipPreviewBudget {
  limitUsd: number;
  spentUsd: number;
  remainingUsd: number;
  windowStart: string;
}

export interface SponsorshipPreviewRestrictions {
  mode: QueryMode | null;
  providerId: string | null;
}

export interface SponsorshipPreviewGrant {
  maxAmountUsd: number;
  ttlSeconds: number;
  expiresInSeconds: number;
  restrictions: SponsorshipPreviewRestrictions;
}

export interface SponsorshipPreview {
  sponsorshipEnabled: boolean;
  storageAvailable: boolean;
  available: boolean;
  decision: string;
  network: string;
  wallet: string;
  mode: QueryMode;
  provider: string;
  providerName: string;
  grant: SponsorshipPreviewGrant;
  quotedPriceUsd: number;
  priceFitsGrant: boolean;
  perWalletBudget: SponsorshipPreviewBudget;
  globalBudget: SponsorshipPreviewBudget;
  reason?: string;
}

export interface SponsorshipPreviewRequest {
  wallet: string;
  mode: QueryMode;
  provider: string;
}
