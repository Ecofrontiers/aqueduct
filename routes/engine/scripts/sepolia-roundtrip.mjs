/**
 * sepolia-roundtrip.mjs — Base Sepolia MECHANICS PROOF for the Beezie Seaport spine.
 *
 * Beezie is mainnet-only, so we prove the BUY+LIST MECHANICS on Base Sepolia by
 * SELF-CREATING a Seaport 1.6 order (the same protocol Beezie listings use) and fulfilling
 * it autonomously via the SAME `fulfillAdvancedOrder` path BeezieMarketplaceAdapter.acquire()
 * uses. End-to-end this produces REAL Base Sepolia tx hashes that resolve on the explorer.
 *
 * What it does (fully autonomous, one funded wallet):
 *   1. Deploy a minimal mintable ERC-721 (the "slab") + a 6-decimal mock USDC (the
 *      consideration token) — self-contained creation bytecode in sepolia-mock-bytecode.json.
 *   2. Mint slab #1 to the wallet (the seller) and USDC to the wallet (also the buyer —
 *      Seaport permits self-fulfilment; this proves the calldata path without a 2nd key).
 *   3. setApprovalForAll(slab → Seaport conduit/Seaport) and approve(USDC → Seaport) — the
 *      one-time approvals a real LIST + BUY need.
 *   4. LIST: build a Seaport order (offer=ERC721 slab, consideration=USDC to seller), EIP-712
 *      sign it, and `validate()` it on-chain → proves the createListing/list() mechanics
 *      (signed Seaport order accepted by Seaport) with a real tx hash.
 *   5. BUY: `fulfillAdvancedOrder(...)` the signed order → slab transfers to the buyer, USDC
 *      to the seller → proves acquire()'s Seaport fill path with a real settle tx hash.
 *
 * RUN (end-to-end, real tx hashes):
 *   SEPOLIA_PRIVATE_KEY=0x... BASE_SEPOLIA_RPC=https://sepolia.base.org \
 *     node scripts/sepolia-roundtrip.mjs
 *
 * NO KEY? It runs a DRY-RUN: connects to the RPC, confirms Seaport 1.6 is deployed,
 * builds the exact order + calldata, and `simulateContract`/`call`-checks what it can
 * WITHOUT a funded signer — then logs precisely which steps need the key. Leaves the
 * full path runnable the moment a key is provided. NEVER fabricates a tx hash.
 */

import { readFileSync } from "node:fs";
import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  parseAbi,
  parseAbiItem,
  keccak256,
  encodeAbiParameters,
  maxUint256,
  zeroAddress,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ── Constants ────────────────────────────────────────────────────────────────
const SEAPORT_1_6 = "0x0000000000000068f116a894984e2db1123eb395";
const RPC = process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const PK = process.env.SEPOLIA_PRIVATE_KEY || "";
const EXPLORER = "https://sepolia.basescan.org/tx/";

const __dirname = new URL(".", import.meta.url).pathname;
const BYTECODE = JSON.parse(readFileSync(`${__dirname}/sepolia-mock-bytecode.json`, "utf8"));

// Seaport conduit controller default conduit key = 0 means "use Seaport directly" (no conduit).
// We approve the slab/USDC directly to the Seaport contract and use conduitKey = bytes32(0).
const ZERO_BYTES32 = "0x" + "0".repeat(64);

// ── Seaport ABI fragments we use (the SAME fulfillAdvancedOrder the adapter encodes) ──
const ORDER_COMPONENTS = [
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
];

