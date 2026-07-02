#!/usr/bin/env npx tsx
/**
 * RAEIS Publisher CLI
 *
 * Publishes the Regen Atlas Environmental Intelligence Standard to Hedera:
 *   Layer 1: Methodology topic (the standard itself)
 *   Layer 2: Bioregional intelligence feeds (per-bioregion HCS topics)
 *   Layer 3: Verification NFTs (RAVA collection)
 *
 * Usage:
 *   npm run publish:hedera            — publish to testnet
 *   npm run publish:hedera:dry-run    — log all operations without submitting
 *
 * Env vars:
 *   HEDERA_OPERATOR_ID   — e.g. 0.0.12345
 *   HEDERA_OPERATOR_KEY  — ED25519 private key (hex or DER)
 *   HEDERA_NETWORK       — testnet (default) or mainnet
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { config as loadEnv } from "dotenv";

import { RAEISPublisher } from "./connectors/hedera/publisher.js";
import {
  buildMethodology,
  buildBioregionalIntelligence,
  buildVerifiedAction,
  buildNFTMetadata,
  COUNTRY_BIOREGION,
  BIOREGION_NAMES,
  type PublishResult,
} from "./connectors/hedera/schemas.js";

// Load .env from integrations/ or project root
loadEnv({ path: join(import.meta.dirname, "../.env") });
loadEnv({ path: join(import.meta.dirname, "../../.env") });

const ACTIONS_PATH = join(import.meta.dirname, "../../public/data/hedera-actions.json");
const PROVENANCE_PATH = join(import.meta.dirname, "../../public/data/hedera-provenance.json");
const OUTPUT_PATH = join(import.meta.dirname, "../../public/data/hedera-transactions.json");

function loadJSON(path: string): any[] {
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

/**
 * Infer country code from title patterns when country_code is null.
 * Catches cases like "(IN)", "(SG)", "(BR)" in Tolam token titles,
 * and DOVU farm names that should map to GB.
 */
function inferCountryFromTitle(title: string, actorName: string | null): string | null {
  // Check for (XX) country/state code at end of title
  const parenMatch = title.match(/\(([A-Z]{2})\)\s*$/);
  if (parenMatch) {
    const code = parenMatch[1];
    // Distinguish US state codes from country codes
    if (["AL","AZ","CA","FL","GA","IL","IN","KY","MO","NC","NV","OH","PA","TN","TX","VA"].includes(code)) {
      return "US";
    }
    // Known country codes
    if (COUNTRY_BIOREGION[code]) return code;
  }

  // DOVU farms → GB (Summerley, Red Hill, etc.)
  if (actorName === "DOVU") {
    if (/summerley|red\s*hill/i.test(title)) return "GB";
    if (/setka|omarchevo|briyastovo/i.test(title)) return "BG";
    if (/coquerel|distillerie/i.test(title)) return "FR";
    if (/ketrawe/i.test(title)) return "AR";
    if (/savimbo/i.test(title)) return "CO";
  }

  // GCR → Rwanda
  if (actorName === "GCR" || /rwanda/i.test(title)) return "RW";

  // TYMLEZ → Australia
  if (actorName === "TYMLEZ") return "AU";

  // OrbexCO2 → US
  if (actorName === "OrbexCO2") return "US";

  // Tolam country patterns from title
  if (/india|src india/i.test(title)) return "IN";
  if (/asia|singapore/i.test(title)) return "SG";
  if (/brazil|afforestation/i.test(title)) return "BR";
  if (/mexico|oaxaca/i.test(title)) return "MX";
  if (/colombia/i.test(title)) return "CO";

  return null;
}

/**
 * Group actions by bioregion code
 */
