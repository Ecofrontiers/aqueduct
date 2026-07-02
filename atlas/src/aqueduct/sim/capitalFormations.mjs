// Aqueduct — capital formations: runs the CAPITAL_ROSTER (buyers/grants/funds) against a
// lot population via the same evaluatePolicy() engine as the solver race and financing
// venue checks. "Matching of conditions" — a lot is eligible for an actor's capital when
// it triggers none of that actor's decline rules, exactly like a solver clearing its risk
// desk's bar. No separate matching algorithm, no invented allocation logic: eligibility is
// the real PolicyVerdict.eligible field, matched value is the lot's own real price × weight.
//
// Pure, deterministic — same lots + same roster always produce the same formations.

import { CAPITAL_ROSTER } from "./buyerRoster.mjs";
import { evaluatePolicy, explainStandards, explainVerdict } from "./policy.mjs";

/** @typedef {{
 *   handle: string, name: string, kind: string, capitalEur: number, note: string,
 *   matchedLotCount: number, matchedVolumeKg: number, matchedValueEur: number,
 *   matchRatePct: number, citedFailureModes: string[], citedStandardNames: string[],
 * }} ActorFormation */

function lotValueEur(lot) {
  const price = lot.price?.amount ?? null;
  const weightKg = lot.weight_kg ?? (lot.commodity ? null : 70); // real EthicHub lots default to the tour's 70kg reference
  if (price == null || weightKg == null) return 0;
  return price * weightKg;
}

/**
 * @param {object[]} lots - AqueductAnyLot[] (real + SIM, mixed)
 * @returns {{
 *   totalCapitalEur: number,
 *   actors: ActorFormation[],
 *   topGrants: ActorFormation[],
 *   topFlows: Array<{origin: string, actorHandle: string, actorName: string, matchedValueEur: number, matchedLotCount: number}>,
 *   byKind: Record<string, {count: number, capitalEur: number}>,
 * }}
 */
export function runCapitalFormationsMatch(lots) {
  const flowMap = new Map(); // `${origin}->${actorHandle}` -> aggregated flow
  const actors = [];

  for (const actor of CAPITAL_ROSTER) {
    let matchedLotCount = 0;
    let matchedVolumeKg = 0;
    let matchedValueEur = 0;
    const citedFailureModes = new Set();
    const citedStandardNames = new Set();

    for (const lot of lots) {
      const verdict = evaluatePolicy(lot, actor);
      // Surface citations regardless of match outcome — a decline still cites why.
      for (const fm of explainVerdict(verdict)) citedFailureModes.add(fm.name);
      for (const std of explainStandards(verdict)) citedStandardNames.add(`${std.code} ${std.name}`);
      if (!verdict.eligible) continue;

      matchedLotCount++;
      const weightKg = lot.weight_kg ?? 70;
      const value = lotValueEur(lot);
      matchedVolumeKg += weightKg;
      matchedValueEur += value;

      const origin = lot.origin?.region ?? lot.origin?.country ?? "unknown origin";
      const key = `${origin}->${actor.handle}`;
      const flow = flowMap.get(key) ?? {
        origin,
        actorHandle: actor.handle,
        actorName: actor.name,
        matchedValueEur: 0,
        matchedLotCount: 0,
      };
      flow.matchedValueEur += value;
      flow.matchedLotCount += 1;
      flowMap.set(key, flow);
    }

    actors.push({
      handle: actor.handle,
      name: actor.name,
      kind: actor.kind,
      capitalEur: actor.capitalEur,
      note: actor.note,
      matchedLotCount,
      matchedVolumeKg,
      matchedValueEur: Math.round(matchedValueEur),
      matchRatePct: lots.length > 0 ? Math.round((matchedLotCount / lots.length) * 1000) / 10 : 0,
      citedFailureModes: [...citedFailureModes],
      citedStandardNames: [...citedStandardNames],
    });
  }

  const totalCapitalEur = CAPITAL_ROSTER.reduce((sum, a) => sum + a.capitalEur, 0);
  const topGrants = actors.filter((a) => a.kind === "grant").sort((a, b) => b.capitalEur - a.capitalEur);
  const topFlows = [...flowMap.values()].sort((a, b) => b.matchedValueEur - a.matchedValueEur).slice(0, 40);

  const byKind = {};
  for (const actor of actors) {
    const bucket = byKind[actor.kind] ?? { count: 0, capitalEur: 0 };
    bucket.count += 1;
    bucket.capitalEur += actor.capitalEur;
    byKind[actor.kind] = bucket;
  }

  return { totalCapitalEur, actors, topGrants, topFlows, byKind };
}