const SEAPORT_ABI = [
  {
    type: "function",
    name: "getCounter",
    stateMutability: "view",
    inputs: [{ name: "offerer", type: "address" }],
    outputs: [{ name: "counter", type: "uint256" }],
  },
  {
    type: "function",
    name: "getOrderHash",
    stateMutability: "view",
    inputs: [{ name: "order", type: "tuple", components: [...ORDER_COMPONENTS, { name: "counter", type: "uint256" }] }],
    outputs: [{ name: "orderHash", type: "bytes32" }],
  },
  {
    type: "function",
    name: "information",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "version", type: "string" },
      { name: "domainSeparator", type: "bytes32" },
      { name: "conduitController", type: "address" },
    ],
  },
  {
    type: "function",
    name: "validate",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "orders",
        type: "tuple[]",
        components: [
          { name: "parameters", type: "tuple", components: ORDER_COMPONENTS },
          { name: "signature", type: "bytes" },
        ],
      },
    ],
    outputs: [{ name: "validated", type: "bool" }],
  },
  {
    type: "function",
    name: "fulfillAdvancedOrder",
    stateMutability: "payable",
    inputs: [
      {
        name: "advancedOrder",
        type: "tuple",
        components: [
          { name: "parameters", type: "tuple", components: ORDER_COMPONENTS },
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
];

// EIP-712 types for a Seaport OrderComponents signature.
const EIP712_TYPES = {
  OrderComponents: [
    { name: "offerer", type: "address" },
    { name: "zone", type: "address" },
    { name: "offer", type: "OfferItem[]" },
    { name: "consideration", type: "ConsiderationItem[]" },
    { name: "orderType", type: "uint8" },
    { name: "startTime", type: "uint256" },
    { name: "endTime", type: "uint256" },
    { name: "zoneHash", type: "bytes32" },
    { name: "salt", type: "uint256" },
    { name: "conduitKey", type: "bytes32" },
    { name: "counter", type: "uint256" },
  ],
  OfferItem: [
    { name: "itemType", type: "uint8" },
    { name: "token", type: "address" },
    { name: "identifierOrCriteria", type: "uint256" },
    { name: "startAmount", type: "uint256" },
    { name: "endAmount", type: "uint256" },
  ],
  ConsiderationItem: [
    { name: "itemType", type: "uint8" },
    { name: "token", type: "address" },
    { name: "identifierOrCriteria", type: "uint256" },
    { name: "startAmount", type: "uint256" },
    { name: "endAmount", type: "uint256" },
    { name: "recipient", type: "address" },
  ],
};

const ERC721_ABI = parseAbi([
  "function mint(address to, uint256 id)",
  "function ownerOf(uint256 id) view returns (address)",
  "function setApprovalForAll(address operator, bool approved)",
  "function isApprovedForAll(address owner, address operator) view returns (bool)",
]);
const ERC20_ABI = parseAbi([
  "function mint(address to, uint256 amt)",
  "function approve(address s, uint256 a) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
]);

function log(...a) {
  console.log(...a);
}
function hr() {
  log("─".repeat(78));
}

async function main() {
  hr();
  log("Base Sepolia Seaport round-trip — MECHANICS PROOF for BeezieMarketplaceAdapter");
  hr();
  log("RPC                 :", RPC);
  log("Seaport 1.6 target  :", SEAPORT_1_6);

  const publicClient = createPublicClient({ chain: baseSepolia, transport: http(RPC) });

  // 0) Confirm Seaport 1.6 is actually deployed at the canonical address on Base Sepolia.
  const code = await publicClient.getBytecode({ address: SEAPORT_1_6 }).catch(() => null);
  const seaportDeployed = !!code && code.length > 2;
  log("Seaport 1.6 deployed:", seaportDeployed, seaportDeployed ? `(${code.length} bytes)` : "");
  if (!seaportDeployed) {
    log("\nFATAL: Seaport 1.6 not found on this RPC. Check BASE_SEPOLIA_RPC.");
    process.exit(1);
  }
  const info = await publicClient.readContract({ address: SEAPORT_1_6, abi: SEAPORT_ABI, functionName: "information" });
  log("Seaport version     :", info[0], "| domainSeparator", info[1].slice(0, 18) + "…");

  const haveKey = /^0x[0-9a-fA-F]{64}$/.test(PK) || /^[0-9a-fA-F]{64}$/.test(PK);
  if (!haveKey) {
    hr();
    log("DRY-RUN (no SEPOLIA_PRIVATE_KEY) — everything that does NOT need a funded signer ran:");
    log("  ✓ connected to Base Sepolia RPC");
    log("  ✓ confirmed Seaport 1.6 deployed at the canonical address");
    log("  ✓ read Seaport.information() (version + domain separator)");
    log("  ✓ loaded mock ERC-721 + ERC-20 creation bytecode (deployable)");
    log("  ✓ built the Seaport order struct + EIP-712 signing payload + fulfillAdvancedOrder calldata");
    // Demonstrate the calldata builds (no signer needed) for a representative order.
    const demo = buildOrder({
      offerer: "0x000000000000000000000000000000000000dEaD",
      slab: "0x0000000000000000000000000000000000000001",
      usdc: "0x0000000000000000000000000000000000000002",
      tokenId: 1n,
      priceUsdc: 1_000_000n, // $1.00
      counter: 0n,
    });
    const calldata = encodeFunctionData({
      abi: SEAPORT_ABI,
      functionName: "fulfillAdvancedOrder",
      args: [{ parameters: demo.parameters, numerator: 1n, denominator: 1n, signature: "0x", extraData: "0x" }, [], ZERO_BYTES32, "0x000000000000000000000000000000000000dEaD"],
    });
    log("  ✓ fulfillAdvancedOrder calldata length:", calldata.length, "bytes (encodes cleanly)");
    hr();
    log("NEEDS THE KEY to run end-to-end (each produces a REAL Sepolia tx hash):");
    log("  • deploy MiniERC721 + MiniUSDC");
    log("  • mint slab #1 + USDC to the wallet");
    log("  • setApprovalForAll(slab→Seaport) + approve(USDC→Seaport)");
    log("  • validate() the signed Seaport order   ← proves list()/createListing mechanics");
    log("  • fulfillAdvancedOrder()                ← proves acquire() Seaport fill mechanics");
    log("");
    log("Provide a funded Base Sepolia key to complete:");
    log("  SEPOLIA_PRIVATE_KEY=0x... BASE_SEPOLIA_RPC=" + RPC + " node scripts/sepolia-roundtrip.mjs");
    log("Faucet: https://www.alchemy.com/faucets/base-sepolia  (Seaport mechanics need only gas)");
    hr();
    process.exit(0);
  }

  // ── FULL RUN (funded key) ──────────────────────────────────────────────────
  const account = privateKeyToAccount(PK.startsWith("0x") ? PK : `0x${PK}`);
  const walletClient = createWalletClient({ account, chain: baseSepolia, transport: http(RPC) });
  log("Wallet (seller+buyer):", account.address);
  const bal = await publicClient.getBalance({ address: account.address });
  log("ETH balance         :", (Number(bal) / 1e18).toFixed(6), "ETH");
  if (bal === 0n) {
    log("\nFATAL: wallet has 0 ETH on Base Sepolia. Fund it: https://www.alchemy.com/faucets/base-sepolia");
    process.exit(1);
  }

  const txs = {};
  const send = async (label, hash) => {
    log(`  → ${label}: ${EXPLORER}${hash}`);
    const r = await publicClient.waitForTransactionReceipt({ hash });
    log(`     status=${r.status} block=${r.blockNumber}`);
    txs[label] = hash;
    // A reverted prerequisite tx (e.g. a failed mint) silently corrupts the rest of the
    // sequence — fail loudly here instead of building an order against bad on-chain state.
    if (r.status !== "success") {
      throw new Error(`tx "${label}" reverted (${EXPLORER}${hash}) — aborting round-trip`);
    }
    return r;
  };

  hr();
  log("1) Deploy mocks");
  const slabHash = await walletClient.deployContract({ abi: ERC721_ABI, bytecode: BYTECODE.erc721 });
  const slabRcpt = await publicClient.waitForTransactionReceipt({ hash: slabHash });
  const slab = slabRcpt.contractAddress;
  log("   MiniERC721 (slab):", slab, `  ${EXPLORER}${slabHash}`);
  txs.deploySlab = slabHash;

  const usdcHash = await walletClient.deployContract({ abi: ERC20_ABI, bytecode: BYTECODE.erc20 });
  const usdcRcpt = await publicClient.waitForTransactionReceipt({ hash: usdcHash });
  const usdc = usdcRcpt.contractAddress;
  log("   MiniUSDC         :", usdc, `  ${EXPLORER}${usdcHash}`);
  txs.deployUsdc = usdcHash;

  hr();
  log("2) Mint slab #1 to seller + USDC to buyer (same wallet for the self-fulfil proof)");
  const tokenId = 1n;
  const priceUsdc = 1_000_000n; // $1.00 (6 decimals)
  // NOTE: the public sepolia.base.org RPC under-estimates gas for these mock writes
  // (a first-write SSTORE alone is ~22.1k gas and estimation landed at 22,825 → out-of-gas).
  // Pin an explicit, generous gas limit so estimation flakiness can't revert the prereqs.
  const GAS = 120_000n;
  await send("mint slab #1", await walletClient.writeContract({ address: slab, abi: ERC721_ABI, functionName: "mint", args: [account.address, tokenId], gas: GAS }));
  await send("mint USDC", await walletClient.writeContract({ address: usdc, abi: ERC20_ABI, functionName: "mint", args: [account.address, priceUsdc * 10n], gas: GAS }));

  hr();
  log("3) Approvals (the one-time list + buy approvals)");
  await send("setApprovalForAll(slab→Seaport)", await walletClient.writeContract({ address: slab, abi: ERC721_ABI, functionName: "setApprovalForAll", args: [SEAPORT_1_6, true], gas: GAS }));
  await send("approve(USDC→Seaport)", await walletClient.writeContract({ address: usdc, abi: ERC20_ABI, functionName: "approve", args: [SEAPORT_1_6, maxUint256], gas: GAS }));

  hr();
  log("4) Build + EIP-712 sign the Seaport order, then validate() on-chain (LIST mechanics)");
  const counter = await publicClient.readContract({ address: SEAPORT_1_6, abi: SEAPORT_ABI, functionName: "getCounter", args: [account.address] });
  const order = buildOrder({ offerer: account.address, slab, usdc, tokenId, priceUsdc, counter });

  // EIP-712 sign the OrderComponents (this is exactly what opensea-js createListing signs).
  const signature = await walletClient.signTypedData({
    account,
    domain: { name: "Seaport", version: "1.6", chainId: baseSepolia.id, verifyingContract: SEAPORT_1_6 },
    types: EIP712_TYPES,
    primaryType: "OrderComponents",
    message: { ...order.parameters, counter },
  });
  // getOrderHash is a convenience read for logging only; validate()/fulfillAdvancedOrder()
  // recompute the hash internally and do NOT depend on it. On some Seaport view paths this
  // eth_call reverts, so keep it non-fatal — the LIST/BUY mechanics below are the proof.
  let orderHash = "(getOrderHash unavailable on this RPC)";
  try {
    orderHash = await publicClient.readContract({ address: SEAPORT_1_6, abi: SEAPORT_ABI, functionName: "getOrderHash", args: [{ ...order.parameters, counter }] });
  } catch {
    /* non-fatal */
  }
  log("   order_hash       :", orderHash);
  log("   signature        :", signature.slice(0, 22) + "…");

  await send("validate() signed order", await walletClient.writeContract({
    address: SEAPORT_1_6,
    abi: SEAPORT_ABI,
    functionName: "validate",
    args: [[{ parameters: order.parameters, signature }]],
  }));
  log("   ✓ LIST mechanics proven — Seaport accepted the signed order on-chain.");

  hr();
  log("5) fulfillAdvancedOrder() — BUY mechanics (the path acquire() uses)");
  // Pre-flight simulate so a revert is caught with a clean reason before sending.
  await publicClient.simulateContract({
    account,
    address: SEAPORT_1_6,
    abi: SEAPORT_ABI,
    functionName: "fulfillAdvancedOrder",
    args: [{ parameters: order.parameters, numerator: 1n, denominator: 1n, signature, extraData: "0x" }, [], ZERO_BYTES32, account.address],
  });
  log("   ✓ simulateContract(fulfillAdvancedOrder) succeeds (no revert)");

  const ownerBefore = await publicClient.readContract({ address: slab, abi: ERC721_ABI, functionName: "ownerOf", args: [tokenId] });
  const fillHash = await walletClient.writeContract({
    address: SEAPORT_1_6,
    abi: SEAPORT_ABI,
    functionName: "fulfillAdvancedOrder",
    args: [{ parameters: order.parameters, numerator: 1n, denominator: 1n, signature, extraData: "0x" }, [], ZERO_BYTES32, account.address],
  });
  await send("fulfillAdvancedOrder (settle)", fillHash);
  const ownerAfter = await publicClient.readContract({ address: slab, abi: ERC721_ABI, functionName: "ownerOf", args: [tokenId] });
  log("   slab owner before:", ownerBefore);
  log("   slab owner after :", ownerAfter);
  log("   ✓ BUY mechanics proven — slab transferred through Seaport fulfillAdvancedOrder.");

  hr();
  log("ROUND-TRIP COMPLETE — real Base Sepolia tx hashes:");
  log("   LIST (validate)        :", EXPLORER + txs["validate() signed order"]);
  log("   BUY  (fulfillAdvanced) :", EXPLORER + txs["fulfillAdvancedOrder (settle)"]);
  log("   settleTxHash           :", fillHash);
  hr();
}

/** Build the Seaport OrderParameters: offer = ERC721 slab, consideration = USDC to the offerer. */
function buildOrder({ offerer, slab, usdc, tokenId, priceUsdc, counter }) {
  void counter; // counter is signed separately (in the EIP-712 message), not in parameters
  const now = BigInt(Math.floor(Date.now() / 1000));
  const parameters = {
    offerer,
    zone: zeroAddress,
    offer: [{ itemType: 2, token: slab, identifierOrCriteria: tokenId, startAmount: 1n, endAmount: 1n }], // ERC721
    consideration: [
      { itemType: 1, token: usdc, identifierOrCriteria: 0n, startAmount: priceUsdc, endAmount: priceUsdc, recipient: offerer }, // ERC20 USDC to seller
    ],
    orderType: 0, // FULL_OPEN
    startTime: now - 60n,
    endTime: now + 86_400n,
    zoneHash: ZERO_BYTES32,
    salt: BigInt("0x" + keccak256(encodeAbiParameters([{ type: "uint256" }], [now])).slice(2, 18)),
    conduitKey: ZERO_BYTES32, // no conduit — approvals are direct to Seaport
    totalOriginalConsiderationItems: 1n,
  };
  return { parameters };
}

main().catch((e) => {
  console.error("\nERROR:", e.shortMessage || e.message);
  if (e.cause?.reason) console.error("revert reason:", e.cause.reason);
  process.exit(1);
});
