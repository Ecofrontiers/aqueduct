// Aqueduct — venue/platform node registry for the swarm map layer
// (DEMO-SPEC.md §4 connectors, §5 "finance-this-planting/renovation").
// Every node here is either a REAL read (EthicHub, handled elsewhere in
// atlas/src/aqueduct/connectors/) or a researched-real platform explicitly
// labeled TO-BUILD/SIM — never a fictional platform name (spec §2 "Map
// composition").

/** Second intent type venues: agroforestry production-layer financing
 *  (DEMO-SPEC §4 "Silvi / AgroforestDAO — PRODUCTION-LAYER VENUES... intent
 *  fillable venues"). Read adapter is STRETCH/roadmap; this build renders
 *  them as SIM-fillable venue nodes, never live-labeled. */
export const AGROFORESTRY_VENUES = [
  {
    handle: "@sim-venue-silvi",
    name: "Silvi",
    kind: "agroforestry MRV + financing network",
    status: "TO-BUILD", // read adapter not wired this build (EAS-on-Celo, spec §4 STRETCH)
    note: "researched-real venue (EAS-on-Celo attestations); intent fill rendered SIM per spec §4/§5",
    // Node placed at a project-region city, approximate — map position is
    // illustrative, never a claimed office/plot location.
    coords: { longitude: -84.09, latitude: 9.93, precision: "project-region approximate" },
  },
];

/** Never-live-integrated platforms (spec §4) — rendered greyed/dotted on the
 *  map per DESIGN-BRIEF §3.1 TO-BUILD stroke convention, for map breadth
 *  honesty (aggregation ecosystem visible, nothing overclaimed). */
// Node coords are the platform's publicly-known HQ city, approximate —
// illustrative map positions for TO-BUILD ecosystem breadth, never a claimed
// integration or office pin.
export const TO_BUILD_PLATFORM_NODES = [
  {
    name: "Algrano",
    kind: "coffee marketplace",
    status: "TO-BUILD",
    note: "priority 2 connector — cleanest scrapeable coffee marketplace (research/05)",
    coords: { longitude: 8.54, latitude: 47.37, precision: "HQ city approximate" },
  },
  {
    name: "Agrotoken",
    kind: "onchain grain index tokens",
    status: "TO-BUILD",
    note: "priority 3 connector — not smallholder-granular",
    coords: { longitude: -58.38, latitude: -34.6, precision: "HQ city approximate" },
  },
  {
    name: "Beyco",
    kind: "coffee traceability platform",
    status: "TO-BUILD",
    note: "deprioritized (research/05)",
    coords: { longitude: 4.9, latitude: 52.37, precision: "HQ city approximate" },
  },
  {
    name: "DeHaat",
    kind: "agri-input + output platform",
    status: "TO-BUILD",
    note: "closed-by-design (research/05) — node only, never live-integrated",
    coords: { longitude: 85.14, latitude: 25.59, precision: "HQ city approximate" },
  },
  {
    name: "Farmer Connect",
    kind: "traceability platform",
    status: "TO-BUILD",
    note: "dormant (research/05) — node only, never live-integrated",
    coords: { longitude: 6.14, latitude: 46.2, precision: "HQ city approximate" },
  },
  {
    name: "WFP Building Blocks",
    kind: "humanitarian blockchain cash transfer",
    status: "TO-BUILD",
    note: "closed-by-design — node only",
    coords: { longitude: 12.45, latitude: 41.9, precision: "HQ city approximate" },
  },
];

/** The ERC-8004 reputation registrar — roadmap node, greyed, never a live actor (spec §3 item 7). */
export const REGISTRAR_NODE = {
  handle: "@registrar-8004",
  name: "ERC-8004 registrar",
  status: "TO-BUILD",
  note: "roadmap — reputation registry does not yet function as a trust signal at scale (arXiv:2606.26028, research/04 §4); never a live actor in this build",
};

/** The vault node the swarm view accumulates filled lots into (spec §5
 *  "Tokenization... one vault node in the swarm view accumulating filled
 *  lots — SIM-labeled. No new contracts."). Count persists across replays
 *  (DESIGN-BRIEF §3.2 "GitLab update-don't-replace, applied to a map node"). */
export const VAULT_NODE = {
  handle: "@sim-vault-aqueduct",
  name: "Aqueduct accumulator vault",
  status: "SIM",
  note: "no new contracts — SIM-labeled accumulation view over settled lots (spec §5 'to an extent')",
};

/** The cooperative/exporter node the settle arc credits (spec §5 settle realism:
 *  "never an instant spot payment to a farmer's phone"). Named generically —
 *  no specific real co-op claimed for the anchor lot beyond what EthicHub
 *  itself discloses (research/01 "co-op carries the credit stack"). */
export const COOP_EXPORTER_NODE = {
  handle: "@coop-exporter-soconusco",
  name: "cooperative / exporter node — Soconusco",
  status: "SIM",
  note: "settle credits this node, not the producer directly; farmer pass-through renders as a labeled downstream SIM step (spec §5 settle realism, non-negotiable)",
};
