import test from "node:test";
import assert from "node:assert";
import { updatePaymentAttemptEvidence, updateUsageEventEvidence, savePaymentAttempt, saveUsageEvent, getPaymentAttempts, getUsageEvents } from "../src/lib/persistence.js";

test("evidence pipeline updates correctly on settlement", async (t) => {
  const paymentId = "pay_test_123";
  const traceId = "trace_test_456";

  savePaymentAttempt({
    id: paymentId,
    endpoint: "/x402/search",
    providerId: "search.basic",
    evidence: {
      status: "verified",
      network: "stellar:testnet",
      amountUsd: 0.01,
      payToAddress: "G...",
      facilitatorUrl: "http://...",
      paymentPayload: "raw_header"
    },
    createdAt: new Date().toISOString()
  });

  saveUsageEvent({
    id: "use_test_123",
    mode: "search",
    endpoint: "/x402/search",
    providerId: "search.basic",
    queryOrUrl: "test",
    priceUsd: 0.01,
    evidence: {
      status: "verified",
      network: "stellar:testnet",
      amountUsd: 0.01,
      payToAddress: "G...",
      facilitatorUrl: "http://...",
      paymentPayload: "raw_header"
    },
    traceId,
    createdAt: new Date().toISOString(),
    latencyMs: 100
  });

  updatePaymentAttemptEvidence(paymentId, {
    status: "settled",
    network: "stellar:testnet",
    amountUsd: 0.01,
    payToAddress: "G...",
    facilitatorUrl: "http://...",
    transactionHash: "tx_hash_123",
    paymentPayload: "raw_header"
  });

  updateUsageEventEvidence(traceId, {
    status: "settled",
    network: "stellar:testnet",
    amountUsd: 0.01,
    payToAddress: "G...",
    facilitatorUrl: "http://...",
    transactionHash: "tx_hash_123",
    paymentPayload: "raw_header"
  });

  const payment = getPaymentAttempts().find(p => p.id === paymentId);
  const usage = getUsageEvents().find(u => u.traceId === traceId);

  assert.strictEqual(payment?.evidence.status, "settled");
  if (payment?.evidence.status === "settled") {
    assert.strictEqual(payment.evidence.transactionHash, "tx_hash_123");
  }

  assert.strictEqual(usage?.evidence.status, "settled");
  if (usage?.evidence.status === "settled") {
    assert.strictEqual(usage.evidence.transactionHash, "tx_hash_123");
  }
});
