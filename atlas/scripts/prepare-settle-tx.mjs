#!/usr/bin/env node
// Aqueduct — prepares (never broadcasts) the settle transaction for the
// sell-this-lot intent against the ALREADY-DEPLOYED IntentRegistry on Base
// Sepolia (DEMO-SPEC.md §5 "reuse the deployed IntentRegistry", §3b Gate 2
// "prepare everything up to the broadcast").
//
// The registry contract is domain-neutral on-chain: `productIdHash` is a
// generic bytes32 (keccak256 of any off-chain identifier), so this script
// reuses the SAME deployed contract with the Aqueduct anchor lot's
// content-addressed lot ID hashed in — no redeploy, no new contract, no
// card-domain reference anywhere in this file.
//
//   Registry (Base Sepolia, chainId 84532): 0x3AA739c23615cD7e08D365af851F43c76cdfcc6E
//   Verified live 2026-07-02: eth_getCode returned real bytecode; owner()
//   resolves to a real address. (curl spike against https://sepolia.base.org)
//
// HARD RULE (build session constraint, restated here so this file is
// self-documenting): this script NEVER broadcasts and NEVER searches the
// filesystem, env files, or any secret store for a private key. It reads
// exactly one named environment variable — `AQUEDUCT_SETTLE_PRIVATE_KEY` —
// and if unset, stops and writes an "awaiting_broadcast" payload instead of
// failing loudly. No key exists in this repo, by design.
//
// Run: `cd atlas && node scripts/prepare-settle-tx.mjs`
// Writes: public/data/aqueduct/settle-payload.json

import { createPublicClient, http, encodeFunctionData, keccak256, toHex, parseUnits } from "viem";
import { baseSepolia } from "viem/chains";
import { writeFileSync, readFileSync } from "node:fs";

const REGISTRY_ADDRESS = "0x3AA739c23615cD7e08D365af851F43c76cdfcc6E";
const ENV_VAR_NAME = "AQUEDUCT_SETTLE_PRIVATE_KEY";

// Minimal ABI fragment — only the functions this script needs (publishIntent
// read-shape + owner() liveness probe). Full source:
// IntentRegistry.sol (see build notes for the sibling repo path).
const REGISTRY_ABI = [
  {
    type: "function",
    name: "publishIntent",
    stateMutability: "nonpayable",
    inputs: [
      { name: "vault", type: "address" },
      { name: "productIdHash", type: "bytes32" },
      { name: "maxPriceUsd", type: "uint256" },
      { name: "quantity", type: "uint256" },
      { name: "expiry", type: "uint256" },
    ],
    outputs: [{ name: "intentId", type: "bytes32" }],
  },
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "usdc", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
];

async function main() {
  const client = createPublicClient({ chain: baseSepolia, transport: http("https://sepolia.base.org") });

  const code = await client.getBytecode({ address: REGISTRY_ADDRESS });
  const live = Boolean(code && code !== "0x");
  const owner = live ? await client.readContract({ address: REGISTRY_ADDRESS, abi: REGISTRY_ABI, functionName: "owner" }) : null;

  let lot;
  try {
    const lotsFile = JSON.parse(readFileSync(new URL("../public/data/aqueduct/lots.json", import.meta.url)));
    lot = lotsFile.lots?.[0];
  } catch {
    lot = null;
  }
  const lotId = lot?.aqueduct_id ?? "aq:unknown";
  const fobEur = lot?.price?.amount ?? 17.0;

  // The intent's economic terms — expressed against the same USDC 6-decimal
  // convention the deployed registry uses. maxPriceUsd here approximates the
  // lot's FOB EUR price in USDC units (SIM FX 1.08, same labeled
  // approximation as the oracle/LotCard modules) purely to produce a
  // realistic, well-formed calldata payload — no live FX feed is claimed.
  const usdApprox = fobEur * 1.08;
  const productIdHash = keccak256(toHex(lotId));
  const vaultPlaceholder = "0x0000000000000000000000000000000000000000"; // no vault contract deployed for Aqueduct this build — publish-side placeholder, NOT a funds-holding address
  const maxPriceUsd = parseUnits(usdApprox.toFixed(6), 6);
  const quantity = 1n;
  const expiry = BigInt(Math.floor(Date.now() / 1000) + 90 * 24 * 3600); // T+90d

  const calldata = encodeFunctionData({
    abi: REGISTRY_ABI,
    functionName: "publishIntent",
    args: [vaultPlaceholder, productIdHash, maxPriceUsd, quantity, expiry],
  });

  const privateKey = process.env[ENV_VAR_NAME];
  const payload = {
    generated_at: new Date().toISOString(),
    chain: "base-sepolia",
    chain_id: baseSepolia.id,
    registry_address: REGISTRY_ADDRESS,
    registry_live_verified: live,
    registry_owner: owner,
    lot_id: lotId,
    function: "publishIntent",
    calldata,
    args: {
      vault: vaultPlaceholder,
      productIdHash,
      maxPriceUsd: maxPriceUsd.toString(),
      quantity: quantity.toString(),
      expiry: expiry.toString(),
    },
    status: privateKey ? "signer_key_present_not_broadcast_by_this_run" : "awaiting_broadcast",
    expected_env_var: ENV_VAR_NAME,
    broadcast_note: privateKey
      ? "A signer key is present in the environment, but this script does not sign or send — broadcasting is a separate, explicit, human-run step outside this build session."
      : `No ${ENV_VAR_NAME} is set. This repo intentionally holds no private key. To broadcast: set ${ENV_VAR_NAME} to a Base Sepolia-funded signer and run the (separate, not-yet-written) broadcast step by hand.`,
    tx_hash: null,
    explorer_url: null,
  };

  writeFileSync(new URL("../public/data/aqueduct/settle-payload.json", import.meta.url), JSON.stringify(payload, null, 2));
  console.log(`registry live: ${live} (owner ${owner})`);
  console.log(`wrote public/data/aqueduct/settle-payload.json — status: ${payload.status}`);
}

main().catch((err) => {
  console.error("prepare-settle-tx failed:", err);
  process.exit(1);
});
