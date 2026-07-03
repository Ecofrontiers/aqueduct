// Aqueduct — commodity certifier registry connector. Same discipline as connectors/giin.mjs:
// a curated SNAPSHOT of real, individually-verified organizations, not a live poll (none of
// these publish a scrapeable public API either — verified 2026-07 via direct web search,
// not guessed from training-data recall).
//
// Two real, distinct axes, researched this session (docs/research/09's certifier thread):
//
//  TIC (Testing, Inspection, Certification) — verifies QUANTITY/QUALITY/CONDITION at
//  shipment, the physical-commodity analog to a card grader (PSA/CGC/BGS) verifying a
//  card's condition. SGS is the #1 largest TIC firm globally and explicitly names coffee/
//  cacao/sugar/tea as a soft-commodities service line; Bureau Veritas explicitly runs cocoa
//  inspection; Cotecna and Intertek are the other major, real firms in this space.
//
//  Sustainability certification — verifies a CLAIM about how a lot was produced (labor,
//  environment, price floor), not its physical condition. CBI (the EU's own trade-promotion
//  body) names Fairtrade, Rainforest Alliance, Organic, and 4C as "the largest certification
//  schemes" for coffee specifically — that's the real, cited ranking used here, not an
//  invented one.
//
// lot.certs is currently an empty array for every lot, real or SIM — EthicHub doesn't
// publish this field, and the seeded economy doesn't invent one. A policy rule citing this
// connector will therefore always flag "no certification on file" today. That's an honest
// finding, the same discipline as the EUDR gaps rendered PARTIAL rather than invented green —
// never populate lot.certs to make a rule pass.

const VERIFIED_AT = "2026-07-02";

/** @typedef {{id: string, name: string, kind: "TIC"|"sustainability", verifies: string, url: string, note: string, verifiedAt: string}} Certifier */

/** @type {Certifier[]} */
export const CERTIFIERS = [
  {
    id: "sgs",
    name: "SGS",
    kind: "TIC",
    verifies: "quantity, quality, condition at shipment",
    url: "https://www.sgs.com/en/service-groups/softs",
    note: "The largest Testing, Inspection & Certification firm globally; explicitly runs coffee/cacao/sugar/tea inspection services.",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "bureau-veritas",
    name: "Bureau Veritas",
    kind: "TIC",
    verifies: "quantity, quality, condition at shipment",
    url: "https://commodities.bureauveritas.com/agriculture-food/products/cocoa",
    note: "Top-5 global TIC firm; runs cocoa-specific inspection and sustainability-evaluation services.",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "cotecna",
    name: "Cotecna",
    kind: "TIC",
    verifies: "quantity, quality, condition at shipment",
    url: "https://www.cotecna.com/en",
    note: "Global testing, inspection, and certification firm serving food/agri trade.",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "intertek",
    name: "Intertek",
    kind: "TIC",
    verifies: "quantity, quality, condition at shipment",
    url: "https://www.intertek.com",
    note: "Global TIC firm; agriculture/commodities is one of its established service lines.",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "fairtrade",
    name: "Fairtrade International",
    kind: "sustainability",
    verifies: "price floor, labor standards, producer organization structure",
    url: "https://www.fairtrade.net",
    note: "CBI (EU trade body): one of the largest coffee certification schemes. Public certificate-holder registry: Fairtrade Finder.",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "rainforest-alliance",
    name: "Rainforest Alliance",
    kind: "sustainability",
    verifies: "environmental + social sustainable-agriculture standard",
    url: "https://www.rainforest-alliance.org",
    note: "CBI: one of the largest coffee certification schemes. Public certificate-holder database: List of Certificate Holders.",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "organic",
    name: "Organic (USDA/EU Organic)",
    kind: "sustainability",
    verifies: "production method — no prohibited synthetic inputs",
    url: "https://www.ams.usda.gov/services/organic-certification",
    note: "CBI: one of the largest coffee certification schemes. Real certification cost, per 2026 sourcing: $700-1,500 (USDA Organic).",
    verifiedAt: VERIFIED_AT,
  },
  {
    id: "4c",
    name: "4C (Global Coffee Platform baseline)",
    kind: "sustainability",
    verifies: "baseline sustainable-production code of conduct",
    url: "https://www.globalcoffeeplatform.org",
    note: "CBI: one of the largest coffee certification schemes — the entry-level baseline standard, not a premium tier.",
    verifiedAt: VERIFIED_AT,
  },
];

/** Resolve a certifier by id — throws on unknown id, same discipline as
 *  sim/failureModes.mjs's resolveFailureMode and connectors/giin.mjs's resolveIrisMetric. */
export function resolveCertifier(id) {
  const entry = CERTIFIERS.find((c) => c.id === id);
  if (!entry) {
    throw new Error(
      `connectors/certifiers.mjs: unknown certifier id "${id}" — verify against the real organization, do not invent one.`,
    );
  }
  // code mirrors id — kept for interface parity with resolveIrisMetric's { code, name }
  // shape, since generic consumers (capitalFormations.mjs, cascade.mjs) read `.code`
  // regardless of which standards source resolved the citation.
  return { ...entry, code: entry.id };
}

/** True if a lot's certs array references this certifier id. lot.certs is typed
 *  unknown[] in the schema (useAqueductLots.ts) since no real source populates it yet —
 *  this reads defensively rather than assuming a shape. */
export function lotHasCertifier(lot, certifierId) {
  const certs = Array.isArray(lot?.certs) ? lot.certs : [];
  return certs.some((c) => (typeof c === "string" ? c === certifierId : c?.id === certifierId));
}
