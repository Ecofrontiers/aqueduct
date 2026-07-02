/**
 * seaport-common.ts — chain-agnostic Seaport 1.6 money-path primitives shared by the
 * tokenized MarketplaceAdapters (Beezie/Base, Courtyard/Polygon).
 *
 * This module factors the HARDENED, cross-model-reviewed security logic out of beezie.ts
 * so a second venue (Courtyard) inherits the EXACT same assertion set rather than re-deriving
 * it. The Beezie adapter predates this file and is intentionally left untouched; Courtyard
 * mirrors Beezie and additionally reuses these helpers.
 *
 * The properties encoded here (named after the Beezie cross-model review):
 *   C2     — untrusted fulfillment_data is quarantined: re-sum consideration, assert value===0,
 *            reject foreign-token consideration, re-check the cap against the freshly-parsed amount.
 *   H1     — the USDC approval is the EXACT need (+0.5% drift buffer), hard-capped; NEVER maxUint256.
 *   H2     — the approval spender is RESOLVED from the order's fulfillerConduitKey (zero ⇒ Seaport;
 *            non-zero ⇒ ConduitController.getConduit), never a hardcoded guess.
 *   H3     — recipient===fulfiller, numerator/denominator===1/1, criteriaResolvers empty.
 *   NEW-1  — the re-summed consideration must ≈ the QUOTED ask within CONSIDERATION_TOLERANCE
 *            (rejects overpay-within-cap).
 *   NEW-2  — offer-side assertion: itemType 2 (ERC721) + the expected collection (+ tokenId when set).
 *   M2     — BigInt money discipline at every boundary (no float compare; round-UP USD→base-units).
 *
 * NO randomness, NO fabricated tx hashes, NO invented slugs anywhere in this file.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Canonical Seaport constants (identical on Base and Polygon — same deployer address)
// ─────────────────────────────────────────────────────────────────────────────

/** Seaport 1.6 — the canonical cross-chain deployment address (same on Base + Polygon). */
export const SEAPORT_1_6 = "0x0000000000000068f116a894984e2db1123eb395" as const;

/** Seaport ConduitController — canonical cross-chain address; resolves a conduitKey → spender (H2). */
export const SEAPORT_CONDUIT_CONTROLLER = "0x00000000F9490004C11Cef243f5400493c00Ad63" as const;

/** bytes32(0) — the "no conduit" key (approve USDC to Seaport itself). */
export const ZERO_BYTES32_LITERAL = ("0x" + "0".repeat(64)) as `0x${string}`;

/** USDC decimals — 6 on both Base USDC and Polygon bridged USDC.e. */
export const USDC_DECIMALS = 6;

/**
 * Tolerance (USDC base units, 6 decimals) for the re-summed consideration vs the quoted ask —
 * covers benign fee-rounding drift only. 5_000 = $0.005. A mismatch beyond this means the
 * untrusted fulfillment_data does NOT match our order → refuse (NEW-1).
 */
export const CONSIDERATION_TOLERANCE_BASE_UNITS = 5_000n; // $0.005

// ─────────────────────────────────────────────────────────────────────────────
// OpenSea Orders API payload shapes (the subset we read) — chain-agnostic
// ─────────────────────────────────────────────────────────────────────────────

export interface OSConsiderationItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
  recipient: string;
}

export interface OSOfferItem {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
}

export interface OSProtocolParameters {
  offerer: string;
  offer: OSOfferItem[];
  consideration: OSConsiderationItem[];
  startTime: string;
  endTime: string;
  orderType: number;
  zone: string;
  zoneHash: string;
  salt: string;
  conduitKey: string;
  totalOriginalConsiderationItems: number;
  counter: number;
}

export interface OSOrder {
  order_hash: string;
  chain: string;
  protocol_address: string;
  protocol_data: { parameters: OSProtocolParameters; signature: string | null };
  price?: { current?: { currency: string; decimals: number; value: string } };
  type?: string;
  status?: string;
}

export interface OSOrdersResponse {
  listings?: OSOrder[];
  next?: string | null;
}

