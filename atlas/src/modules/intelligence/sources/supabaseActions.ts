/**
 * Supabase Actions intelligence source
 *
 * Fetches published actions from Supabase (Atlantis, Silvi, etc.)
 * and composes VerifiableProvenance objects from them.
 */

import type { VerifiableProvenance, SourceProtocol } from "../types";
import type { Action } from "../../../shared/types";
import supabase from "../../../shared/helpers/supabase";
import { valuateCarbon } from "../valuation";

/** Map action protocol names to SourceProtocol slugs */
const PROTOCOL_SLUG_MAP: Record<string, SourceProtocol> = {
  atlantis: "atlantis",
  "atlantis protocol": "atlantis",
  silvi: "silvi",
  "silvi protocol": "silvi",
};

function resolveProtocolSlug(name: string): SourceProtocol | null {
  return PROTOCOL_SLUG_MAP[name.toLowerCase()] ?? null;
}

/** Shared Supabase fetch — cached across calls in a single ingest cycle */
let cachedActions: Action[] | null = null;

async function fetchAllActions(): Promise<Action[]> {
  if (cachedActions) return cachedActions;

  const { data, error } = await supabase
    .from("actions_published_view")
    .select();

  if (error) {
    console.warn("[Supabase Actions] Fetch failed:", error.message);
    return [];
  }

  cachedActions = (data ?? []) as Action[];
  return cachedActions;
}

/** Reset cache between ingest cycles */
export function clearSupabaseActionsCache() {
  cachedActions = null;
}

/**
 * Fetch actions for a specific protocol from Supabase
 */
export async function fetchActionsByProtocol(
  targetProtocol: SourceProtocol
): Promise<VerifiableProvenance[]> {
  const actions = await fetchAllActions();
  if (actions.length === 0) return [];

  const provenances: VerifiableProvenance[] = [];

  for (const action of actions) {
    // Determine protocol from proofs
    const proofProtocols = action.proofs
      ?.map((p) => resolveProtocolSlug(p.protocol?.name ?? ""))
      .filter((p): p is SourceProtocol => p !== null) ?? [];

    const protocol = proofProtocols[0] ?? null;
    if (protocol !== targetProtocol) continue;

    const tCO2e = 0;

    const lat = action.location?.latitude ?? 0;
    const lng = action.location?.longitude ?? 0;
    const jurisdiction = action.country_code ?? action.region ?? "Unknown";

    const documentCIDs = action.proofs
      ?.filter((p) => p.proof_link)
      .map((p) => p.proof_link) ?? [];

    const certNames = action.certifications
      ?.map((c) => c.certifier?.short_name ?? c.certifier?.name)
      .filter(Boolean) ?? [];

    const valuation = valuateCarbon(tCO2e);

    const prov: VerifiableProvenance = {
      attestor: "Regen Atlas",
      attestedAt: new Date().toISOString(),
      schemaVersion: "1.0",
      source: {
        protocol,
        endpoint: "supabase:actions_published_view",
        queryParams: { id: action.id },
        fetchedAt: new Date().toISOString(),
      },
      asset: {
        type: "Environmental Action",
        subtype: certNames[0] ?? "Verified Action",
        name: action.title,
        chain: "offchain",
        mechanismType: "retired",
        assetActionClass: "action",
      },
      impact: {
        metrics: {
          ...(tCO2e > 0
            ? {
                climate: {
                  tCO2e,
                  methodology: certNames[0] ?? "Protocol-verified",
                  vintage: action.action_start_date
                    ? new Date(action.action_start_date).getFullYear().toString()
                    : "Unknown",
                  standard: certNames[0] ?? protocol,
                },
              }
            : {}),
        },
        creditingPathway: "action",
      },
      valuation,
      origin: {
        project: action.id,
        developer: action.actors?.[0]?.name ?? protocol,
        location: { lat, lng, jurisdiction },
        startDate: action.action_start_date ?? undefined,
        endDate: action.action_end_date ?? undefined,
      },
      mrv: {
        status: action.proofs?.length > 0 ? "verified" : "pending",
        provider: protocol,
        documentCIDs,
      },
    };

    provenances.push(prov);
  }

  console.log(`[Supabase Actions] ${targetProtocol}: ${provenances.length} provenances`);
  return provenances;
}
