import type { RegenProject, RegenBatch, RegenClassInfo } from "../types";

const REGEN_LCD_BASE = "https://rest-regen.ecostake.com";

async function fetchLCD<T>(path: string): Promise<T> {
  const url = `${REGEN_LCD_BASE}${path}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Regen LCD error: ${response.status} at ${path}`);
  }
  return response.json();
}

// Credit types: C (carbon), BT (biodiversity), MBS (marine biodiversity stewardship),
// USS (unknown/unspecified), KSH (Kenya shilling-denominated)

export async function fetchRegenClasses(): Promise<RegenClassInfo[]> {
  const data = await fetchLCD<{
    classes: RegenClassInfo[];
    pagination: { next_key: string | null; total: string };
  }>("/regen/ecocredit/v1/classes");
  return data.classes;
}

export async function fetchRegenProjects(): Promise<RegenProject[]> {
  const allProjects: RegenProject[] = [];
  let nextKey: string | null = null;
  let pages = 0;
  const maxPages = 20;

  do {
    const reqPath: string = nextKey
      ? `/regen/ecocredit/v1/projects?pagination.key=${encodeURIComponent(nextKey)}`
      : "/regen/ecocredit/v1/projects";

    const result: {
      projects: RegenProject[];
      pagination: { next_key: string | null; total: string };
    } = await fetchLCD(reqPath);

    allProjects.push(...result.projects);
    nextKey = result.pagination.next_key;
    pages++;
    if (pages >= maxPages) {
      console.warn(`[Regen] Project pagination safety limit at ${pages} pages, ${allProjects.length} projects`);
      break;
    }
  } while (nextKey);

  // Deduplicate by project ID
  const seen = new Set<string>();
  const unique = allProjects.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  if (unique.length < allProjects.length) {
    console.warn(`[Regen] Deduped ${allProjects.length - unique.length} duplicate projects`);
  }

  return unique;
}

export async function fetchRegenBatches(
  projectId?: string
): Promise<RegenBatch[]> {
  const allBatches: RegenBatch[] = [];
  let nextKey: string | null = null;

  // Use project-specific endpoint when projectId is provided
  const basePath = projectId
    ? `/regen/ecocredit/v1/batches-by-project/${projectId}`
    : "/regen/ecocredit/v1/batches";

  let pages = 0;
  const maxPages = 50; // safety limit against pagination loops
  do {
    const reqPath: string = nextKey
      ? `${basePath}?pagination.key=${encodeURIComponent(nextKey)}`
      : basePath;

    const result: {
      batches: RegenBatch[];
      pagination: { next_key: string | null; total: string };
    } = await fetchLCD(reqPath);

    allBatches.push(...result.batches);
    nextKey = result.pagination.next_key;
    pages++;
    if (pages >= maxPages) {
      console.warn(`[Regen] Pagination safety limit hit for ${basePath} after ${pages} pages, ${allBatches.length} batches`);
      break;
    }
  } while (nextKey);

  // Deduplicate batches by denom (pagination can produce duplicates)
  const seenDenoms = new Set<string>();
  const uniqueBatches: RegenBatch[] = [];
  for (const batch of allBatches) {
    if (batch.denom && !seenDenoms.has(batch.denom)) {
      seenDenoms.add(batch.denom);
      uniqueBatches.push(batch);
    }
  }
  if (uniqueBatches.length < allBatches.length) {
    console.warn(`[Regen] Deduped ${allBatches.length - uniqueBatches.length} duplicate batches for ${basePath}`);
  }

  // Fetch supply for each batch to get actual credit amounts
  const validBatches = uniqueBatches;

  // Process supply fetches sequentially to avoid overwhelming the LCD endpoint
  // (parallel Promise.all causes rate limiting / silent failures on ecostake)
  const batchesWithSupply: RegenBatch[] = [];
  for (const batch of validBatches) {
    try {
      const supply = await fetchBatchSupply(batch.denom);
      const tradable = parseFloat(supply.tradable_amount || "0");
      const retired = parseFloat(supply.retired_amount || "0");
      const total = tradable + retired;
      batchesWithSupply.push({
        ...batch,
        total_amount: String(total),
        _supply: { tradable, retired },
      });
    } catch {
      batchesWithSupply.push(batch);
    }
  }

  return batchesWithSupply;
}

export async function fetchBatchSupply(batchDenom: string) {
  return fetchLCD<{
    tradable_amount: string;
    retired_amount: string;
    cancelled_amount: string;
  }>(`/regen/ecocredit/v1/batches/${batchDenom}/supply`);
}

export async function fetchProjectMetadata(
  metadataUri: string
): Promise<Record<string, unknown>> {
  // Regen metadata URIs are content-addressed hashes (regen:13toV...)
  // They resolve via the Regen Registry server, not GitHub
  if (metadataUri.startsWith("regen:")) {
    const hash = metadataUri.replace("regen:", "");
    // Try the Regen Registry server
    const registryUrl = `https://app.regen.network/project/${hash}`;
    // The hash itself is the metadata identifier — store it for provenance
    return { "regen:contentHash": hash, "regen:registryUrl": registryUrl };
  }

  // Try HTTP/HTTPS URLs directly
  if (metadataUri.startsWith("http")) {
    try {
      const response = await fetch(metadataUri);
      if (response.ok) return response.json();
    } catch {
      // ignore fetch errors
    }
  }

  return { raw: metadataUri };
}

export function getRegenSourceMeta(
  path: string,
  params: Record<string, string> = {}
) {
  return {
    protocol: "regen-network" as const,
    endpoint: `${REGEN_LCD_BASE}${path}`,
    queryParams: params,
    fetchedAt: new Date().toISOString(),
  };
}