/** OpenSea fulfillment_data response — ready Seaport calldata for the buy (UNTRUSTED). */
export interface OSFulfillmentResponse {
  protocol?: string;
  fulfillment_data?: {
    transaction?: {
      function: string;
      chain: string;
      to: string;
      value: number | string;
      input_data: Record<string, unknown>;
    };
    orders?: unknown[];
  };
}

/** A Seaport consideration item as returned inside fulfillment_data.input_data.advancedOrder (UNTRUSTED). */
export interface SeaportConsiderationItem {
  itemType: number | string;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
  recipient: string;
}

/** The advancedOrder tuple OpenSea hands back — parsed + asserted before any tx (UNTRUSTED). */
export interface SeaportAdvancedOrder {
  parameters: {
    offerer: string;
    zone: string;
    offer: Array<{ itemType: number | string; token: string; identifierOrCriteria: string; startAmount: string; endAmount: string }>;
    consideration: SeaportConsiderationItem[];
    orderType: number | string;
    startTime: string;
    endTime: string;
    zoneHash: string;
    salt: string;
    conduitKey: string;
    totalOriginalConsiderationItems: number | string;
  };
  numerator: number | string;
  denominator: number | string;
  signature: string;
  extraData: string;
}

/** The validated, cross-checked fill an adapter is willing to send (post-quarantine). */
export interface VerifiedFill {
  to: `0x${string}`;
  value: bigint; // MUST be 0n for a USDC order
  advancedOrder: SeaportAdvancedOrder;
  criteriaResolvers: unknown[]; // MUST be empty for a full direct buy
  fulfillerConduitKey: `0x${string}`;
  recipient: `0x${string}`; // MUST equal our wallet
  considerationBaseUnits: bigint; // re-summed from advancedOrder.parameters.consideration
}

/** Loose encoder signature so we can pass viem's `encodeFunctionData` without importing its generics. */
export type EncodeFn = (args: { abi: readonly unknown[]; functionName: string; args: readonly unknown[] }) => `0x${string}`;

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers (chain-agnostic money discipline — M2)
// ─────────────────────────────────────────────────────────────────────────────

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** USD (float) → USDC base units (6 decimals), rounded UP so we never under-cap (M2). */
export function usdToBaseUnits(usd: number): bigint {
  return BigInt(Math.ceil(usd * 10 ** USDC_DECIMALS));
}

/** USDC base units → USD (float) for display only — NEVER used at a money boundary. */
export function baseUnitsToUsd(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS;
}

/** The tighter (smaller) of two optional caps. Returns undefined only if BOTH are undefined. */
export function minCap(a?: bigint, b?: bigint): bigint | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return a < b ? a : b;
}

/** Re-exported for tests: the tighter of two optional caps in USD (undefined only if both undefined). */
export function effectiveCapBaseUnits(perCallUsd?: number, configUsd?: number): bigint | undefined {
  const a = typeof perCallUsd === "number" ? usdToBaseUnits(perCallUsd) : undefined;
  const b = typeof configUsd === "number" ? usdToBaseUnits(configUsd) : undefined;
  return minCap(a, b);
}

/**
 * The EXACT USDC approval amount (base units) for a verified fill (H1): the re-summed
 * consideration plus a 0.5% fee-drift buffer, hard-capped by the spend cap. NEVER unbounded
 * (no maxUint256). This is the only amount an adapter ever approves to a Seaport spender.
 */
export function exactApprovalAmount(considerationBaseUnits: bigint, capBaseUnits: bigint): bigint {
  const buffer = considerationBaseUnits / 200n; // 0.5%
  const need = considerationBaseUnits + buffer;
  return need > capBaseUnits ? capBaseUnits : need; // the cap is the hard ceiling on the approval too
}

/**
 * Total USDC consideration (all recipients) in USD — the true ask the buyer pays. Returns null
 * when the order has no USDC consideration (e.g. a WETH order — out of the USDC arb scope).
 */
