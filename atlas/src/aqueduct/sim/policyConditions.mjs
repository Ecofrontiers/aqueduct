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
