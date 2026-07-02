/**
 * Impact Opportunity Scout — reads RAEIS bioregion feeds from HCS,
 * scores bioregions on 4 axes, and posts an OpportunityReport to HCS.
 */

import * as fs from "fs";
import * as path from "path";
import { readTopicMessages, decodeMessage } from "./mirror-reader.js";
import type { OpportunityReport, OpportunityScore } from "./agent-schemas.js";
import type { BioregionalIntelligence, SourceActionRef } from "../connectors/hedera/schemas.js";
import { CERTIFIER_REGISTRY } from "../connectors/hedera/schemas.js";
import { RAEISPublisher } from "../connectors/hedera/publisher.js";
import "dotenv/config";

const AGENT_ID = "raeis-scout-v1";
const AGENT_VERSION = "1.0.0";

// ─── Scoring weights ────────────────────────────────────────────────

const W_GAP = 0.35;
const W_CERT = 0.25;
const W_VOLUME = 0.25;
const W_COMPLETENESS = 0.15;

// ─── Scoring functions ──────────────────────────────────────────────

function scoreGap(feed: BioregionalIntelligence): number {
  // Unpriced = 100, otherwise inverse of ratio
  if (feed.gapAnalysis.serviceToMarketRatio === "unpriced") return 100;
  const market = feed.gapAnalysis.marketValue;
  if (market <= 0) return 100;
  const service = feed.aggregate.tCO2e * 51; // low SCC
  return Math.min(100, Math.round((service / market) * 100));
}

function scoreCertification(feed: BioregionalIntelligence): number {
  // Weighted average of certifier weights found in the feed
  const certs = feed.aggregate.certifications;
  if (certs.length === 0) return 10; // bare minimum for uncertified

  let totalWeight = 0;
  let count = 0;
  for (const certName of certs) {
    // Map display names to registry keys
    const key = certName.toLowerCase().includes("verra")
      ? "verra-vcs"
      : certName.toLowerCase().includes("gold standard")
        ? "gold-standard"
        : certName.toLowerCase().includes("ecoregistry")
          ? "ecoregistry"
          : certName.toLowerCase().includes("dovu")
            ? "dovu-dmrv"
            : certName.toLowerCase().includes("capturiant")
              ? "capturiant-std"
              : "bare-hts";
    const entry = CERTIFIER_REGISTRY[key];
    if (entry) {
      totalWeight += entry.weight;
      count++;
    }
  }
  if (count === 0) return 10;
  return Math.round((totalWeight / count) * 100);
}

function scoreVolume(tCO2e: number, maxTCO2e: number): number {
  if (maxTCO2e <= 0) return 0;
  return Math.round((tCO2e / maxTCO2e) * 100);
}

function scoreCompleteness(feed: BioregionalIntelligence): number {
  return Math.round(feed.qualityScore.dataCompleteness * 100);
}

// ─── Main ───────────────────────────────────────────────────────────

interface ScoutOptions {
  scoutTopicId?: string;
  dryRun?: boolean;
}

