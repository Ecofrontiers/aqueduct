/**
 * Due Diligence Agent — reads Scout's OpportunityReport from HCS,
 * verifies underlying tokens on mainnet, and posts a DueDiligenceReport.
 */

import * as fs from "fs";
import * as path from "path";
import { readTopicMessages, decodeMessage, readTokenDetails } from "./mirror-reader.js";
import type { OpportunityReport, OpportunityScore } from "./agent-schemas.js";
import type { DueDiligenceReport, TokenAssessment, Verdict } from "./agent-schemas.js";
import { TREASURY_PLATFORM_MAP } from "../connectors/hedera/types.js";
import { RAEISPublisher } from "../connectors/hedera/publisher.js";
import "dotenv/config";

const AGENT_ID = "raeis-diligence-v1";
const AGENT_VERSION = "1.0.0";

// Platform → trust tier mapping (derived from CERTIFIER_REGISTRY)
const PLATFORM_TRUST_TIER: Record<string, "guardian+registry" | "guardian+self" | "bare-hts"> = {
  "Tolam Earth": "guardian+registry",
  GCR: "guardian+registry",
  DOVU: "guardian+self",
  Capturiant: "guardian+self",
  OrbexCO2: "bare-hts",
  TYMLEZ: "bare-hts",
};

// ─── Guardian topic extraction ──────────────────────────────────────

function extractGuardianTopic(memo: string): string | null {
  if (!memo) return null;
  // DOVU format: DOVU:SYMBOL:0.0.12345
  const dovuMatch = memo.match(/DOVU:\w+:(\d[\d.]+)/);
  if (dovuMatch) return dovuMatch[1];
  // Direct topic format: 0.0.12345
  if (/^\d+\.\d+\.\d+$/.test(memo.trim())) return memo.trim();
  return null;
}

// ─── Main ───────────────────────────────────────────────────────────

interface DiligenceOptions {
  scoutTopicId?: string;
  diligenceTopicId?: string;
  dryRun?: boolean;
}

