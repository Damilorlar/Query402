import type { ProviderDefinition, QueryMode, QueryResult, PrivacySafeAnalyticsResponse } from "@query402/shared";

export interface PaidQueryResponse {
  payment: {
    network: string;
    facilitatorUrl: string;
    paymentResponseHeader: string | null;
  };
  result: QueryResult;
}

export interface AnalyticsResponse {
  totalQueries: number;
  totalSpendUsd: number;
  spendByCategory: Record<QueryMode, number>;
  recentTransactions: Array<{
    id: string;
    amountUsd: number;
    endpoint: string;
    providerId: string;
    status: string;
    createdAt: string;
  }>;
  recentUsage: Array<{
    id: string;
    mode: QueryMode;
    providerId: string;
    priceUsd: number;
    createdAt: string;
    latencyMs: number;
    paymentStatus: string;
    traceId: string;
  }>;
}

export type ProviderMap = Record<QueryMode, ProviderDefinition[]>;

// Re-export privacy-safe analytics for web usage
export type { PrivacySafeAnalyticsResponse };
