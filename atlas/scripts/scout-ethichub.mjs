#!/usr/bin/env node
// Aqueduct — EthicHub scout run. Fetches the anchor + fallback Chiapas lots
// LIVE, joins them against the lending API + a Celo onchain read, computes
// content-addressed lot IDs, and writes a timestamped snapshot (spec §4
// "snapshot-with-timestamp architecture").
//
// Usage: node scripts/scout-ethichub.mjs
// Writes: public/data/aqueduct/lots.json, public/data/aqueduct/ledger.json

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildAnchorAndFallbacks } from "../src/aqueduct/connectors/buildAnchorLots.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "data", "aqueduct");

function logLine(entry) {
  const t = entry.ts.slice(11, 19) + "Z";
  const prov = (entry.provenance || "LIVE").padEnd(4);
  const agent = (entry.agent || "").padEnd(24);
  console.log(`${t} · ${prov} · ${agent} · ${entry.verb} — ${entry.detail} · ${entry.status}`);
}

async function main() {
  console.log("Aqueduct scout — EthicHub connector run\n");
  const result = await buildAnchorAndFallbacks();

  for (const entry of result.ledger) logLine(entry);
  if (result.anchorFallbackSwitch) {
    console.log(`\n⚠ ${result.anchorFallbackSwitch.note}`);
  }

  await mkdir(OUT_DIR, { recursive: true });

  const lotsPayload = {
    generated_at: result.meta.generated_at,
    anchor_id: result.anchor?.aqueduct_id ?? null,
    lots: [result.anchor, ...result.fallbacks].filter(Boolean),
    meta: result.meta,
  };
  const ledgerPayload = {
    generated_at: result.meta.generated_at,
    anchor_fallback_switch: result.anchorFallbackSwitch,
    entries: result.ledger,
  };

  await writeFile(path.join(OUT_DIR, "lots.json"), JSON.stringify(lotsPayload, null, 2));
  await writeFile(path.join(OUT_DIR, "ledger.json"), JSON.stringify(ledgerPayload, null, 2));

  console.log(`\nWrote ${lotsPayload.lots.length} lots -> public/data/aqueduct/lots.json`);
  console.log(`Wrote ${result.ledger.length} ledger entries -> public/data/aqueduct/ledger.json`);
  if (result.anchor) {
    console.log(`\nAnchor: ${result.anchor.aqueduct_id} — ${result.anchor.producer.initials} / ${result.anchor.origin.region} — ${result.anchor.price?.amount}${result.anchor.price ? " " + result.anchor.price.currency : ""}/${result.anchor.price?.unit}`);
  } else {
    console.error("\nNo anchor lot produced — check the ledger for FAILED entries above.");
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("Scout run failed:", err);
  process.exitCode = 1;
});
