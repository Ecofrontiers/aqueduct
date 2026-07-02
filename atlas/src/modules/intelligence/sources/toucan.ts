import type { ToucanTCO2Token, ToucanProject } from "../types";

// Toucan migrated to The Graph decentralized network (hosted service sunset)
// Requires a free API key from thegraph.com/studio (100K queries/month free)
const GRAPH_API_KEY = import.meta.env.VITE_GRAPH_API_KEY ?? "";
const TOUCAN_POLYGON_SUBGRAPH_ID =
  "FU5APMSSCqcRy9jy56aXJiGV3PQmFQHg2tzukvSJBgwW";
const TOUCAN_SUBGRAPH_URL = GRAPH_API_KEY
  ? `https://gateway-arbitrum.network.thegraph.com/api/${GRAPH_API_KEY}/subgraphs/id/${TOUCAN_POLYGON_SUBGRAPH_ID}`
  : "";

interface SubgraphResponse<T> {
  data: T;
}

async function querySubgraph<T>(query: string): Promise<T> {
  if (!TOUCAN_SUBGRAPH_URL) {
    throw new Error(
      "Toucan requires VITE_GRAPH_API_KEY (free at thegraph.com/studio)"
    );
  }
  const response = await fetch(TOUCAN_SUBGRAPH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!response.ok) {
    throw new Error(`Toucan subgraph error: ${response.status}`);
  }
  const json: SubgraphResponse<T> = await response.json();
  return json.data;
}

export async function fetchTCO2Tokens(
  first = 100,
  skip = 0
): Promise<ToucanTCO2Token[]> {
  const query = `{
    tco2Tokens(first: ${first}, skip: ${skip}, orderBy: score, orderDirection: desc) {
      id
      name
      symbol
      address
      score
      projectVintage {
        id
        startTime
        endTime
        totalVintageQuantity
        project {
          id
          projectId
          region
          standard
          methodology
          category
          emissionType
          uri
        }
      }
    }
  }`;
  const data = await querySubgraph<{ tco2Tokens: ToucanTCO2Token[] }>(query);
  return data.tco2Tokens;
}

export async function fetchToucanProjects(
  first = 100
): Promise<ToucanProject[]> {
  const query = `{
    projects(first: ${first}) {
      id
      projectId
      region
      standard
      methodology
      category
      emissionType
      uri
    }
  }`;
  const data = await querySubgraph<{ projects: ToucanProject[] }>(query);
  return data.projects;
}

export async function fetchRetirements(first = 100) {
  const query = `{
    retirements(first: ${first}, orderBy: timestamp, orderDirection: desc) {
      id
      amount
      timestamp
      token {
        name
        symbol
        projectVintage {
          project {
            projectId
            region
            standard
            methodology
          }
        }
      }
      certificate {
        id
      }
    }
  }`;
  const data = await querySubgraph<{
    retirements: Array<{
      id: string;
      amount: string;
      timestamp: string;
      token: {
        name: string;
        symbol: string;
        projectVintage: {
          project: {
            projectId: string;
            region: string;
            standard: string;
            methodology: string;
          };
        };
      };
    }>;
  }>(query);
  return data.retirements;
}

// Toucan carbon pool addresses on Polygon
export const TOUCAN_POOL_ADDRESSES = {
  BCT: "0x2f800db0fdb5223b3c3f354886d907a671414a7f",
  NCT: "0xd838290e877e0188a4a44700463419ed96c16107",
} as const;

export interface PooledTCO2 {
  token: { name: string; symbol: string; address: string };
  amount: string;
}

export async function fetchPooledTCO2Tokens(
  poolAddress: string,
  first = 1000
): Promise<PooledTCO2[]> {
  const query = `{
    pooledTCO2Tokens(
      where: { poolAddress: "${poolAddress.toLowerCase()}" }
      first: ${first}
      orderBy: amount
      orderDirection: desc
    ) {
      token {
        name
        symbol
        address
      }
      amount
    }
  }`;
  const data = await querySubgraph<{ pooledTCO2Tokens: PooledTCO2[] }>(query);
  return data.pooledTCO2Tokens;
}

export async function fetchToucanAggregations(): Promise<
  Array<{ id: string; key: string; value: string }>
> {
  const query = `{
    aggregations {
      id
      key
      value
    }
  }`;
  const data = await querySubgraph<{
    aggregations: Array<{ id: string; key: string; value: string }>;
  }>(query);
  return data.aggregations;
}

// Pool-level summary: total tCO2e, number of underlying vintages
export interface PoolSummary {
  name: string;
  address: string;
  totalTCO2e: number;
  tokenCount: number;
}

export async function fetchPoolSummary(
  poolName: string,
  poolAddress: string
): Promise<PoolSummary> {
  const pooled = await fetchPooledTCO2Tokens(poolAddress, 1000);
  let totalTCO2e = 0;
  let tokenCount = 0;
  for (const p of pooled) {
    const amount = parseFloat(p.amount) / 1e18;
    if (!isNaN(amount) && amount > 0) {
      totalTCO2e += amount;
      tokenCount++;
    }
  }
  return { name: poolName, address: poolAddress, totalTCO2e, tokenCount };
}

export function getToucanSourceMeta(endpoint: string, params: Record<string, string>) {
  return {
    protocol: "toucan" as const,
    endpoint,
    queryParams: params,
    fetchedAt: new Date().toISOString(),
  };
}
