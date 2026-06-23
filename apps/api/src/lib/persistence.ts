import fs from "node:fs";
import path from "node:path";
import type { AnalyticsSummary, PaymentAttempt, UsageEvent, PaymentEvidence } from "@query402/shared";

interface PersistedDb {
  usage: UsageEvent[];
  payments: PaymentAttempt[];
}

const dataDir = path.resolve(process.cwd(), "apps/api/data");
const dataFile = path.join(dataDir, "db.json");

function ensureDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    const initial: PersistedDb = { usage: [], payments: [] };
    fs.writeFileSync(dataFile, JSON.stringify(initial, null, 2), "utf-8");
  }
}

function readDb(): PersistedDb {
  ensureDb();
  const raw = fs.readFileSync(dataFile, "utf-8");
  return JSON.parse(raw) as PersistedDb;
}

function writeDb(db: PersistedDb) {
  fs.writeFileSync(dataFile, JSON.stringify(db, null, 2), "utf-8");
}

export function saveUsageEvent(event: UsageEvent) {
  const db = readDb();
  db.usage.unshift(event);
  db.usage = db.usage.slice(0, 500);
  writeDb(db);
}

export function savePaymentAttempt(payment: PaymentAttempt) {
  const db = readDb();
  db.payments.unshift(payment);
  db.payments = db.payments.slice(0, 500);
  writeDb(db);
}

export function updatePaymentAttemptEvidence(id: string, evidence: PaymentEvidence) {
  const db = readDb();
  const index = db.payments.findIndex(p => p.id === id);
  if (index !== -1) {
    db.payments[index].evidence = evidence;
    writeDb(db);
  }
}

export function updateUsageEventEvidence(traceId: string, evidence: PaymentEvidence) {
  const db = readDb();
  const index = db.usage.findIndex(u => u.traceId === traceId);
  if (index !== -1) {
    db.usage[index].evidence = evidence;
    writeDb(db);
  }
}

export function getUsageEvents() {
  return readDb().usage;
}

export function getPaymentAttempts() {
  return readDb().payments;
}

export function getAnalyticsSummary(): AnalyticsSummary {
  const db = readDb();
  const spendByCategory: Record<"search" | "news" | "scrape", number> = db.usage.reduce(
    (acc, event) => {
      acc[event.mode] += event.priceUsd;
      return acc;
    },
    { search: 0, news: 0, scrape: 0 }
  );

  const totalSpendUsd = Number((spendByCategory.search + spendByCategory.news + spendByCategory.scrape).toFixed(6));

  return {
    totalQueries: db.usage.length,
    totalSpendUsd,
    spendByCategory,
    recentTransactions: db.payments.slice(0, 10),
    recentUsage: db.usage.slice(0, 10)
  };
}
