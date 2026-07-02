// Aqueduct — shared PolicyRule.condition() functions, evaluated against
// AqueductLotSnapshot fields already in the schema (useAqueductLots.ts:5-39). Kept
// separate from institutionPolicies.mjs so solver-side and venue-side policies
// (docs/research/09 Phase 1 vs Phase 3) can share the same lot-reading logic instead of
// each institution re-deriving it.

/** Fraction of the 4 concrete EUDR fields NOT yet verified on this lot (0 = fully
 *  confirmed, 1 = none verified) — the same 4 fields sim/cascade.mjs's B3 beat renders
 *  PARTIAL/OK against, so a policy verdict and the diligence chip never disagree. */
export function eudrUnverifiedFraction(lot) {
  const checked = [
    lot.eudr?.plot_geo_present,
    lot.eudr?.harvest_window_present,
    lot.eudr?.legality_evidence,
    Boolean(lot.eudr?.dds_ref),
  ];
  const verifiedCount = checked.filter(Boolean).length;
  return (4 - verifiedCount) / 4;
}

/** True once every EUDR field is confirmed — the signal adverse-selection-averse rules
 *  require before treating the lot's legality claim as trustworthy. */
export function isEudrFullyConfirmed(lot) {
  return eudrUnverifiedFraction(lot) === 0;
}

// ── Condition factories for buyer/grant/fund matching (sim/buyerRoster.mjs) ──
// Same polarity as the risk-desk rules above: a factory's condition triggers (severity
// > 0) when the lot FAILS the requirement, so it composes with policy.mjs's existing
// "triggered decline rule => ineligible" semantics without any special-casing for
// "matching" vs "risk-gating" — a buyer's minimum-quality bar and a solver's EUDR bar
// are the same kind of rule, evaluated the same way.

/** Fails (severity 1) when sca_score is below `min`, or absent. Non-coffee lots (no
 *  sca_score) never pass a quality-floor rule — a real quality-graded buyer wouldn't
 *  accept an ungraded lot either. */
export function qualityBelow(min) {
  return (lot) => ((lot.quality?.sca_score ?? Number.NEGATIVE_INFINITY) < min ? 1 : 0);
}

/** Fails when the lot's commodity isn't in the allowed set. */
export function commodityNotIn(allowed) {
  const set = new Set(allowed);
  return (lot) => (lot.commodity && !set.has(lot.commodity) ? 1 : 0);
}

/** Fails when the lot's declared weight is below a minimum — grants/funds sized for
 *  aggregated volume, not micro-lots. Real EthicHub lots (no weight_kg field) pass by
 *  default rather than fail on a field that surface doesn't carry. */
export function weightBelowKg(minKg) {
  return (lot) => (lot.weight_kg != null && lot.weight_kg < minKg ? 1 : 0);
}