export function totalUsdcConsideration(params: OSProtocolParameters, usdcToken: string): number | null {
  let total = 0n;
  let sawUsdc = false;
  for (const c of params.consideration) {
    if (c.itemType === 1 && c.token.toLowerCase() === usdcToken.toLowerCase()) {
      total += BigInt(c.startAmount);
      sawUsdc = true;
    }
  }
  if (!sawUsdc) return null;
  return Number(total) / 10 ** USDC_DECIMALS;
}

/** The slab tokenId offered by the order (the ERC-721 being sold). null if not a single-ERC721 sale. */
export function offeredTokenId(params: OSProtocolParameters): string | null {
  const offer = params.offer?.[0];
  if (!offer) return null;
  if (offer.itemType !== 2) return null; // itemType 2 = ERC721
  return offer.identifierOrCriteria;
}

/** Extract the tokenId from a canonical .../{collection}/{tokenId} listing url. */
export function tokenIdFromAssetUrl(url: string): string | undefined {
  const last = url.split("/").pop();
  return last && /^\d+$/.test(last) ? last : undefined;
}

/**
 * Re-sum the USDC consideration in a (possibly untrusted) Seaport order's parameters.
 * Counts ONLY ERC20 (itemType 1) USDC considerations; returns the total in base units
 * AND asserts there is no non-USDC ERC20 / native consideration sneaking in. (C2)
 */
export function reSumUsdcConsideration(
  considerations: SeaportConsiderationItem[],
  usdcToken: string,
): { totalBaseUnits: bigint; foreignTokens: string[] } {
  let total = 0n;
  const foreignTokens: string[] = [];
  for (const c of considerations) {
    const itemType = Number(c.itemType);
    const token = String(c.token).toLowerCase();
    if (itemType === 1 && token === usdcToken.toLowerCase()) {
      // pay max(startAmount, endAmount) over the window — so a descending-price trick can't under-count.
      const start = BigInt(c.startAmount);
      const end = BigInt(c.endAmount);
      total += start > end ? start : end;
    } else if (itemType === 0) {
      foreignTokens.push("native-ETH"); // native consideration — NOT a USDC order
    } else if (itemType === 1) {
      foreignTokens.push(token); // a non-USDC ERC20 consideration
    }
    // itemType 2/3/4 (NFT considerations) are not a spend of our funds — ignore for the cap.
  }
  return { totalBaseUnits: total, foreignTokens };
}

// ─────────────────────────────────────────────────────────────────────────────
// The quarantine verifier (C2/H3/NEW-1/NEW-2) — chain-parameterized, shared logic
// ─────────────────────────────────────────────────────────────────────────────

/** Per-chain binding for the shared quarantine verifier. */
export interface SeaportChainBinding {
  /** The USDC token address for the chain (Base USDC or Polygon USDC.e). */
  usdcToken: string;
  /** The NFT collection the order MUST offer (Beezie or Courtyard). */
  collection: string;
}

/**
 * Quarantine + cross-check an UNTRUSTED OpenSea fulfillment_data response into a VerifiedFill.
 * This is the single shared implementation of the C2/H3/NEW-1/NEW-2 assertion set — both the
 * Beezie-equivalent and the Courtyard adapter route through it (Courtyard via this module).
 *
 * Fails CLOSED, with a `SECURITY:`-prefixed Error, on ANY mismatch:
 *  - tx.to === Seaport 1.6                                  (no rogue target)
 *  - tx.value === 0                                          (USDC order; no native ETH leak, C2)
 *  - recipient === our fulfiller wallet                     (slab can't be redirected, H3)
 *  - numerator/denominator === 1/1                          (full direct buy, no partial trick, H3)
 *  - criteriaResolvers empty                                (no criteria substitution, H3)
 *  - offer is itemType 2 (ERC721) of `collection` (+tokenId) (NEW-2)
 *  - every consideration is USDC (no foreign-token spend)   (C2)
 *  - re-summed USDC consideration ≤ cap                     (C2)
 *  - re-summed ≈ quoted ask within tolerance                (NEW-1 — rejects overpay-within-cap)
 */
