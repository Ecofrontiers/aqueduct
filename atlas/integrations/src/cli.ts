#!/usr/bin/env npx tsx
/**
 * CLI for Hedera Guardian sync
 *
 * Usage: npx tsx src/cli.ts sync hedera [--dry-run]
 */

import "dotenv/config";
import { runLocalSync } from "./core/local-store";
import { createHederaConnector } from "./connectors/hedera/index";

function parseArgs(): {
  command: string;
  connectorId: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const command = args[0] || "sync";
  const connectorId = args[1] || "hedera";

  return { command, connectorId, dryRun };
}

async function main(): Promise<void> {
  const { command, connectorId, dryRun } = parseArgs();

  if (command !== "sync" || connectorId !== "hedera") {
    console.error("Usage: npx tsx src/cli.ts sync hedera [--dry-run]");
    process.exit(1);
  }

  const protocolId = process.env.HEDERA_GUARDIAN_PROTOCOL_ID || "hedera-guardian";

  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║       Hedera Guardian → Local JSON Sync                     ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  if (dryRun) {
    console.log("\n🔶 DRY RUN MODE - No files will be written\n");
  }

  try {
    const connector = createHederaConnector(protocolId);

    console.log(`\n🔍 Fetching records from ${connector.id}...`);
    const rawRecords = await connector.fetch();
    console.log(`📦 Got ${rawRecords.length} raw records\n`);

    const records = rawRecords.map((raw) => ({
      raw,
      parse: (r: any) => connector.parse(r),
    }));

    const stats = runLocalSync(records, dryRun);

    console.log("\n╔══════════════════════════════════════════════════════════════╗");
    console.log("║                       Sync Complete                          ║");
    console.log("╚══════════════════════════════════════════════════════════════╝");
    console.log(`  ✅ Synced: ${stats.successCount}`);
    console.log(`  ⏭️  Skipped: ${stats.skipCount}`);
    console.log(`  ❌ Errors: ${stats.errorCount}`);

    if (dryRun) {
      console.log("\n🔶 This was a dry run. Run without --dry-run to write files.");
    }
  } catch (error) {
    console.error("❌ Sync failed:", error);
    process.exit(1);
  }
}

main();
