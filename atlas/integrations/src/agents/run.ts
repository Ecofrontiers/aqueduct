/**
 * Combined agent runner — creates HCS topics, runs Scout, then Diligence.
 * Writes agent-topics.json with topic IDs for UI consumption.
 */

import * as fs from "fs";
import * as path from "path";
import { RAEISPublisher } from "../connectors/hedera/publisher.js";
import { runScout } from "./scout.js";
import { runDiligence } from "./diligence.js";
import "dotenv/config";

const projectRoot = path.resolve(import.meta.dirname, "../../../");
const topicsPath = path.join(projectRoot, "public/data/agent-topics.json");
const dryRun = process.argv.includes("--dry-run");

interface AgentTopics {
  network: string;
  scoutTopicId: string;
  diligenceTopicId: string;
  createdAt: string;
}

async function main() {
  console.log("=== RAEIS Agent Network ===\n");

  // ─── Step 1: Create HCS topics (idempotent) ──────────────────────

  let topics: AgentTopics;

  if (fs.existsSync(topicsPath) && !dryRun) {
    topics = JSON.parse(fs.readFileSync(topicsPath, "utf-8"));
    console.log(`[SETUP] Agent topics already exist:`);
    console.log(`  Scout:     ${topics.scoutTopicId}`);
    console.log(`  Diligence: ${topics.diligenceTopicId}\n`);
  } else {
    console.log(`[SETUP] Creating agent HCS topics on testnet...\n`);

    const publisher = new RAEISPublisher({
      operatorId: process.env.HEDERA_OPERATOR_ID!,
      operatorKey: process.env.HEDERA_OPERATOR_KEY!,
      network: "testnet",
      dryRun,
    });

    try {
      const scoutTopicId = await publisher.createTopic(
        "RAEIS Agent: Impact Opportunity Scout — bioregion opportunity analysis"
      );
      const diligenceTopicId = await publisher.createTopic(
        "RAEIS Agent: Due Diligence — token verification and trust assessment"
      );

      topics = {
        network: "testnet",
        scoutTopicId,
        diligenceTopicId,
        createdAt: new Date().toISOString(),
      };

      fs.writeFileSync(topicsPath, JSON.stringify(topics, null, 2));
      console.log(`\n[SETUP] Topics created and saved to ${topicsPath}`);

      // Append agent transactions to hedera-transactions.json
      const txPath = path.join(projectRoot, "public/data/hedera-transactions.json");
      if (fs.existsSync(txPath)) {
        const txData = JSON.parse(fs.readFileSync(txPath, "utf-8"));
        const agentTx = publisher.getTransactions();
        // Tag agent transactions as layer 4
        for (const tx of agentTx) {
          (tx as any).layer = 4;
          txData.transactions.push(tx);
        }
        txData.agentTopics = topics;
        fs.writeFileSync(txPath, JSON.stringify(txData, null, 2));
        console.log(`[SETUP] Agent transactions appended to hedera-transactions.json`);
      }
    } finally {
      publisher.close();
    }
  }

  // ─── Step 2: Run Scout ────────────────────────────────────────────

  console.log("\n--- Impact Opportunity Scout ---");
  await runScout({
    scoutTopicId: topics.scoutTopicId,
    dryRun,
  });

  // ─── Step 3: Run Diligence ────────────────────────────────────────

  console.log("\n--- Due Diligence Agent ---");
  await runDiligence({
    scoutTopicId: topics.scoutTopicId,
    diligenceTopicId: topics.diligenceTopicId,
    dryRun,
  });

  // ─── Summary ──────────────────────────────────────────────────────

  console.log("\n=== Agent Network Complete ===");
  console.log(`Scout topic:     https://hashscan.io/testnet/topic/${topics.scoutTopicId}`);
  console.log(`Diligence topic: https://hashscan.io/testnet/topic/${topics.diligenceTopicId}`);
  console.log(`\nJSON outputs:`);
  console.log(`  public/data/agent-topics.json`);
  console.log(`  public/data/agent-scout-report.json`);
  console.log(`  public/data/agent-diligence-report.json\n`);
}

main().catch((err) => {
  console.error("Agent runner failed:", err);
  process.exit(1);
});
