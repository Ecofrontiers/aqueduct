// Aqueduct — external standards registry. sim/policy.mjs stays generic (doesn't know
// about any specific connector); this file is the one place mapping a
// PolicyRule.citesStandards `source` string to the connector that can actually resolve it.
// Today: GIIN's IRIS+ (connectors/giin.mjs). Add new sources here, not inside policy.mjs.

import { resolveIrisMetric } from "../connectors/giin.mjs";

export const STANDARD_RESOLVERS = {
  "GIIN-IRIS+": resolveIrisMetric,
};

/** @param {{source: string, code: string}} citation */
export function resolveStandard(citation) {
  const resolver = STANDARD_RESOLVERS[citation.source];
  if (!resolver) {
    throw new Error(
      `sim/standardsRegistry.mjs: unknown standard source "${citation.source}" — register a resolver, do not invent one inline.`,
    );
  }
  return resolver(citation.code);
}
