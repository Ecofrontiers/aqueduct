/**
 * oracle-emitter.test.ts — the gap-filling vault ORACLE EMITTER + tier honesty (Vaults Build Step 3).
 *
 * Proves the ORACLE-HONESTY invariant (Guardrail B) at the emitter + engine-tier layer:
 *   OE-1  GAP FILL       — a >=2-independent-bidder auction clear is emitted as a `vault_auction`
 *                          oracle for a gap product (correct payload, POSTed to /api/oracle/vault).
 *   OE-2  NON-OVERWRITE  — when the guarded backend refuses (a real higher-tier comp already
 *                          exists), the emitter relays honestly and surfaces written:false — it
 *                          never launders a vault price over a real comp.
 *   OE-3  WASH EXCLUSION — a single-bidder / self-dealt clear is DROPPED at the emitter (NO POST),
 *                          so a wash-trade can never reach the oracle.
 *   OE-4  TIER HONESTY   — the engine oracle adapter maps vault_auction/vault_fill EXPLICITLY to
 *                          the weakest tier (never silently mis-ranks to ebay_active 0.3), and
 *                          never reports them as grader-matched.
 *
 * Zero-network: every POST goes through an injected fetch spy (a fetch that is otherwise not
 * called at all for a dropped clear, which the test asserts).
 */

import { ok, eq, section } from "./assert.ts";
import {
  OracleEmitter,
  evaluateAuctionCleared,
  evaluateCardAcquired,
  MIN_INDEPENDENT_BIDDERS,
  type AuctionClearedEvent,
  type CardAcquiredEvent,
  type VaultOraclePayload,
} from "../../../slabclaw-vaults/agent/src/services/oracle-emitter.ts";
import { normalizeTier, isGraderMatchedTier, computeOracleConfidence } from "../lib/adapters/oracle.ts";