export async function runScout(options: ScoutOptions = {}): Promise<OpportunityReport> {
  const projectRoot = path.resolve(import.meta.dirname, "../../../");
  const txPath = path.join(projectRoot, "public/data/hedera-transactions.json");
  const txData = JSON.parse(fs.readFileSync(txPath, "utf-8"));

  const bioregionFeeds: Array<{
    bioregionCode: string;
    bioregionName: string;
    topicId: string;
    actionCount: number;
    tCO2e: number;
  }> = txData.bioregionFeeds;

  console.log(`\n[SCOUT] Reading ${bioregionFeeds.length} bioregion feeds from testnet Mirror Node...\n`);

  // Read all bioregion feed messages
  const feedData: Array<{ feed: BioregionalIntelligence; topicId: string }> = [];

  for (const bf of bioregionFeeds) {
    try {
      console.log(`  Reading ${bf.bioregionCode} (${bf.topicId})...`);
      const messages = await readTopicMessages(bf.topicId, "testnet");
      if (messages.length > 0) {
        // Use the latest message
        const latest = messages[messages.length - 1];
        const feed = decodeMessage<BioregionalIntelligence>(latest.message);
        feedData.push({ feed, topicId: bf.topicId });
        console.log(`    -> ${feed.aggregate.actions} actions, ${feed.aggregate.tCO2e} tCO2e`);
      } else {
        console.log(`    -> No messages found`);
      }
    } catch (err) {
      console.log(`    -> Error reading ${bf.bioregionCode}: ${(err as Error).message}`);
    }
  }

  // Calculate max tCO2e for volume normalization
  const maxTCO2e = Math.max(...feedData.map((d) => d.feed.aggregate.tCO2e), 1);
  const totalActions = feedData.reduce((s, d) => s + d.feed.aggregate.actions, 0);
  const totalTCO2e = feedData.reduce((s, d) => s + d.feed.aggregate.tCO2e, 0);

  // Score each bioregion
  const opportunities: OpportunityScore[] = feedData.map(({ feed, topicId }) => {
    const gap = scoreGap(feed);
    const cert = scoreCertification(feed);
    const volume = scoreVolume(feed.aggregate.tCO2e, maxTCO2e);
    const completeness = scoreCompleteness(feed);

    const composite = Math.round(
      gap * W_GAP + cert * W_CERT + volume * W_VOLUME + completeness * W_COMPLETENESS
    );

    // Extract top actions (up to 3)
    const topActions = feed.sourceActions
      .sort((a: SourceActionRef, b: SourceActionRef) => b.tCO2e - a.tCO2e)
      .slice(0, 3)
      .map((a: SourceActionRef) => ({
        actionId: a.actionId,
        title: a.title,
        sourceToken: a.sourceToken,
        tCO2e: a.tCO2e,
        certifier: a.certifier,
      }));

    const rationale = [
      `Gap: ${gap}/100 (${feed.gapAnalysis.serviceToMarketRatio})`,
      `Cert: ${cert}/100 (${feed.aggregate.certifications.join(", ") || "none"})`,
      `Volume: ${volume}/100 (${feed.aggregate.tCO2e} tCO2e)`,
      `Completeness: ${completeness}/100`,
    ].join(". ");

    return {
      bioregionCode: feed.bioregion.code,
      bioregionName: feed.bioregion.name,
      compositeScore: composite,
      breakdown: { gap, certification: cert, volume, completeness },
      topActions,
      rationale,
    };
  });

  // Sort by composite score descending
  opportunities.sort((a, b) => b.compositeScore - a.compositeScore);

  const report: OpportunityReport = {
    schema: "RAEIS/OpportunityReport/v1",
    agentId: AGENT_ID,
    agentVersion: AGENT_VERSION,
    timestamp: new Date().toISOString(),
    scanSummary: {
      bioregionsScanned: feedData.length,
      totalActions,
      totalTCO2e: Math.round(totalTCO2e * 100) / 100,
    },
    opportunities,
    methodologyTopicId: txData.methodology.topicId,
    sourceTopicIds: feedData.map((d) => d.topicId),
  };

  // Post to HCS if topic provided
  if (options.scoutTopicId) {
    const publisher = new RAEISPublisher({
      operatorId: process.env.HEDERA_OPERATOR_ID!,
      operatorKey: process.env.HEDERA_OPERATOR_KEY!,
      network: "testnet",
      dryRun: options.dryRun,
    });

    try {
      const seq = await publisher.postMessage(
        options.scoutTopicId,
        report,
        "Agent: Impact Opportunity Scout report"
      );
      console.log(`\n[SCOUT] Report posted to ${options.scoutTopicId} (seq #${seq})`);
    } finally {
      publisher.close();
    }
  }

  // Write JSON for UI
  const outPath = path.join(projectRoot, "public/data/agent-scout-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[SCOUT] Report written to ${outPath}`);

  return report;
}

// Direct invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  const topicsPath = path.resolve(import.meta.dirname, "../../../public/data/agent-topics.json");
  let scoutTopicId: string | undefined;
  if (fs.existsSync(topicsPath)) {
    const topics = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));
    scoutTopicId = topics.scoutTopicId;
  }
  runScout({ scoutTopicId, dryRun: process.argv.includes("--dry-run") }).catch(console.error);
}
