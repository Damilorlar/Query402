export type QueryMode = "search" | "news" | "scrape";
export type ProviderCategory = QueryMode;
export type SourceType = "live" | "deterministic-fallback" | "unavailable";
export type PaymentSource = "sponsored" | "wallet" | "demo";

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
  paymentId: string;
  createdAt: string;
  latencyMs: number;
  sponsorshipGrantId?: string;
  policyDecision?: string;
  paymentSource?: PaymentSource;
  sponsorPublicKey?: string;
}

export interface PaymentAttempt {
  id: string;
  endpoint: string;
  providerId: string;
  evidence: PaymentEvidence;
  createdAt: string;
  sponsorshipGrantId?: string;
  policyDecision?: string;
  paymentSource?: PaymentSource;
  sponsorPublicKey?: string;
}

export interface AnalyticsSummary {
  totalQueries: number;
  totalSpendUsd: number;
  spendByCategory: Record<QueryMode, number>;
  recentTransactions: PaymentAttempt[];
  recentUsage: UsageEvent[];
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

export interface SignedGrant {
  grant: SponsorshipGrant;
  signature: string;
}

export interface SponsorshipChallenge {
  challengeId: string;
  wallet: string;
  message: string;
  expiresAt: string;
}