/** A fetch spy: records every call and returns a canned JSON response (default written:true). */
function spyFetch(responder?: (payload: VaultOraclePayload) => { status?: number; body: unknown }) {
  const calls: { url: string; init: RequestInit; payload: VaultOraclePayload }[] = [];
  const impl = (async (url: string | URL | Request, init?: RequestInit) => {
    const payload = JSON.parse(String(init?.body ?? "{}")) as VaultOraclePayload;
    calls.push({ url: String(url), init: init ?? {}, payload });
    const r = responder ? responder(payload) : { status: 200, body: { ok: true, written: true } };
    return {
      status: r.status ?? 200,
      ok: (r.status ?? 200) < 400,
      json: async () => r.body,
    } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

export async function run(): Promise<void> {
  section("oracle-emitter — OE-4 tier honesty (never over-trust a self-referential price)");
  {
    eq(normalizeTier("vault_auction"), "vault_auction", "vault_auction maps to itself (not ebay_active)");
    eq(normalizeTier("vault_fill"), "vault_fill", "vault_fill maps to itself");
    // The silent-misrank trap: a suffixed variant must NOT fall through to ebay_active.
    eq(normalizeTier("vault_auction_capped"), "vault_auction", "suffixed vault_auction still ranks as vault_auction");
    ok(normalizeTier("vault_auction") !== "ebay_active", "vault_auction is NOT mis-ranked as ebay_active (T6)");
    ok(!isGraderMatchedTier("vault_auction"), "vault_auction is NOT grader-matched");
    ok(!isGraderMatchedTier("vault_fill"), "vault_fill is NOT grader-matched");
    // Weakest weight: a vault_auction confidence must be below a manual one for the same inputs.
    const vaultConf = computeOracleConfidence("vault_auction", "low", "fresh", 2);
    const manualConf = computeOracleConfidence("manual", "low", "fresh", 2);
    const ebayConf = computeOracleConfidence("ebay_active", "low", "fresh", 2);
    ok(vaultConf < manualConf, `vault_auction confidence (${vaultConf}) < manual (${manualConf})`);
    ok(vaultConf < ebayConf, `vault_auction confidence (${vaultConf}) < ebay_active (${ebayConf}) — no over-trust`);
  }

  section("oracle-emitter — OE-1 GAP FILL (a >=2-bidder clear emits a vault_auction)");
  {
    const ev: AuctionClearedEvent = {
      vaultAddr: "0xVaultA", certHash: "0xcert1", productId: "gym2-2", grade: 9, grader: "PSA",
      clearingPriceShares: 640_000000000000n, clearingPriceUsd: 640, validBidCount: 3,
    };
    const decision = evaluateAuctionCleared(ev);
    ok(decision.emit, "3-bidder clear passes the gate");
    eq(decision.payload?.source, "vault_auction", "payload source = vault_auction");
    eq(decision.payload?.price, 640, "payload carries the on-chain clearing USD (never recomputed)");
    eq(decision.payload?.bidderCount, 3, "payload carries the distinct-bidder count");
    eq(decision.payload?.grader, "PSA", "grader normalized/uppercased");

    const { impl, calls } = spyFetch();
    const emitter = new OracleEmitter({ apiUrl: "https://api.slabclaw.com/", adminToken: "adm", fetchImpl: impl });
    const res = await emitter.handleAuctionCleared(ev);
    ok(res.posted, "the clear was POSTed to the ingest");
    eq(calls.length, 1, "exactly one POST made");
    eq(calls[0].url, "https://api.slabclaw.com/api/oracle/vault", "POST hits the guarded vault ingest route");
    eq((calls[0].init.headers as Record<string, string>)["x-admin-token"], "adm", "admin token attached");
    eq(calls[0].payload.productId, "gym2-2", "posted payload targets the gap product");
    eq(calls[0].payload.source, "vault_auction", "posted source is vault_auction");
  }

  section("oracle-emitter — OE-2 NON-OVERWRITE (guarded backend refusal is surfaced honestly)");
  {
    // Simulate the backend guard: a real comp exists on base1-22 CGC 8 → upsertVaultOracle refuses.
    const REAL = new Set(["base1-22|CGC|8"]);
    const { impl, calls } = spyFetch((p) => {
      const key = `${p.productId}|${p.grader}|${p.grade}`;
      if (REAL.has(key)) return { status: 200, body: { ok: true, written: false, reason: "refuse-overwrite-real: existing source \"pc_sold\"" } };
      return { status: 200, body: { ok: true, written: true } };
    });
    const emitter = new OracleEmitter({ apiUrl: "https://api.slabclaw.com", adminToken: "adm", fetchImpl: impl });

    // A vault clear that WOULD overwrite a real comp: relayed, but the backend refuses.
    const res = await emitter.handleAuctionCleared({
      vaultAddr: "0xVaultC", certHash: "0xcert2", productId: "base1-22", grade: 8, grader: "CGC",
      clearingPriceUsd: 500, validBidCount: 4,
    });
    ok(res.posted, "clear reaches the GUARDED endpoint (never a direct SQL write)");
    eq((res.body as { written?: boolean }).written, false, "backend refused — real comp not overwritten");
    ok(String((res.body as { reason?: string }).reason).includes("refuse-overwrite-real"), "refusal reason surfaced honestly");

    // The same emitter fills a genuine gap on a different product.
    const gap = await emitter.handleAuctionCleared({
      vaultAddr: "0xVaultA", certHash: "0xcert3", productId: "neo4-1st-9", grade: 9, grader: "PSA",
      clearingPriceUsd: 1150, validBidCount: 2,
    });
    eq((gap.body as { written?: boolean }).written, true, "the gap product IS filled (written:true)");
    eq(calls.length, 2, "both clears were POSTed through the guarded route");
  }

  section("oracle-emitter — OE-3 WASH EXCLUSION (a self-dealt / lone-bidder clear is DROPPED, no POST)");
  {
    ok(MIN_INDEPENDENT_BIDDERS === 2, "wash threshold is >=2 distinct independent bidders");
    for (const n of [1, 0]) {
      const d = evaluateAuctionCleared({
        vaultAddr: "0xVaultB", certHash: "0xcertw", productId: "neo4-1st-9", grade: 9, grader: "PSA",
        clearingPriceUsd: 9999, validBidCount: n,
      });
      ok(!d.emit, `${n}-bidder clear is dropped by the gate`);
      ok(d.reason.includes("wash-gate"), `reason names the wash gate (got: ${d.reason})`);
      ok(!d.payload, "no payload built for a wash clear");
    }
    // And critically: NO network call is made for a dropped clear.
    const { impl, calls } = spyFetch();
    const emitter = new OracleEmitter({ apiUrl: "https://api.slabclaw.com", adminToken: "adm", fetchImpl: impl });
    const res = await emitter.handleAuctionCleared({
      vaultAddr: "0xVaultB", certHash: "0xcertw", productId: "neo4-1st-9", grade: 9, grader: "PSA",
      clearingPriceUsd: 9999, validBidCount: 1,
    });
    ok(!res.posted, "no POST made for a single-bidder wash clear");
    eq(calls.length, 0, "the fetch spy was never called (self-deal can't reach the oracle)");
  }

  section("oracle-emitter — vault_fill floor (weaker signal, not wash-gated)");
  {
    const ev: CardAcquiredEvent = {
      vaultAddr: "0xVaultA", certHash: "0xcertf", productId: "gym2-2", grade: 7, grader: "PSA", priceUsd: 240,
    };
    const d = evaluateCardAcquired(ev);
    ok(d.emit, "a recorded acquisition emits a vault_fill floor");
    eq(d.payload?.source, "vault_fill", "source = vault_fill");
    eq(d.payload?.bidderCount, 0, "a fill has no bidders (floor-only)");
    // A zero-price fill is dropped.
    ok(!evaluateCardAcquired({ ...ev, priceUsd: 0 }).emit, "zero-price fill dropped");
  }
}

// Allow running this file standalone (node --experimental-strip-types test/oracle-emitter.test.ts).
if (import.meta.url === `file://${process.argv[1]}`) {
  const { exitWithSummary } = await import("./assert.ts");
  await run();
  exitWithSummary();
}