export function verifyFulfillment(i: {
  resp: OSFulfillmentResponse;
  fulfiller: `0x${string}`;
  capBaseUnits: bigint;
  quotedAskBaseUnits: bigint;
  expectedTokenId?: string;
  binding: SeaportChainBinding;
}): VerifiedFill {
  const { binding } = i;
  const tx = i.resp.fulfillment_data?.transaction;
  if (!tx) throw new Error(`SECURITY: fulfillment_data returned no transaction — refusing`);

  // 1) target must be Seaport 1.6
  if (String(tx.to).toLowerCase() !== SEAPORT_1_6.toLowerCase()) {
    throw new Error(`SECURITY: fulfillment_data target ${tx.to} is not Seaport 1.6 — refusing`);
  }
  // 2) value must be 0 for a USDC order (no native-value hidden in tx.value)
  const value = BigInt(tx.value ?? 0);
  if (value !== 0n) {
    throw new Error(`SECURITY: fulfillment_data tx.value=${value} non-zero for a USDC order — refusing (C2)`);
  }

  const d = tx.input_data as {
    advancedOrder?: SeaportAdvancedOrder;
    criteriaResolvers?: unknown[];
    fulfillerConduitKey?: string;
    recipient?: string;
  };
  const advancedOrder = d.advancedOrder;
  if (!advancedOrder?.parameters?.consideration) {
    throw new Error(`SECURITY: fulfillment_data missing advancedOrder.parameters.consideration — refusing`);
  }

  // 3) recipient (where the bought slab is sent) MUST be our wallet
  const recipient = String(d.recipient ?? "");
  if (recipient.toLowerCase() !== i.fulfiller.toLowerCase()) {
    throw new Error(`SECURITY: fill recipient ${recipient} != our wallet ${i.fulfiller} — refusing (H3)`);
  }
  // 4) full direct buy — numerator/denominator must be 1/1
  if (String(advancedOrder.numerator) !== "1" || String(advancedOrder.denominator) !== "1") {
    throw new Error(`SECURITY: fill is not a full buy (numerator/denominator=${advancedOrder.numerator}/${advancedOrder.denominator}) — refusing (H3)`);
  }
  // 5) no criteria resolvers (no collection-offer / criteria substitution)
  const criteriaResolvers = Array.isArray(d.criteriaResolvers) ? d.criteriaResolvers : [];
  if (criteriaResolvers.length !== 0) {
    throw new Error(`SECURITY: fill carries ${criteriaResolvers.length} criteriaResolvers — refusing (H3)`);
  }

  // 6) OFFER-SIDE assertion (NEW-2): the order must OFFER exactly the ERC721 of the expected
  //    collection (+ the discovered tokenId when supplied). Else we could pay USDC for the wrong asset.
  const offer = advancedOrder.parameters.offer?.[0];
  if (!offer) {
    throw new Error(`SECURITY: fill has no offer item — refusing (NEW-2)`);
  }
  if (Number(offer.itemType) !== 2) {
    throw new Error(`SECURITY: fill offer itemType=${offer.itemType} is not ERC721 (2) — refusing (NEW-2)`);
  }
  if (String(offer.token).toLowerCase() !== binding.collection.toLowerCase()) {
    throw new Error(`SECURITY: fill offer token ${offer.token} != expected collection ${binding.collection} — refusing (NEW-2)`);
  }
  if (i.expectedTokenId !== undefined && String(offer.identifierOrCriteria) !== String(i.expectedTokenId)) {
    throw new Error(`SECURITY: fill offer tokenId ${offer.identifierOrCriteria} != expected ${i.expectedTokenId} — refusing (NEW-2)`);
  }

  // 7) re-sum the USDC consideration; reject any foreign-token consideration
  const { totalBaseUnits, foreignTokens } = reSumUsdcConsideration(advancedOrder.parameters.consideration, binding.usdcToken);
  if (foreignTokens.length > 0) {
    throw new Error(`SECURITY: fill consideration includes non-USDC tokens [${foreignTokens.join(",")}] — refusing (C2)`);
  }
  if (totalBaseUnits <= 0n) {
    throw new Error(`SECURITY: fill consideration re-sums to ${totalBaseUnits} USDC — refusing`);
  }
  // 8) cap check against the freshly-parsed amount (not the stale discover() quote)
  if (totalBaseUnits > i.capBaseUnits) {
    throw new Error(
      `SECURITY: re-summed consideration $${baseUnitsToUsd(totalBaseUnits)} > cap $${baseUnitsToUsd(i.capBaseUnits)} — refusing (C2)`,
    );
  }
  // 9) ASK-MATCH (NEW-1): the re-summed consideration must equal the QUOTED ask within a tight
  //    tolerance. `<= cap` alone permits overpay-within-cap (pay $99 for a $40 slab).
  const askDelta = totalBaseUnits > i.quotedAskBaseUnits ? totalBaseUnits - i.quotedAskBaseUnits : i.quotedAskBaseUnits - totalBaseUnits;
  if (askDelta > CONSIDERATION_TOLERANCE_BASE_UNITS) {
    throw new Error(
      `SECURITY: re-summed consideration $${baseUnitsToUsd(totalBaseUnits)} != quoted ask $${baseUnitsToUsd(i.quotedAskBaseUnits)} ` +
        `(delta $${baseUnitsToUsd(askDelta)} > tolerance $${baseUnitsToUsd(CONSIDERATION_TOLERANCE_BASE_UNITS)}) — refusing (NEW-1 overpay-within-cap)`,
    );
  }

  const fulfillerConduitKey = (d.fulfillerConduitKey ?? ZERO_BYTES32_LITERAL) as `0x${string}`;
  return {
    to: tx.to as `0x${string}`,
    value,
    advancedOrder,
    criteriaResolvers,
    fulfillerConduitKey,
    recipient: i.fulfiller, // our asserted wallet
    considerationBaseUnits: totalBaseUnits,
  };
}

