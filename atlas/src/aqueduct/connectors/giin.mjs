// Aqueduct — GIIN (Global Impact Investing Network) connector.
//
// Unlike ethichub.mjs, this is NOT a live-poll connector. IRIS+ (iris.thegiin.org, GIIN's
// impact-metrics catalog) has no public REST API: its category/theme filters and Excel
// export are client-side JS/button-driven, invisible to a plain fetch (verified 2026-07-02
// — `?category=agriculture` returns the same unfiltered shell as the bare page). What DOES
// fetch cleanly is an individual metric's own page — real, structured, no auth.
//
// So this connector is a curated SNAPSHOT: a small set of real IRIS+ metric codes, each
// individually verified by fetching its actual page, not guessed or invented. Every entry
// below carries the real source URL and the date it was verified. Re-verify by refetching
// the URL, the same discipline as any other snapshot in this repo — never silently
// hand-edit a definition to drift from what IRIS+ actually publishes.
//
// Selected for relevance to smallholder agricultural financing (docs/research/09's
// financing-venue policy work) — not the full 781-metric catalog, which needs the browser
// approach (Chrome, category filter, or the Downloads button) this connector doesn't do.

const VERIFIED_AT = "2026-07-02";

/** @typedef {{code: string, version: string, name: string, definition: string, url: string, verifiedAt: string}} IrisMetric */

/** @type {IrisMetric[]} */
export const IRIS_METRICS = [
  {
    code: "OD6247",
    version: "5.2",
    name: "Social Impact Objectives",
    definition:
      "Describes the social impact objectives pursued by the organization. Agriculture options include: Increasing Access to Better, Stable Pricing of Agricultural Products; Increasing Access to and Use of Quality Agricultural Inputs; Increasing Access to Agricultural Training and Information; Increasing Farm Profitability; Increasing Food Security through Smallholder Farms; Increasing Financial Health of Farmers; Increasing Access to and Use of Products/Services for Agricultural Risk Mitigation.",
    url: "https://iris.thegiin.org/metric/5.2/od6247/",
    verifiedAt: VERIFIED_AT,
  },
  {
    code: "PI4060",
    version: "5.2",
    name: "Client Individuals: Total",
    definition: "Number of unique individuals who were clients of the organization during the reporting period.",
    url: "https://iris.thegiin.org/metric/5.2/pi4060/",
    verifiedAt: VERIFIED_AT,
  },
  {
    code: "PI6372",
    version: "5.3",
    name: "Client Individuals: Smallholder",
    definition: "Number of unique smallholder farmer individuals who were clients during the reporting period.",
    url: "https://iris.thegiin.org/metric/5.3/pi6372/",
    verifiedAt: VERIFIED_AT,
  },
  {
    code: "PI5160",
    version: "5.3a",
    name: "Average Loan Size Disbursed",
    definition: "Average loan size disbursed by the organization during the reporting period.",
    url: "https://iris.thegiin.org/metric/5.3a/pi5160/",
    verifiedAt: VERIFIED_AT,
  },
];

/** Resolve a metric by code — throws on unknown code, same discipline as
 *  sim/failureModes.mjs's resolveFailureMode (a citation that doesn't resolve is a bug). */
export function resolveIrisMetric(code) {
  const entry = IRIS_METRICS.find((m) => m.code === code);
  if (!entry) {
    throw new Error(
      `connectors/giin.mjs: unknown IRIS+ metric code "${code}" — verify against iris.thegiin.org, do not invent one.`,
    );
  }
  return entry;
}

/**
 * Matches ethichub.mjs's { data, ledgerEntry } connector shape for the real-vs-sim ledger,
 * but honestly: ok is true (the data IS real), and the note says plainly this is a curated
 * snapshot, not a live poll, because no live-pollable surface exists.
 */
export function fetchIrisMetricsSnapshot() {
  return {
    data: IRIS_METRICS,
    ledgerEntry: {
      ts: new Date().toISOString(),
      source: "iris.thegiin.org",
      url: "https://iris.thegiin.org/metrics/",
      ok: true,
      note: `SNAPSHOT — ${IRIS_METRICS.length} metric(s) individually verified ${VERIFIED_AT}, not a live poll (IRIS+ has no public API; category filters and Excel export are JS/button-driven).`,
    },
  };
}