function groupByBioregion(
  actions: any[],
  provenances: any[]
): Map<string, { actions: any[]; provenances: any[] }> {
  const groups = new Map<string, { actions: any[]; provenances: any[] }>();

  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    const provenance = provenances[i]; // aligned by index from build-static

    // Determine bioregion: use country_code first, then infer from title
    let countryCode = action.country_code;
    if (!countryCode) {
      const actorName = action.actors?.[0]?.name || null;
      countryCode = inferCountryFromTitle(action.title, actorName);
    }

    const bioregionCode = countryCode
      ? COUNTRY_BIOREGION[countryCode] || "UNKNOWN"
      : "UNKNOWN";

    if (!groups.has(bioregionCode)) {
      groups.set(bioregionCode, { actions: [], provenances: [] });
    }
    const group = groups.get(bioregionCode)!;
    group.actions.push(action);
    group.provenances.push(provenance);
  }

  return groups;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const operatorId = process.env.HEDERA_OPERATOR_ID;
  const operatorKey = process.env.HEDERA_OPERATOR_KEY;
  const network = (process.env.HEDERA_NETWORK || "testnet") as "testnet" | "mainnet";

  if (!dryRun && (!operatorId || !operatorKey)) {
    console.error("Missing HEDERA_OPERATOR_ID or HEDERA_OPERATOR_KEY");
    console.error("Set these env vars or use --dry-run");
    process.exit(1);
  }

  console.log(`\n🏛️  RAEIS Publisher — Regen Atlas Environmental Intelligence Standard`);
  console.log(`   Network: ${network}${dryRun ? " (DRY RUN)" : ""}`);
  console.log(`   Operator: ${operatorId || "N/A (dry-run)"}\n`);

  // Load data
  const actions = loadJSON(ACTIONS_PATH);
  const provenances = loadJSON(PROVENANCE_PATH);
  console.log(`📦 Loaded ${actions.length} actions, ${provenances.length} provenances\n`);

  // Group by bioregion
  const bioregionGroups = groupByBioregion(actions, provenances);
  const bioregionCodes = Array.from(bioregionGroups.keys()).filter((c) => c !== "UNKNOWN");
  console.log(`🌍 Bioregions detected: ${bioregionCodes.join(", ")}`);
  const unknownGroup = bioregionGroups.get("UNKNOWN");
  if (unknownGroup) {
    console.log(`   (${unknownGroup.actions.length} actions without bioregion mapping)`);
  }
  console.log();

  // Initialize publisher
  const publisher = new RAEISPublisher({
    operatorId: operatorId || "0.0.0",
    operatorKey: operatorKey || "0".repeat(64),
    network,
    dryRun,
  });

  try {
    // ─── Layer 1: Methodology Topic ───────────────────────────────
    console.log("━━━ Layer 1: Methodology Topic ━━━");

    const methodologyTopicId = await publisher.createTopic(
      "RAEIS — Regen Atlas Environmental Intelligence Standard v1.0"
    );

    // ─── Layer 2: Bioregional Intelligence Feeds ──────────────────
    console.log("\n━━━ Layer 2: Bioregional Intelligence Feeds ━━━");

    const bioregionTopics: Record<string, string> = {};
    const bioregionFeeds: PublishResult["bioregionFeeds"] = [];

    for (const code of bioregionCodes) {
      const group = bioregionGroups.get(code)!;
      const name = BIOREGION_NAMES[code] || code;

      const topicId = await publisher.createTopic(
        `RAEIS Bioregion: ${name} (${code})`
      );
      bioregionTopics[code] = topicId;

      const feed = buildBioregionalIntelligence(
        code,
        group.actions,
        group.provenances,
        methodologyTopicId
      );

      const seq = await publisher.postMessage(topicId, feed, `Bioregion feed: ${code}`);

      bioregionFeeds.push({
        bioregionCode: code,
        bioregionName: name,
        topicId,
        messageSequence: seq,
        actionCount: group.actions.length,
        tCO2e: feed.aggregate.tCO2e,
      });
    }

    // Now post the methodology message (with bioregion topic IDs populated)
    const methodology = buildMethodology(bioregionTopics);
    const methodologySeq = await publisher.postMessage(
      methodologyTopicId,
      methodology,
      "Methodology: RAEIS v1.0"
    );

    // ─── Layer 3: Verification NFTs ───────────────────────────────
    console.log("\n━━━ Layer 3: Verification NFTs (RAVA) ━━━");

    const nftTokenId = await publisher.createNFTCollection(
      "RAEIS Verified Action",
      "RAVA",
      Math.max(actions.length + 50, 200) // headroom for future mints
    );

    let mintCount = 0;
    for (const code of bioregionCodes) {
      const group = bioregionGroups.get(code)!;
      const topicId = bioregionTopics[code];

      for (let i = 0; i < group.actions.length; i++) {
        const action = group.actions[i];
        const sourceToken = action.proofs?.[0]?.proof_explorer_link?.split("/").pop() || "";
        const metadata = buildNFTMetadata(action.id, code, sourceToken);

        await publisher.mintNFT(
          nftTokenId,
          metadata,
          `RAVA: ${action.title} (${code})`
        );
        mintCount++;
      }
    }

    // Also mint NFTs for UNKNOWN bioregion actions
    if (unknownGroup) {
      for (let i = 0; i < unknownGroup.actions.length; i++) {
        const action = unknownGroup.actions[i];
        const sourceToken = action.proofs?.[0]?.proof_explorer_link?.split("/").pop() || "";
        const metadata = buildNFTMetadata(action.id, "UNKNOWN", sourceToken);
        await publisher.mintNFT(
          nftTokenId,
          metadata,
          `RAVA: ${action.title} (no bioregion)`
        );
        mintCount++;
      }
    }

    // ─── Write Results ────────────────────────────────────────────
    const result: PublishResult = {
      network,
      operatorId: operatorId || "0.0.0 (dry-run)",
      publishedAt: new Date().toISOString(),
      methodology: {
        topicId: methodologyTopicId,
        messageSequence: methodologySeq,
      },
      bioregionFeeds,
      nftCollection: {
        tokenId: nftTokenId,
        totalMinted: mintCount,
      },
      transactions: publisher.getTransactions(),
    };

    writeFileSync(OUTPUT_PATH, JSON.stringify(result, null, 2));
    console.log(`\n✅ Wrote ${result.transactions.length} transactions to public/data/hedera-transactions.json`);

    // Summary
    console.log(`\n📊 RAEIS Publish Summary:`);
    console.log(`   Methodology topic: ${methodologyTopicId}`);
    console.log(`   Bioregion feeds:   ${bioregionFeeds.length}`);
    console.log(`   NFTs minted:       ${mintCount}`);
    console.log(`   Total transactions: ${result.transactions.length}`);
    console.log(`   Network:           ${network}${dryRun ? " (DRY RUN)" : ""}`);

    if (!dryRun) {
      console.log(`\n🔗 View on HashScan:`);
      console.log(`   Methodology: ${publisher["hashscanUrl"]("topic", methodologyTopicId)}`);
      console.log(`   NFT Collection: ${publisher["hashscanUrl"]("token", nftTokenId)}`);
    }
  } finally {
    publisher.close();
  }
}

main().catch((err) => {
  console.error("Publish failed:", err);
  process.exit(1);
});
