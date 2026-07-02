// Aqueduct — the oracle/pricing agent (DEMO-SPEC.md §3 item 3, §5 "Prices").
// REAL tier: ICE Coffee "C" futures (KC=F, ICE Futures U.S.), fetched live
// from Yahoo Finance's public chart endpoint via the dev proxy
// (atlas/vite.config.ts `/api/ice-c` — same same-origin-proxy pattern as the
// EthicHub connector, avoiding a browser CORS failure). Verified reachable
// 2026-07-02 (curl spike, see build notes): returns `regularMarketPrice` in
// US cents/lb for the front KC=F continuous contract, `fullExchangeName:
// "ICE Futures"`. This satisfies DEMO-SPEC §5's day-one feasibility spike —
// a real ICE C source was found; the ICO-composite / Pink-Sheet fallbacks are
// wired as later tiers per the SAME two-register grammar (DESIGN-BRIEF §2.4).
//
// Fallback tiers, in order (DEMO-SPEC §5, DESIGN-BRIEF §2.4):
//   1. LIVE  — ICE C front-month quote (this module's primary path)
//   2. ICO composite indicator (STRETCH — not wired; would need a second
//      dev-proxy target and HTML table parse; day-one spike budget spent on
//      tier 1, which succeeded)
//   3. SNAPSHOT — a labeled, dated price captured this build session
//
// The Chiapas differential is an ESTIMATE (specialty micro-lot premium over
// the commodity C-price for high-grown Mexican washed/honey coffee) — never
// presented as CONFIRMED; DESIGN-BRIEF §2.4 bans a C-quote without a named,
// sourced differential.

const ICE_C_PROXY_PATH = "/api/ice-c/v8/finance/chart/KC=F?range=5d&interval=1d";

/** ESTIMATE: typical specialty differential for high-grown Chiapas Soconusco
 *  washed/honey micro-lots over the ICE C front-month settlement. Not a
 *  live-fed number — no public per-origin differential feed exists at
 *  smallholder-lot grain (DEMO-SPEC §5 fallback-tier honesty rule). */
const CHIAPAS_DIFFERENTIAL_CENTS_LB = 22;
const CHIAPAS_DIFFERENTIAL_SOURCE =
  "ESTIMATE — specialty-grade Mexican Chiapas washed/honey micro-lot premium over ICE C, docs/research/04 grounding; no live per-origin differential feed exists at smallholder-lot grain";

/** SNAPSHOT fallback if the live fetch fails entirely (dated at build time). */
const SNAPSHOT_TIER = {
  tier: "SNAPSHOT",
  centsLb: 309.5,
  asOf: "2026-07-01",
  source: "ICE Coffee C (KC=F) snapshot captured during this build session — live re-fetch failed",
};

function centsLbToEurPerKg(centsLb) {
  const usdPerLb = centsLb / 100;
  const usdPerKg = usdPerLb * 2.20462;
  const eurPerKg = usdPerKg / 1.08; // SIM FX 1.08 USD/EUR — same labeled approximation as Gate 1 LotCard
  return eurPerKg;
}

/**
 * Fetch the real ICE C tier. Browser-only (relies on the dev proxy); in a
 * Node script context (no `fetch` to a dev server) or on a static production
 * deploy with no proxy, this throws and the caller falls back to SNAPSHOT —
 * the same honest degrade pattern as the EthicHub connector (DESIGN-BRIEF §4.8).
 */
async function fetchIceCLive() {
  const res = await fetch(ICE_C_PROXY_PATH);
  if (!res.ok) throw new Error(`ICE C proxy ${res.status}`);
  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta || typeof meta.regularMarketPrice !== "number") throw new Error("ICE C payload missing regularMarketPrice");
  return {
    tier: "LIVE",
    centsLb: meta.regularMarketPrice,
    asOf: new Date(meta.regularMarketTime * 1000).toISOString(),
    source: `${meta.fullExchangeName ?? "ICE Futures"} — ${meta.shortName ?? "Coffee C"} (KC=F) via Yahoo Finance public chart API`,
  };
}

/**
 * The oracle's two-register price for a lot (DESIGN-BRIEF §2.4). Attempts the
 * LIVE tier; degrades to SNAPSHOT honestly on any failure — never throws.
 */
export async function priceLot() {
  let base;
  try {
    base = await fetchIceCLive();
  } catch {
    base = SNAPSHOT_TIER;
  }

  const fairCentsLb = base.centsLb + CHIAPAS_DIFFERENTIAL_CENTS_LB;
  const fairFobEurKg = centsLbToEurPerKg(fairCentsLb);

  return {
    provenance: base.tier, // "LIVE" | "SNAPSHOT"
    baseCentsLb: Math.round(base.centsLb * 100) / 100,
    baseSource: base.source,
    baseAsOf: base.asOf,
    differentialCentsLb: CHIAPAS_DIFFERENTIAL_CENTS_LB,
    differentialSource: CHIAPAS_DIFFERENTIAL_SOURCE,
    fairCentsLb: Math.round(fairCentsLb * 100) / 100,
    fairFobEurKg: Math.round(fairFobEurKg * 100) / 100,
    incoterm: "FOB",
  };
}
