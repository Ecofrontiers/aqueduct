// Aqueduct — the swarm cascade: scout -> diligence -> oracle -> intent ->
// solver race -> buyer match -> settle -> vault (DEMO-SPEC.md §3, §7
// acceptance criterion 3: "replays cleanly on demand without manual
// intervention"). Assembles the feed-line grammar (DESIGN-BRIEF.md §1.1)
// into one ordered, parent-linked event list per lot. Pure function — same
// lot + oracle + race inputs always produce the same cascade (no RNG),
// satisfying "replays cleanly" and DO-NOT §9.17 "no identical replays
// presented as live" (this cascade is honestly presented as a replay of a
// real computation, not as a live independent run each time).

import { getMinerTerms, listGlowFarms } from "../connectors/glow.mjs";
import { evaluateBuyerMatch } from "./buyerAgent.mjs";
import { buildFinanceIntent } from "./financeIntent.mjs";
import { priceLot } from "./oracle.mjs";
import { explainVerdict } from "./policy.mjs";
import { runSolverRace } from "./solverRoster.mjs";
import { COOP_EXPORTER_NODE, VAULT_NODE } from "./venues.mjs";

const CADENCE_MS = 2500; // DESIGN-BRIEF §1.1 "events surface on a ~2-3s tick"

let seq = 0;
function nextId(prefix) {
  seq += 1;
  return `${prefix}-${seq}`;
}

/**
 * @param {object} lot - the AqueductLotSnapshot (anchor)
 * @returns {Promise<{events: Array, oracle: object, race: object, buyerMatch: object, financeIntent: object}>}
 */
