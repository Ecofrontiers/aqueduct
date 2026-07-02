/**
 * Mirror Node REST client for reading HCS topics and HTS tokens.
 * Handles HCS message chunk reassembly (messages >1024 bytes are
 * split by the Hedera SDK and stored as separate chunks).
 */

const MIRROR_NODES: Record<string, string> = {
  testnet: "https://testnet.mirrornode.hedera.com/api/v1",
  mainnet: "https://mainnet-public.mirrornode.hedera.com/api/v1",
};

const THROTTLE_MS = 200;
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Types ──────────────────────────────────────────────────────────

export interface HCSMessage {
  consensus_timestamp: string;
  sequence_number: number;
  message: string; // base64 (reassembled if chunked)
  payer_account_id: string;
  topic_id: string;
}

interface RawTopicMessage {
  consensus_timestamp: string;
  sequence_number: number;
  message: string;
  payer_account_id: string;
  topic_id: string;
  chunk_info?: {
    initial_transaction_id?: {
      account_id: string;
      nonce: number;
      scheduled: boolean;
      transaction_valid_start: string;
    };
    number: number;
    total: number;
  };
}

interface TopicMessagesResponse {
  messages: RawTopicMessage[];
  links?: { next?: string };
}

export interface TokenDetails {
  token_id: string;
  name: string;
  symbol: string;
  total_supply: string;
  decimals: string;
  memo: string;
  treasury_account_id: string;
  type: string;
  created_timestamp: string;
}

// ─── Helpers ────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`Mirror Node ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

function resolveNextUrl(nextPath: string, baseUrl: string): string {
  if (nextPath.startsWith("http")) return nextPath;
  const origin = new URL(baseUrl).origin;
  return nextPath.startsWith("/api/")
    ? `${origin}${nextPath}`
    : `${baseUrl}${nextPath}`;
}

/**
 * Chunk key: groups chunks that belong to the same logical message.
 * Uses initial_transaction_id.transaction_valid_start as the grouping key.
 */
function chunkKey(msg: RawTopicMessage): string {
  if (msg.chunk_info?.initial_transaction_id) {
    const itx = msg.chunk_info.initial_transaction_id;
    return `${itx.account_id}@${itx.transaction_valid_start}`;
  }
  // Unchunked message — use sequence number as unique key
  return `seq-${msg.sequence_number}`;
}

/**
 * Reassemble chunked HCS messages.
 * Messages >1024 bytes are split by the SDK into multiple chunks
 * sharing the same initial_transaction_id. We group by that key,
 * sort by chunk_info.number, and concatenate the base64 payloads.
 */
function reassembleChunks(rawMessages: RawTopicMessage[]): HCSMessage[] {
  const groups = new Map<string, RawTopicMessage[]>();

  for (const msg of rawMessages) {
    const key = chunkKey(msg);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(msg);
  }

  const result: HCSMessage[] = [];

  for (const [, chunks] of groups) {
    // Sort by chunk number (or just use as-is for unchunked)
    chunks.sort((a, b) => {
      const aNum = a.chunk_info?.number ?? 1;
      const bNum = b.chunk_info?.number ?? 1;
      return aNum - bNum;
    });

    // Check if all chunks are present
    const total = chunks[0].chunk_info?.total ?? 1;
    if (chunks.length < total) {
      // Incomplete — skip this message
      continue;
    }

    // Concatenate decoded bytes, then re-encode as single base64
    const allBytes: Buffer[] = chunks.map((c) => Buffer.from(c.message, "base64"));
    const combined = Buffer.concat(allBytes);

    result.push({
      consensus_timestamp: chunks[chunks.length - 1].consensus_timestamp,
      sequence_number: chunks[0].sequence_number,
      message: combined.toString("base64"),
      payer_account_id: chunks[0].payer_account_id,
      topic_id: chunks[0].topic_id,
    });
  }

  // Sort by sequence number
  result.sort((a, b) => a.sequence_number - b.sequence_number);
  return result;
}

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Read all messages from an HCS topic.
 * Automatically reassembles chunked messages.
 */
export async function readTopicMessages(
  topicId: string,
  network: "testnet" | "mainnet" = "testnet"
): Promise<HCSMessage[]> {
  const base = MIRROR_NODES[network];
  const rawMessages: RawTopicMessage[] = [];
  let url: string | null = `${base}/topics/${topicId}/messages?limit=100`;

  while (url) {
    await sleep(THROTTLE_MS);
    const data = await fetchJSON<TopicMessagesResponse>(url);
    rawMessages.push(...data.messages);

    const nextPath = data.links?.next ?? null;
    url = nextPath ? resolveNextUrl(nextPath, base) : null;
  }

  return reassembleChunks(rawMessages);
}

/**
 * Decode a base64 HCS message to a parsed JSON object.
 */
export function decodeMessage<T = unknown>(base64: string): T {
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  return JSON.parse(decoded) as T;
}

/**
 * Read HTS token details from Mirror Node.
 */
export async function readTokenDetails(
  tokenId: string,
  network: "testnet" | "mainnet" = "mainnet"
): Promise<TokenDetails> {
  const base = MIRROR_NODES[network];
  await sleep(THROTTLE_MS);
  const data = await fetchJSON<TokenDetails>(`${base}/tokens/${tokenId}`);
  return {
    token_id: data.token_id,
    name: data.name,
    symbol: data.symbol,
    total_supply: data.total_supply,
    decimals: data.decimals,
    memo: data.memo,
    treasury_account_id: data.treasury_account_id,
    type: data.type,
    created_timestamp: data.created_timestamp,
  };
}
