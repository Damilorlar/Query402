import { describe, expect, it } from "vitest";
import { exec } from "child_process";
import { promisify } from "util";
import { resolve } from "path";

const execAsync = promisify(exec);
// Workaround for Windows cross-platform testing
const tsx = process.platform === "win32" ? "npx.cmd tsx" : "npx tsx";
const cliPath = resolve(__dirname, "cli.ts");

describe("CLI Validation", () => {
  it("exits with clear message when query is missing for search mode", async () => {
    try {
      await execAsync(`${tsx} "${cliPath}" search`);
      expect.fail("Should have failed");
    } catch (error: any) {
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Missing query for search mode.");
      expect(error.stdout).toContain("Usage:");
    }
  });

  it("exits with clear message when URL is missing for scrape mode (with flag)", async () => {
    try {
      await execAsync(`${tsx} "${cliPath}" scrape --provider scrape.page`);
      expect.fail("Should have failed");
    } catch (error: any) {
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Missing URL for scrape mode.");
      expect(error.stdout).toContain("Usage:");
    }
  });

  it("exits with clear message when query is missing for news mode", async () => {
    try {
      await execAsync(`${tsx} "${cliPath}" news`);
      expect.fail("Should have failed");
    } catch (error: any) {
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Missing query for news mode.");
      expect(error.stdout).toContain("Usage:");
    }
  });

  it("exits with error when query is missing with --receipt flag", async () => {
    try {
      await execAsync(`${tsx} "${cliPath}" search --receipt`);
      expect.fail("Should have failed");
    } catch (error: any) {
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Missing query for search mode.");
    }
  });

  it("exits with error when query is missing with --json flag", async () => {
    try {
      await execAsync(`${tsx} "${cliPath}" news --json`);
      expect.fail("Should have failed");
    } catch (error: any) {
      expect(error.code).toBe(1);
      expect(error.stderr).toContain("Missing query for news mode.");
    }
  });
});

describe("redactInput", () => {
  it("returns short inputs unchanged", async () => {
    const { redactInput } = await import("./cli.js");
    expect(redactInput("short query")).toBe("short query");
    expect(redactInput("a".repeat(50))).toBe("a".repeat(50));
  });

  it("truncates long inputs with ellipsis", async () => {
    const { redactInput } = await import("./cli.js");
    const long = "a".repeat(100);
    expect(redactInput(long)).toBe("a".repeat(47) + "...");
  });
});

describe("buildReceipt", () => {
  it("builds correct receipt structure", async () => {
    const { buildReceipt } = await import("./cli.js");
    const receipt = buildReceipt({
      mode: "search",
      provider: "search.basic",
      term: "test query",
      price: 0.01,
      traceId: "trace_abc123",
    });

    expect(receipt).toEqual({
      command: "search",
      provider: "search.basic",
      input: "test query",
      price: 0.01,
      traceId: "trace_abc123",
    });
  });

  it("handles missing price and traceId", async () => {
    const { buildReceipt } = await import("./cli.js");
    const receipt = buildReceipt({
      mode: "scrape",
      provider: "scrape.page",
      term: "https://example.com",
    });

    expect(receipt).toEqual({
      command: "scrape",
      provider: "scrape.page",
      input: "https://example.com",
      price: null,
      traceId: null,
    });
  });

  it("redacts long inputs in receipt", async () => {
    const { buildReceipt } = await import("./cli.js");
    const long = "a".repeat(100);
    const receipt = buildReceipt({
      mode: "search",
      provider: "search.basic",
      term: long,
      price: 0.05,
      traceId: "trace_xyz",
    });

    expect(receipt.input).toBe("a".repeat(47) + "...");
  });
});
