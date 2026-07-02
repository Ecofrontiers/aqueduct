/**
 * beezie-discover.mjs — LIVE evidence: run BeezieMarketplaceAdapter.discover() against the
 * real OpenSea Orders API and print the real Seaport orders it reads (Sprint-1 AC #2).
 *
 *   node --experimental-strip-types scripts/beezie-discover.mjs
 *
 * Prints, for the top orders: order_hash, protocol_address (= Seaport 1.6), chain (base),
 * USDC consideration, ask, and the canonical url — the provenance the Evaluator checks.
 * Uses the repo OpenSea read key by default; override with OPENSEA_API_KEY.
 */
import { BeezieMarketplaceAdapter, SEAPORT_1_6, USDC_BASE } from "../lib/adapters/beezie.ts";

const key = process.env.OPENSEA_API_KEY; // optional override; adapter falls back to the repo key
const adapter = new BeezieMarketplaceAdapter(key ? { openSeaApiKey: key } : {});

console.log("=== BeezieMarketplaceAdapter.discover() — LIVE OpenSea Orders API ===");
console.log("Seaport 1.6 :", SEAPORT_1_6);
console.log("USDC (Base) :", USDC_BASE);
console.log("");

let listings;
try {
  listings = await adapter.discover({ limit: 30 });
} catch (e) {
  console.error("LIVE discover() failed (network/key):", e.message);
  console.error("This is the network-gated AC #2 — it must pass once with evidence. Retry when online.");
  process.exit(1);
}

console.log(`discover() returned ${listings.length} live USDC Seaport orders (WETH orders skipped).\n`);

const top = listings.slice(0, 5);
for (const l of top) {
  const raw = l.raw ?? {};
  console.log(`• order_hash       ${l.listingId}`);
  console.log(`  protocol_address ${raw.protocol_address}  (Seaport 1.6 == ${String(raw.protocol_address).toLowerCase() === SEAPORT_1_6.toLowerCase()})`);
  console.log(`  chain            ${raw.chain}`);
  console.log(`  ask              $${l.askUsd} ${l.currency}`);
  console.log(`  custody          ${l.custody}  tokenized=${l.tokenized}  live=${l.isLive}`);
  console.log(`  url              ${l.url}`);
  console.log("");
}

// Hard evidence assertions (exit non-zero if the live read doesn't match the spec).
const first = listings[0];
if (!first) {
  console.error("FAIL: no live USDC orders returned.");
  process.exit(1);
}
const r = first.raw ?? {};
const okSeaport = String(r.protocol_address).toLowerCase() === SEAPORT_1_6.toLowerCase();
const okChain = r.chain === "base";
const okHash = typeof first.listingId === "string" && first.listingId.startsWith("0x");
const okUsdc = first.currency === "USDC" && first.askUsd > 0;
console.log("EVIDENCE CHECK:");
console.log("  ≥1 live order        :", listings.length >= 1);
console.log("  protocol = Seaport1.6:", okSeaport);
console.log("  chain = base         :", okChain);
console.log("  order_hash present   :", okHash);
console.log("  USDC consideration   :", okUsdc);

const pass = listings.length >= 1 && okSeaport && okChain && okHash && okUsdc;
console.log(pass ? "\nAC #2 PASS — live Seaport orders read from the OpenSea Orders API." : "\nAC #2 FAIL");
process.exit(pass ? 0 : 1);