export async function runDiligence(options: DiligenceOptions = {}): Promise<DueDiligenceReport> {
  const projectRoot = path.resolve(import.meta.dirname, "../../../");
  let scoutReport: OpportunityReport;
  let sourceSequence = 1;

  // Try reading Scout's report from HCS first, fall back to local JSON
  if (options.scoutTopicId) {
    console.log(`\n[DILIGENCE] Reading Scout report from HCS topic ${options.scoutTopicId}...`);
    try {
      const messages = await readTopicMessages(options.scoutTopicId, "testnet");
      if (messages.length > 0) {
        const latest = messages[messages.length - 1];
        scoutReport = decodeMessage<OpportunityReport>(latest.message);
        sourceSequence = latest.sequence_number;
        console.log(`  -> Found report with ${scoutReport.opportunities.length} opportunities`);
      } else {
        throw new Error("No messages in Scout topic");
      }
    } catch {
      console.log("  -> Falling back to local JSON...");
      const localPath = path.join(projectRoot, "public/data/agent-scout-report.json");
      scoutReport = JSON.parse(fs.readFileSync(localPath, "utf-8"));
    }
  } else {
    const localPath = path.join(projectRoot, "public/data/agent-scout-report.json");
    scoutReport = JSON.parse(fs.readFileSync(localPath, "utf-8"));
  }

  console.log(`\n[DILIGENCE] Verifying tokens for ${scoutReport.opportunities.length} bioregions...\n`);

  // Build reverse treasury map
  const treasuryToPlat = Object.entries(TREASURY_PLATFORM_MAP).reduce(
    (acc, [tid, plat]) => {
      acc[tid] = plat;
      return acc;
    },
    {} as Record<string, string>
  );

  // Collect unique source tokens from top opportunities
  const tokensToVerify: Array<{
    sourceToken: string;
    bioregionCode: string;
    actionTitle: string;
  }> = [];

  for (const opp of scoutReport.opportunities) {
    for (const action of opp.topActions) {
      // Only verify tokens that look like Hedera IDs
      if (/^\d+\.\d+\.\d+$/.test(action.sourceToken)) {
        tokensToVerify.push({
          sourceToken: action.sourceToken,
          bioregionCode: opp.bioregionCode,
          actionTitle: action.title,
        });
      }
    }
  }

  // Deduplicate by source token
  const seen = new Set<string>();
  const unique = tokensToVerify.filter((t) => {
    if (seen.has(t.sourceToken)) return false;
    seen.add(t.sourceToken);
    return true;
  });

  console.log(`  ${unique.length} unique tokens to verify on mainnet\n`);

  // Verify each token
  const assessments: TokenAssessment[] = [];

  for (const { sourceToken, bioregionCode, actionTitle } of unique) {
    console.log(`  Verifying ${sourceToken} (${actionTitle.slice(0, 40)})...`);

    try {
      const token = await readTokenDetails(sourceToken, "mainnet");
      const supply = Number(token.total_supply);
      const hasMemo = Boolean(token.memo && token.memo.trim().length > 0);
      const guardianTopicId = extractGuardianTopic(token.memo);
      const platform = treasuryToPlat[token.treasury_account_id];
      const trustTier = platform
        ? (PLATFORM_TRUST_TIER[platform] || "bare-hts")
        : "unknown";

      // Determine verdict
      let verdict: Verdict = "PASS";
      let rationale: string;

      if (supply === 0) {
        verdict = "CAUTION";
        rationale = `Token exists but has zero supply. Treasury: ${token.treasury_account_id}${platform ? ` (${platform})` : ""}.`;
      } else if (!hasMemo && !guardianTopicId) {
        verdict = "CAUTION";
        rationale = `Token has supply (${supply}) but no memo or Guardian topic ID. Trust tier: ${trustTier}.`;
      } else {
        rationale = `Token verified: supply ${supply}, ${platform || "unknown platform"}. ` +
          `Guardian topic: ${guardianTopicId || "none"}. Trust tier: ${trustTier}.`;
      }

      assessments.push({
        sourceToken,
        bioregionCode,
        actionTitle,
        verification: {
          tokenExists: true,
          totalSupply: supply,
          hasMemo,
          guardianTopicId,
          treasuryAccount: token.treasury_account_id,
        },
        trustTier: trustTier as TokenAssessment["trustTier"],
        verdict,
        rationale,
      });

      console.log(`    -> ${verdict}: ${rationale.slice(0, 80)}`);
    } catch (err) {
      const msg = (err as Error).message;
      const is404 = msg.includes("404");

      assessments.push({
        sourceToken,
        bioregionCode,
        actionTitle,
        verification: {
          tokenExists: !is404,
          totalSupply: 0,
          hasMemo: false,
          guardianTopicId: null,
          treasuryAccount: null,
        },
        trustTier: "unknown",
        verdict: "FAIL",
        rationale: is404
          ? `Token ${sourceToken} not found on mainnet Mirror Node.`
          : `Error verifying token: ${msg}`,
      });

      console.log(`    -> FAIL: ${msg}`);
    }
  }

  const report: DueDiligenceReport = {
    schema: "RAEIS/DueDiligence/v1",
    agentId: AGENT_ID,
    agentVersion: AGENT_VERSION,
    timestamp: new Date().toISOString(),
    sourceReport: {
      topicId: options.scoutTopicId || "local",
      sequenceNumber: sourceSequence,
    },
    assessments,
  };

  // Post to HCS if topic provided
  if (options.diligenceTopicId) {
    const publisher = new RAEISPublisher({
      operatorId: process.env.HEDERA_OPERATOR_ID!,
      operatorKey: process.env.HEDERA_OPERATOR_KEY!,
      network: "testnet",
      dryRun: options.dryRun,
    });

    try {
      const seq = await publisher.postMessage(
        options.diligenceTopicId,
        report,
        "Agent: Due Diligence verification report"
      );
      console.log(`\n[DILIGENCE] Report posted to ${options.diligenceTopicId} (seq #${seq})`);
    } finally {
      publisher.close();
    }
  }

  // Write JSON for UI
  const outPath = path.join(projectRoot, "public/data/agent-diligence-report.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[DILIGENCE] Report written to ${outPath}`);

  return report;
}

// Direct invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  const topicsPath = path.resolve(import.meta.dirname, "../../../public/data/agent-topics.json");
  let opts: DiligenceOptions = { dryRun: process.argv.includes("--dry-run") };
  if (fs.existsSync(topicsPath)) {
    const topics = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));
    opts.scoutTopicId = topics.scoutTopicId;
    opts.diligenceTopicId = topics.diligenceTopicId;
  }
  runDiligence(opts).catch(console.error);
}
