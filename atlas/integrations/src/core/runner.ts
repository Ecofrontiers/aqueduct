/**
 * Sync runner - orchestrates connectors and database inserts
 */

import { createClient } from "@supabase/supabase-js";
import type { Connector, SyncStats } from "./types";
import { insertAction } from "./database";

export interface RunSyncOptions {
  connector: Connector;
  scope?: { chain?: string };
  dryRun?: boolean;
}

export async function runSync(options: RunSyncOptions): Promise<SyncStats> {
  const { connector, scope, dryRun = false } = options;

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  const stats: SyncStats = {
    successCount: 0,
    skipCount: 0,
    errorCount: 0,
  };

  console.log(`\n🔍 Fetching records from ${connector.id}...`);
  const rawRecords = await connector.fetch(scope);
  console.log(`📦 Got ${rawRecords.length} raw records\n`);

  for (const raw of rawRecords) {
    try {
      const actionData = connector.parse(raw);
      const inserted = await insertAction(supabase, actionData, dryRun);
      if (inserted) {
        stats.successCount++;
      } else {
        stats.skipCount++;
      }
    } catch (error) {
      console.error(`  ✗ Error processing record:`, error);
      stats.errorCount++;
    }
  }

  return stats;
}
