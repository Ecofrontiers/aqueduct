// Pure, framework-free predicate functions for Aqueduct's three filter
// categories (lots, routes/intents, institutions/actors). Plain ESM, no
// TypeScript — this repo has no test runner (no vitest/jest), so a bare
// `node some-script.mjs` needs to be able to import and exercise this module
// directly. `aqueductFiltersStore.ts` imports these same functions rather
// than re-implementing the logic, so the store and any sanity script always
// agree (same pattern as `tourStore.ts` importing `../sim/cascade.mjs`).
//
// Every function here is null-guarded: a missing lot/intent/item, or a
// missing nested field, must never throw — it should fail closed (excluded)
// or resolve to a documented default instead.

/**
 * Derive a lot's EUDR (EU Deforestation Regulation) readiness bucket from
 * its three underlying evidence booleans.
 *
 * - "ready": all three of plot_geo_present, harvest_window_present, and
 *   legality_evidence are true.
 * - "gap": none of the three are true, OR `lot.eudr` is missing entirely
 *   (comment: no evidence object present at all reads the same as "none of
 *   the evidence is present" — both are "gap", not some fourth bucket).
 * - "partial": anything in between (one or two of the three true).
 *
 * Null-guarded: a missing `lot`, missing `lot.eudr`, or missing/non-boolean
 * individual field is treated as absent/false, never thrown.
 */
export function deriveEudrStatus(lot) {
  const eudr = lot?.eudr;
  if (!eudr) return "gap";

  const plotGeoPresent = eudr.plot_geo_present === true;
  const harvestWindowPresent = eudr.harvest_window_present === true;
  const legalityEvidence = eudr.legality_evidence === true;

  const trueCount = [plotGeoPresent, harvestWindowPresent, legalityEvidence].filter(Boolean).length;
  if (trueCount === 3) return "ready";
  if (trueCount === 0) return "gap";
  return "partial";
}

/**
 * Does `lot` pass the lot sub-filters in `state.lot`? An empty Set (or a
 * missing/null value) for any given sub-filter means "not applied" — every
 * lot passes that dimension.
 *
 * `state.lot` shape: `{ commodities: Set<string>, eudrStatus: Set<string>,
 * minScaScore: number|null }`.
 */
export function matchesLot(lot, state) {
  if (!lot) return false;
  const lotFilter = state?.lot ?? {};

  // Real-lot rows straight off the raw hook (`useAqueductLots`) carry no
  // `commodity` field at all — only `useAqueductEconomy`'s `lots` memo
  // stamps `commodity: "coffee"` onto real rows on the way out
  // (useAqueductEconomy.ts:95). Predicates are also handed raw real-lot
  // rows directly in places (rail sections, sanity scripts), so the same
  // "missing commodity -> coffee" default is applied here, not only
  // upstream, to keep behavior consistent regardless of caller.
  const commodity = lot.commodity ?? "coffee";
  const commodities = lotFilter.commodities;
  if (commodities && commodities.size > 0 && !commodities.has(commodity)) return false;

  const eudrStatuses = lotFilter.eudrStatus;
  if (eudrStatuses && eudrStatuses.size > 0) {
    const status = deriveEudrStatus(lot);
    if (!eudrStatuses.has(status)) return false;
  }

  const minScaScore = lotFilter.minScaScore;
  if (minScaScore != null) {
    const score = lot.quality?.sca_score ?? null;
    // A null/missing SCA score fails a min-score filter ONLY when a min is
    // actually set (minScaScore != null). An unset min (null, the default)
    // never excludes anything on this dimension — so cacao/honey lots
    // (which carry no SCA score at all, by design: SCA is coffee-cupping
    // specific) aren't silently dropped by a filter that only makes sense
    // for coffee grading, unless the user has explicitly dialed in a
    // minimum score.
    if (score == null || score < minScaScore) return false;
  }

  return true;
}

/**
 * Does `intent` pass the route sub-filters in `state.route`? An empty Set
 * means "not applied".
 *
 * `state.route` shape: `{ intentTypes: Set<string>, statuses: Set<string> }`.
 */
export function matchesIntent(intent, state) {
  if (!intent) return false;
  const routeFilter = state?.route ?? {};

  const intentTypes = routeFilter.intentTypes;
  if (intentTypes && intentTypes.size > 0 && !intentTypes.has(intent.intentType)) return false;

  const statuses = routeFilter.statuses;
  if (statuses && statuses.size > 0) {
    // AqueductIntent.status is optional — a missing status is treated as
    // "open" (an intent nobody has touched yet is, by definition, open).
    const status = intent.status ?? "open";
    if (!statuses.has(status)) return false;
  }

  return true;
}

/**
 * Does `item` (an actor/institution, or a hub wrapped via `wrapHub`) pass
 * the institution sub-filters in `state.institution`? An empty Set means
 * "not applied".
 *
 * `state.institution` shape: `{ kinds: Set<string>, provenances: Set<string> }`.
 */
export function matchesInstitution(item, state) {
  if (!item) return false;
  const institutionFilter = state?.institution ?? {};

  const kinds = institutionFilter.kinds;
  if (kinds && kinds.size > 0 && !kinds.has(item.kind)) return false;

  const provenances = institutionFilter.provenances;
  if (provenances && provenances.size > 0 && !provenances.has(item.provenance)) return false;

  return true;
}

/**
 * Hubs from `useAqueductEconomy` (`economy.hubs`) come back as
 * `{ id, name, coords }` with no `kind` field — every other institution
 * (solver/venue/infrastructure/coop) has one. Synthesize `kind: "hub"` at
 * the selector layer so hubs can flow through `matchesInstitution` and the
 * institution kind filter like everything else, without economy.mjs itself
 * needing to know about the filter ontology.
 */
export function wrapHub(hub) {
  if (!hub) return hub;
  return { ...hub, kind: "hub" };
}