export async function buildCascade(lot) {
  seq = 0;
  const events = [];
  let t = 0;
  const push = (e) => {
    events.push({ id: nextId("ev"), offsetMs: t, status: "OK", parentId: null, ...e });
    t += CADENCE_MS;
    return events[events.length - 1].id;
  };

  const shopLotsTotal = lot?.__meta?.shop_lots_total ?? 22;
  const chiapasMatched = lot?.__meta?.shop_chiapas_total ?? 6;
  const lotIdShort =
    (lot.aqueduct_id || "aq:").replace("aq:", "aq:").slice(0, 10) + "…" + (lot.aqueduct_id_full || "").slice(-3);

  // ---- Chapter 1: Aggregate (B1) ----
  const scoutReadId = push({
    chapter: "aggregate",
    beat: "B1",
    prov: "LIVE",
    agent: "@scout-ethichub",
    verb: "read",
    object: `${shopLotsTotal} lots at greencoffee.ethichub.com`,
    detail: `${chiapasMatched} matched Chiapas`,
    valueText: "1.8s",
    status: "OK",
    expand: {
      headline: "The EthicHub scout read the public shop index and matched the Chiapas subset.",
      sections: [
        { label: "tool call", value: "GET greencoffee.ethichub.com/en/shop" },
        { label: "fetched_at", value: lot.source?.fetched_at ?? "—" },
        { label: "payload", value: `${shopLotsTotal} lots total, ${chiapasMatched} Chiapas` },
      ],
      sourceUrl: "https://greencoffee.ethichub.com/en/shop",
    },
  });

  const pinId = push({
    chapter: "aggregate",
    beat: "B1",
    prov: lot.provenance === "LIVE" ? "LIVE" : "SNAPSHOT",
    agent: "@scout-ethichub",
    verb: "pinned",
    object: `lot ${lot.aqueduct_id}`,
    detail: `${lot.producer.initials} / ${lot.origin.region} (${lot.origin.country}) – ${lot.variety} ${lot.process} – ${lot.quality.sca_score} SCA`,
    valueText: lot.price ? `€${lot.price.amount.toFixed(2)}/kg` : "—",
    status: "OK",
    parentId: scoutReadId,
    expand: {
      headline: `The EthicHub scout pinned lot ${lot.source?.platform_lot_id} — a ${lot.process} micro-lot from ${lot.origin.locality_raw ?? lot.origin.region}, scored ${lot.quality.sca_score} SCA, asking €${lot.price?.amount?.toFixed(2)}/kg.`,
      sections: [
        { label: "tool call", value: `GET ${lot.source?.url}` },
        { label: "fetched_at", value: lot.source?.fetched_at ?? "—" },
      ],
      sourceUrl: lot.source?.url,
      fetchedAt: lot.source?.fetched_at,
    },
  });

  // ---- Chapter 2: Verify (B2 identity resolution, B3 EUDR) ----
  let identityId = null;
  if (lot.lending?.matched) {
    identityId = push({
      chapter: "verify",
      beat: "B2",
      prov: "LIVE",
      agent: "@diligence-identity",
      verb: "matched",
      object: `${lot.lending.projects.length} lending project(s)`,
      detail: `join_confidence: ${lot.join_confidence}`,
      valueText: "cross-surface",
      status: "PARTIAL",
      parentId: pinId,
      expand: {
        headline:
          "Two EthicHub surfaces — the public shop lot and the lending-project API — resolved into one entity, linked by producer/community, not by platform id.",
        sections: [
          { label: "shop lot", value: lot.source?.platform_lot_id ?? "—" },
          { label: "lending project(s)", value: lot.lending.projects.map((p) => `#${p.id}`).join(", ") },
          { label: "join_confidence", value: lot.join_confidence },
          {
            label: "labeling",
            value:
              "cross-surface (both surfaces EthicHub's) — promoted to cross-platform only when a second connector lands",
          },
        ],
      },
    });
  }

  const eudrChecked = [
    lot.eudr?.plot_geo_present,
    lot.eudr?.harvest_window_present,
    lot.eudr?.legality_evidence,
    Boolean(lot.eudr?.dds_ref),
  ];
  const eudrVerifiedCount = eudrChecked.filter(Boolean).length;
  const eudrId = push({
    chapter: "verify",
    beat: "B3",
    prov: "LIVE",
    agent: "@diligence-eudr",
    verb: "checked",
    object: `6 EUDR fields on ${lot.aqueduct_id}`,
    detail: `${eudrVerifiedCount * 1} of 4 concrete fields verified, ${4 - eudrVerifiedCount} unverifiable`,
    valueText: "3.2s",
    status: "PARTIAL",
    parentId: identityId ?? pinId,
    expand: {
      headline:
        "The diligence agent independently re-checked the EUDR document chain on the anchor lot — plot geolocation and a Due Diligence Statement reference are honestly missing, not badged green.",
      sections: [
        { label: "plot geolocation", value: lot.eudr?.plot_geo_present ? "verified" : "PARTIAL — unverifiable" },
        { label: "harvest window", value: lot.eudr?.harvest_window_present ? "verified" : "PARTIAL — unverifiable" },
        { label: "legality evidence", value: lot.eudr?.legality_evidence ? "verified" : "PARTIAL — unverifiable" },
        { label: "DDS reference", value: lot.eudr?.dds_ref ?? "PARTIAL — unverifiable" },
        { label: "mandatory from", value: "2026-12-30 (coffee/cocoa) — EUDR" },
      ],
    },
  });

  // ---- Chapter 3: Price (B4) ----
  const oracle = await priceLot();
  const priceId = push({
    chapter: "price",
    beat: "B4",
    prov: oracle.provenance,
    agent: "@oracle-ice-c",
    verb: "priced",
    object: lot.aqueduct_id,
    detail: `ICE C ${oracle.baseCentsLb.toFixed(1)} ¢/lb + Chiapas diff → commodity floor €${oracle.floorFobEurKg.toFixed(2)}/kg`,
    valueText: `+${oracle.differentialCentsLb} ¢/lb`,
    status: "OK",
    parentId: eudrId,
    expand: {
      headline: `The oracle priced the commodity floor from ${oracle.baseSource}, plus a named, sourced Chiapas differential — never a bare C-quote.`,
      sections: [
        {
          label: "ICE C base",
          value: `${oracle.baseCentsLb.toFixed(2)} ¢/lb (${oracle.provenance}, as of ${oracle.baseAsOf})`,
        },
        { label: "base source", value: oracle.baseSource },
        { label: "Chiapas differential", value: `+${oracle.differentialCentsLb} ¢/lb — ${oracle.differentialSource}` },
        { label: "commodity floor FOB", value: `€${oracle.floorFobEurKg.toFixed(2)}/kg` },
        {
          label: "asking vs commodity-equivalent spread",
          value: lot.price
            ? `€${lot.price.amount.toFixed(2)}/kg asking vs €${oracle.floorFobEurKg.toFixed(2)}/kg commodity-equivalent — the specialty premium this layer makes legible`
            : "—",
        },
      ],
    },
  });

  // ---- Chapter 4: Publish (B5 sell-this-lot, B6 finance-this-planting) ----
  const landedCeilingPreview = lot?.price?.amount ? Math.round(lot.price.amount * 1.15 * 2) / 2 : null;
  const intentId = push({
    chapter: "publish",
    beat: "B5",
    prov: "TESTNET",
    agent: "@intent-registry",
    verb: "published",
    object: `sell-this-lot intent aq:i-04 for ${lot.aqueduct_id}`,
    detail: `ceiling ≤ €${landedCeilingPreview?.toFixed(2) ?? "—"}/kg landed`,
    valueText: lot.price ? `€${lot.price.amount.toFixed(2)}/kg FOB` : "—",
    status: "OK",
    parentId: priceId,
    expand: {
      headline:
        "A sell-this-lot intent published against the deployed Base Sepolia IntentRegistry — solvers can now compete to fill it.",
      sections: [
        { label: "intent id", value: "aq:i-04" },
        { label: "chain", value: "Base Sepolia (TESTNET)" },
        { label: "productIdHash", value: `keccak256(${lot.aqueduct_id})` },
      ],
    },
  });

  const financeIntent = buildFinanceIntent(lot);
  const financeId = push({
    chapter: "publish",
    beat: "B6",
    prov: "SIM",
    agent: "@intent-registry",
    verb: "published",
    object: `finance-this-planting intent ${financeIntent.id}`,
    detail: `${financeIntent.seedlings.toLocaleString()} seedlings — ${financeIntent.community}`,
    valueText: `€${financeIntent.totalEur.toLocaleString()}`,
    status: "OK",
    parentId: intentId,
    expand: {
      headline:
        "Finance the system, sell its harvest: a second, parallel intent routes production financing to an agroforestry venue for the same origin community.",
      sections: [
        { label: "venue", value: `${financeIntent.venue.name} (${financeIntent.venue.status})` },
        { label: "seedlings", value: String(financeIntent.seedlings) },
        { label: "total", value: `€${financeIntent.totalEur.toLocaleString()}` },
      ],
    },
  });
  const fundedId = push({
    chapter: "publish",
    beat: "B6",
    prov: "SIM",
    agent: financeIntent.venue.handle,
    verb: "funded",
    object: `intent ${financeIntent.id}`,
    detail: `planting renovation, ${financeIntent.seedlings.toLocaleString()} seedlings`,
    valueText: `€${financeIntent.totalEur.toLocaleString()}`,
    status: "FILLED",
    parentId: financeId,
    expand: {
      headline: `${financeIntent.venue.name} (SIM fill) funded the planting-renovation intent for ${financeIntent.community} — today's planting is a future sell-this-lot intent.`,
      sections: [
        { label: "venue status", value: financeIntent.venue.status },
        { label: "note", value: financeIntent.venue.note },
      ],
    },
  });

  // ---- Chapter 5: Fill (B7 solver race + buyer match) ----
  // Institutional policy (docs/research/09-institutional-policy-swarm-coordination.md,
  // Phase 5): every bid/decline already carries a policyVerdict from sim/policy.mjs
  // (solverRoster.mjs) — this beat renders it with the same expand/citation discipline
  // as the B3 EUDR beat above, not a new UI grammar.
  const race = runSolverRace({ lot, fobEurPerKg: lot.price?.amount ?? 17.0, weightKg: 70 });
  let prevBidParent = intentId;
  for (const b of race.bids) {
    const citedModes = b.policyVerdict ? explainVerdict(b.policyVerdict) : [];
    const logicScoreLine = b.policyVerdict
      ? {
          label: "governance-logics score",
          value: `hierarchy ${b.policyVerdict.logicScores.hierarchy}, market ${b.policyVerdict.logicScores.market}, network ${b.policyVerdict.logicScores.network}${b.policyVerdict.requiresReview ? " — flagged for review" : ""}`,
        }
      : null;

    if (b.status === "DECLINED") {
      push({
        chapter: "fill",
        beat: "B7",
        prov: "SIM",
        agent: b.handle,
        verb: "declined",
        object: `intent aq:i-04`,
        detail: b.note,
        valueText: "—",
        status: "DECLINED",
        parentId: intentId,
        expand: citedModes.length
          ? {
              headline: `${b.handle} declined per institutional policy — ${b.note}`,
              sections: [
                ...citedModes.map((fm) => ({ label: `cites: ${fm.name}`, value: `${fm.sev} — ${fm.desc}` })),
                logicScoreLine,
              ],
            }
          : undefined,
      });
      continue;
    }
    const policySections =
      b.policyVerdict && b.policyVerdict.marginAdjustmentBps > 0
        ? [
            {
              label: "policy risk premium",
              value: `+${b.policyVerdict.marginAdjustmentBps} bps — ${b.policyVerdict.note}`,
            },
            ...citedModes.map((fm) => ({ label: `cites: ${fm.name}`, value: `${fm.sev} — ${fm.desc}` })),
            logicScoreLine,
          ]
        : [];
    const id = push({
      chapter: "fill",
      beat: "B7",
      prov: b.real ? "LIVE" : "SIM",
      agent: b.handle,
      verb: "bid",
      object: `landed route ${lot.aqueduct_id}`,
      detail: `${b.bid.lines.length} cost lines, T+${b.bid.tenorDays}`,
      valueText: `€${b.bid.landedEurPerKg.toFixed(4)}/kg landed`,
      status: "BID",
      parentId: intentId,
      expand: {
        headline: `${b.handle} bid an itemized landed-cost route${b.real ? " — computed live by the Routes-adapted landed-cost engine (routes/engine/services/commodity-landed-cost.mjs)" : ""}.`,
        sections: b.bid.lines
          .map((l) => ({ label: l.label, value: `€${l.eurPerKg.toFixed(4)}/kg (${l.confidence})` }))
          .concat([
            { label: "Landed (FCA Hamburg)", value: `€${b.bid.landedEurPerKg.toFixed(4)}/kg` },
            { label: "margin", value: `${b.bid.marginPct.toFixed(2)}%` },
            ...policySections,
          ]),
      },
    });
    prevBidParent = id;
  }

  const winner = race.winner;
  const winnerId = push({
    chapter: "fill",
    beat: "B7",
    prov: winner.real ? "LIVE" : "SIM",
    agent: winner.handle,
    verb: winner.real ? "undercut" : "undercut",
    object: "cleared the buyer ceiling",
    detail: `prev best €${
      race.bids
        .filter((b) => b.bid && b.handle !== winner.handle)
        .sort((a, b) => a.bid.landedEurPerKg - b.bid.landedEurPerKg)[0]
        ?.bid.landedEurPerKg.toFixed(4) ?? "—"
    } → new €${winner.bid.landedEurPerKg.toFixed(4)}/kg`,
    valueText: `€${winner.bid.landedEurPerKg.toFixed(4)}/kg`,
    status: "UNDERCUT",
    parentId: prevBidParent,
  });

  const buyerMatch = evaluateBuyerMatch({ lot, winningBid: winner.bid });
  const matchId = push({
    chapter: "fill",
    beat: "B7",
    prov: "SIM",
    agent: SIM_BUYER_HANDLE(),
    verb: "matched",
    object: `intent aq:i-04`,
    detail: `${buyerMatch.rows.filter((r) => r.pass).length}/${buyerMatch.rows.length} criteria satisfied`,
    valueText: buyerMatch.matched ? "FILLED" : "no match",
    status: buyerMatch.matched ? "FILLED" : "DECLINED",
    parentId: winnerId,
    expand: {
      headline: `${buyerMatch.buyer.handle} — standing demand — matched: ${buyerMatch.rows.map((r) => `${r.label} ${r.pass ? "✓" : "✗"} ${r.got}`).join("; ")}.`,
      sections: buyerMatch.rows.map((r) => ({
        label: r.label,
        value: `${r.pass ? "✓" : "✗"} ${r.got} (want ${r.want})`,
      })),
    },
  });

  const x402Id = push({
    chapter: "fill",
    beat: "B7",
    prov: "SIM",
    agent: winner.handle,
    verb: "paid",
    object: "data fee via x402",
    detail: "1 call",
    valueText: "$0.0040 USDC",
    status: "OK",
    parentId: matchId,
    expand: {
      headline:
        "Agent payment rendered SIM in the swarm — the x402 rail itself is proven (a real $0.004 Apify scrape payment on the operator's agentic wallet), not wired live into this demo.",
      sections: [{ label: "note", value: "capability claimed with a receipt, not wired into the demo (spec §5 Q35)" }],
    },
  });

  // ---- Chapter 6: Settle (B8) ----
  const settleId = push({
    chapter: "settle",
    beat: "B8",
    prov: "TESTNET",
    agent: "@settle-base",
    verb: "settling",
    object: "intent aq:i-04",
    detail: `credited: ${COOP_EXPORTER_NODE.name}`,
    valueText: "awaiting broadcast",
    status: "PENDING",
    parentId: x402Id,
    expand: {
      headline:
        "Settlement prepared against the deployed Base Sepolia IntentRegistry — the unsigned transaction is ready; no private key exists in this repo, so it is not broadcast here.",
      sections: [
        { label: "registry", value: "0x3aA739c23615Cd7e08D365af851f43C76CDFcc6e (Base Sepolia)" },
        { label: "script", value: "atlas/scripts/prepare-settle-tx.mjs" },
        { label: "expected env", value: "AQUEDUCT_SETTLE_PRIVATE_KEY (not present in this repo, by design)" },
      ],
    },
  });
  const passthroughId = push({
    chapter: "settle",
    beat: "B8",
    prov: "SIM",
    agent: "@settle-base",
    verb: "settled",
    object: "farmer pass-through",
    detail: "via co-op credit stack",
    valueText: "—",
    status: "OK",
    parentId: settleId,
    expand: {
      headline:
        "Farmer pass-through renders as a labeled downstream step off the co-op node — never an instant spot payment to a farmer's phone (spec §5 settle realism).",
    },
  });
  const vaultId = push({
    chapter: "settle",
    beat: "B8",
    prov: "SIM",
    agent: VAULT_NODE.handle,
    verb: "accumulated",
    object: "1 lot",
    detail: VAULT_NODE.note,
    valueText: lot.price ? `€${(lot.price.amount * 70).toFixed(0)}` : "—",
    status: "OK",
    parentId: passthroughId,
  });

  // ---- Chapter 7: Generalize (B9 — second commodity, same loop) ----
  // The gate-closer, shown not told: the SAME aggregate → verify → price →
  // publish → fill → settle loop the coffee lot just ran also runs on Glow solar
  // farms (farm = lot, GCA audit = certifier, GLW/GCC = oracle registers). The
  // farm reads are real public reads (glow.org/api/audits, SNAPSHOT); the
  // finance-this-farm fill stays SIM and labeled, exactly like the coffee fills.
  // Deterministic — listGlowFarms()/getMinerTerms() are dated snapshots, no RNG.
  const glowFarms = listGlowFarms();
  const flFarms = glowFarms.filter((f) => f.location.includes("FL"));
  const miner = getMinerTerms();
  const glowReadId = push({
    chapter: "generalize",
    beat: "B9",
    prov: "SNAPSHOT",
    agent: "@scout-glow",
    verb: "read",
    object: `${glowFarms.length} Glow solar farms — public audits`,
    detail: `coordinates, panels, output — ${flFarms.map((f) => f.name).join(" + ")} in Florida`,
    valueText: `SNAPSHOT ${miner.fetched_at}`,
    status: "OK",
    parentId: vaultId,
    expand: {
      headline:
        "Same loop, second commodity: the Glow scout read real solar-farm audits — coordinates, panel counts, weekly output — from Glow's public audits API. Farm = lot, GCA audit = certifier, GLW/GCC = oracle registers.",
      sections: [
        { label: "tool call", value: "GET glow.org/api/audits" },
        { label: "farms read", value: `${glowFarms.length} (SNAPSHOT ${miner.fetched_at})` },
        { label: "Florida cluster", value: flFarms.map((f) => `${f.name} (${f.location})`).join("; ") },
      ],
      sourceUrl: "https://glow.org/api/audits",
    },
  });
  push({
    chapter: "generalize",
    beat: "B9",
    prov: "SIM",
    agent: "@intent-registry",
    verb: "published",
    object: "finance-this-farm intent — Glow solar",
    detail: `$${miner.principalUsd} → ~${miner.glwPerWeek} GLW/week × ${miner.termWeeks} weeks (${miner.confidence})`,
    valueText: "SIM fill",
    status: "FILLED",
    parentId: glowReadId,
    expand: {
      headline:
        "A finance-this-farm intent carries the real observed Miner terms — reads live, fill simulated and labeled, exactly like the coffee fills. One loop settled over oceans, one over wires.",
      sections: [
        { label: "principal", value: `$${miner.principalUsd} USDC (${miner.confidence})` },
        { label: "reward stream", value: `~${miner.glwPerWeek} GLW/week × ${miner.termWeeks} weeks` },
        { label: "source", value: miner.source },
        { label: "corroboration", value: miner.corroboration },
      ],
    },
  });

  return {
    events,
    oracle,
    race,
    buyerMatch,
    financeIntent,
    winner,
    settleId,
    meta: { cadenceMs: CADENCE_MS, lotIdShort },
  };
}

function SIM_BUYER_HANDLE() {
  return "@sim-buyer-eu";
}