/**
 * The canonical Seaport `fulfillAdvancedOrder(advancedOrder, criteriaResolvers, fulfillerConduitKey,
 * recipient)` ABI tuple — identical on Base and Polygon (same Seaport 1.6). Shared so both adapters
 * encode the verified fill the same way.
 */
export const FULFILL_ADVANCED_ORDER_ABI = [
  {
    type: "function",
    name: "fulfillAdvancedOrder",
    stateMutability: "payable",
    inputs: [
      {
        name: "advancedOrder",
        type: "tuple",
        components: [
          {
            name: "parameters",
            type: "tuple",
            components: [
              { name: "offerer", type: "address" },
              { name: "zone", type: "address" },
              {
                name: "offer",
                type: "tuple[]",
                components: [
                  { name: "itemType", type: "uint8" },
                  { name: "token", type: "address" },
                  { name: "identifierOrCriteria", type: "uint256" },
                  { name: "startAmount", type: "uint256" },
                  { name: "endAmount", type: "uint256" },
                ],
              },
              {
                name: "consideration",
                type: "tuple[]",
                components: [
                  { name: "itemType", type: "uint8" },
                  { name: "token", type: "address" },
                  { name: "identifierOrCriteria", type: "uint256" },
                  { name: "startAmount", type: "uint256" },
                  { name: "endAmount", type: "uint256" },
                  { name: "recipient", type: "address" },
                ],
              },
              { name: "orderType", type: "uint8" },
              { name: "startTime", type: "uint256" },
              { name: "endTime", type: "uint256" },
              { name: "zoneHash", type: "bytes32" },
              { name: "salt", type: "uint256" },
              { name: "conduitKey", type: "bytes32" },
              { name: "totalOriginalConsiderationItems", type: "uint256" },
            ],
          },
          { name: "numerator", type: "uint120" },
          { name: "denominator", type: "uint120" },
          { name: "signature", type: "bytes" },
          { name: "extraData", type: "bytes" },
        ],
      },
      {
        name: "criteriaResolvers",
        type: "tuple[]",
        components: [
          { name: "orderIndex", type: "uint256" },
          { name: "side", type: "uint8" },
          { name: "index", type: "uint256" },
          { name: "identifier", type: "uint256" },
          { name: "criteriaProof", type: "bytes32[]" },
        ],
      },
      { name: "fulfillerConduitKey", type: "bytes32" },
      { name: "recipient", type: "address" },
    ],
    outputs: [{ name: "fulfilled", type: "bool" }],
  },
] as const;
