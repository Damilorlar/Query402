export type QueryMode = "search" | "news" | "scrape";
export type ProviderCategory = QueryMode;
export type SourceType = "live" | "deterministic-fallback" | "unavailable";

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
  evidence: PaymentEvidence;
  traceId: string;
  createdAt: string;
  latencyMs: number;
}

export interface PaymentAttempt {
  id: string;
  endpoint: string;
  providerId: string;
  evidence: PaymentEvidence;
  createdAt: string;
}

export interface AnalyticsSummary {
  totalQueries: number;
  totalSpendUsd: number;
  spendByCategory: Record<QueryMode, number>;
  recentTransactions: PaymentAttempt[];
  recentUsage: UsageEvent[];
}
