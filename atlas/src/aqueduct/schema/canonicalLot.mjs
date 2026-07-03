// Aqueduct — canonical lot schema helpers.
//
// LICENSING: the schema (field vocabulary/structure) and the content-addressed
// lot-identifier specification defined here are dedicated to the public domain
// under CC0 1.0 — see /LICENSE-SCHEMA at the repo root. The CODE in this file
// remains MIT (/LICENSE). The namespace is the algorithm, not us.
//
// Isomorphic (runs in the Node connector script AND the Vite/browser bundle):
// only uses `globalThis.crypto.subtle` + `TextEncoder`, both present in
// Node >=19 and every modern browser. No Node-only APIs here.
//
// Schema shape follows docs/research/07-coop-lot-identity.md §"Canonical lot
// schema implications" and DEMO-SPEC.md §5 "Canonical lot schema (binding for
// the build)". The absence of a universal lot ID across platforms is the
// documented reality of the coffee trade (research/07 §5) — aqueduct_id is
// OUR namespace, deterministic and recomputable by anyone, not a claim that
// a universal registry already exists.

/**
 * Deterministically stringify an object: object keys sorted recursively.
 * Arrays keep their order (order is meaningful there).
 */
export function stableStringify(value) {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const body = keys.map((k) => `${JSON.stringify(k)}:${stableStringify(value[k])}`).join(",");
  return `{${body}}`;
}

/**
 * The identity-defining subset of a lot — everything that describes WHAT the
 * physical lot is, excluding volatile fields (price, fetched_at, ledger
 * bookkeeping) so the same physical lot re-fetched later still hashes the
 * same. This is "the namespace is the algorithm, not us" (DEMO-SPEC §5 B2):
 * anyone can recompute this hash from the published EthicHub page and verify
 * our ID without trusting our database.
 */
export function identityFields(lot) {
  return {
    platform: lot.source?.platform ?? null,
    platform_lot_id: lot.source?.platform_lot_id ?? null,
    producer_initials: lot.producer?.initials ?? null,
    origin_country: lot.origin?.country ?? null,
    origin_region: lot.origin?.region ?? null,
    origin_community: lot.origin?.community ?? null,
    process: lot.process ?? null,
    variety: lot.variety ?? null,
    sca_score: lot.quality?.sca_score ?? null,
    harvest_window: lot.harvest_window?.season ?? null,
  };
}

async function sha256Hex(str) {
  const bytes = new TextEncoder().encode(str);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Content-addressed lot ID: sha256 of the canonicalized identity fields,
 * rendered as `aq:<first 12 hex chars>`. Full hash is returned alongside for
 * the "Show raw" / copy-full-hash affordance (design brief §6.2).
 */
export async function computeLotId(lot) {
  const canonical = stableStringify(identityFields(lot));
  const full = await sha256Hex(canonical);
  return { id: `aq:${full.slice(0, 12)}`, full, canonical };
}

/** Producer full name -> initials, per-producer (splits on " & " / " and "). */
export function initialsFromName(fullName) {
  if (!fullName) return "—";
  const producers = fullName.split(/\s*&\s*|\s+and\s+/i).filter(Boolean);
  const one = (name) =>
    name
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .map((w) => w[0].toUpperCase())
      .join(".") + ".";
  return producers.map(one).join(" & ");
}

/**
 * Redact any mention of a producer's full name (or its individual name
 * tokens) out of free text, replacing with the initials. Applied to
 * producer-story prose before it is ever persisted to a file the frontend
 * reads — the raw name should not survive into `public/data/aqueduct/*.json`
 * at all (hard rule: producer initialed, never the full name, in our UI).
 */
export function redactName(text, fullName, initials, extraNames = []) {
  if (!text) return text;
  let out = text;
  const tokens = fullName
    .split(/\s*&\s*|\s+and\s+|\s+/i)
    .map((t) => t.trim())
    .filter((t) => t.length > 2);
  // Replace the full name first (longest match), then individual tokens.
  const escaped = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Accent-insensitive matching: slug-derived tokens arrive unaccented
  // ("ortiz"-style) while the prose may carry diacritics on the same
  // surname. Each ASCII letter in a token also matches its accented
  // variants so neither form survives redaction. (Gate 1 verification
  // caught an accented surname escaping the plain \b-token regex.)
  const ACCENTS = {
    a: "[aáàâäã]",
    e: "[eéèêë]",
    i: "[iíìîï]",
    o: "[oóòôöõ]",
    u: "[uúùûü]",
    n: "[nñ]",
    c: "[cç]",
  };
  const fold = (s) =>
    s
      .split("")
      .map((ch) => ACCENTS[ch.toLowerCase()] ?? escaped(ch))
      .join("");
  out = out.replace(new RegExp(fold(fullName), "gi"), initials);
  for (const t of tokens.sort((a, b) => b.length - a.length)) {
    out = out.replace(new RegExp(`\\b${fold(t)}\\b`, "gi"), initials);
  }
  // Other private persons named in source prose (family members, neighbors)
  // are not derivable from the producer slug — connectors pass them per lot.
  // Each is reduced to a bare initial.
  for (const name of extraNames.filter((n) => n && n.length > 2)) {
    out = out.replace(new RegExp(`\\b${fold(name)}\\b`, "gi"), `${name[0].toUpperCase()}.`);
  }
  // Collapse consecutive duplicate redactions ("N.O.P. N.O.P.," -> "N.O.P.,")
  // that happen when prose uses a partial name (e.g. a first-plus-middle
  // mention without the surname) so more than one name-token regex fires
  // on the same mention.
  const initialsEsc = escaped(initials);
  out = out.replace(new RegExp(`(${initialsEsc})(\\s+${initialsEsc})+`, "g"), "$1");
  return out;
}

/** join_confidence levels, per research/07 §5 + DESIGN-BRIEF §5.2. Never a number. */
export const JOIN_CONFIDENCE = {
  DETERMINISTIC: "deterministic",
  NAME_PLACE_MATCH: "name_place_match",
  UNMATCHED: "unmatched",
};
