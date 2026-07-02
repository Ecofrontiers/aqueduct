/**
 * Hedera Guardian connector
 *
 * Syncs environmental tokens from 6 Hedera platforms (DOVU, Tolam Earth,
 * Capturiant, OrbexCO2, GCR, TYMLEZ) into the Regen Atlas actions schema.
 */

import type { Connector, ParsedActionData, RawRecord } from "../../core/types";
import { fetchHederaTokens } from "./fetcher";
import { parseHederaToken } from "./parser";

export function createHederaConnector(protocolId: string): Connector {
  return {
    id: "hedera",
    protocolId,

    async fetch(scope?: { chain?: string }): Promise<RawRecord[]> {
      return fetchHederaTokens(scope);
    },

    parse(raw: RawRecord): ParsedActionData {
      return parseHederaToken(raw);
    },
  };
}
