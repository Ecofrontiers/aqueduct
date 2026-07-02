# SlabClaw Routes

The onchain Acquisition Desk for graded cards: a vault holds USDC for one card SKU and pays competing solver agents to source, grade, custody, and deliver it — settled onchain.

A single Hermes plugin. The planner computes a conditional movement policy over the card-state graph; competing solvers bid each hop; the registry escrows the intent and releases payment on a verified fill. The planner and the solvers are the only net-new logic — everything else is config, an installed dependency, a sponsor primitive, a first-party MCP, or the OIF fork.

> :::note
> This plugin orchestrates a real escrow lifecycle against tested contract internals. The escrow chain runs on Base Sepolia (rehearsal); the shipping label runs in Shippo SAMPLE mode. The card, the cert, the onchain Seaport listing data, and the oracle prices are real.
> :::

---

## What it does

| Capability | Mechanism |
|---|---|
| Plan a card's movement as a conditional policy | `routes_plan(intent)` — in-process TypeScript bounded expectimax over the card-state MDP (not a shortest path) |
| Find the arbitrage spread | The live SlabClaw cross-marketplace oracle (10+ marketplaces) feeds `spread-detector.ts`; the Nemotron buy/skip brain gates it |
| Compete the source→grade→custody→deliver hops | Heterogeneous solver agents bidding per hop over the OIF-forked solver loop |
| Escrow and settle each hop | `IntentRegistry` escrow fronted by `Registry7683Adapter` (ERC-7683); pull-payment release on `verifyFill` |
| Prove the grade | QR decode → fetch the public TAG DIG report URL → match; Nemotron Nano-2-VL for identity judgment |
| Pay the money loop | Stripe collects realized proceeds + performance fee and pays out depositors; x402 on Base settles solver fees |
| Human authorization on irreversible hops | `kanban_block` firebreak + Telegram one-tap approve |

---

## Quick start

```
# 1. Install the plugin (already in ~/.hermes/plugins/slabclaw-routes/)
hermes plugins list                    # confirm slabclaw-routes is discovered

# 2. Bring up the profiles (planner + 4 solver/executor roles)
hermes profiles list

# 3. Run the planner against an acquire intent
hermes --profile planner
> routes_plan for the 1999 Base Set Charizard #4 PSA-target

# 4. Watch the board (the live ops command center)
#    The always-on daemon renders the live kanban from kanban_db,
#    served behind basic-auth on <backend-host> — open the dashboard URL.

# 5. Approve the irreversible hop when the gate pulses — one-tap in Telegram
```

> :::tip
> The kanban dashboard is the demo. The always-on daemon renders the board from `kanban_db` behind basic-auth; each hop is a Kanban task, and `kanban_block` parks the irreversible Vault/Tokenize/Redeem hops behind a human gate approved one-tap over Telegram. The human authorizes; the agents execute.
> :::

---

## What's native (Hermes) vs what we built

Source-tier preference: sponsor-native primitive > installed dep > maintained OSS / first-party MCP / standard EIP interface > must-build.

| Concern | Source | Detail |
|---|---|---|
| Orchestration (planner→solvers DAG) | Hermes-native | Kanban `kanban_create(parents=[...])` route-DAG + async sub-agents; durable/resumable/auditable |
| Per-solver attenuation | Hermes-native | Profiles + `toolsets[]` + per-MCP `tools.include` allowlists |
| Human-in-the-loop firebreak | Hermes-native | `kanban_block(reason)` + Telegram one-tap approve |
| Scheduling / re-plan watchdog | Hermes-native | `cronjob` |
| Solver runtime (monitor→rules→fill→settle) | OIF Apache-2.0 fork | `BootNodeDev/intents-framework` `typescript/solver/`, Hyperlane stripped, `acquisition7683/` added |
| Onchain settlement rail | Installed dep | x402 on Base (`@x402/*@2.14.0`), CDP facilitator, BaseScan receipt |
| Agent signer wallet | Installed dep | Coinbase Agentic Wallet (`awal`) on Base |
| Tokenized acquisition leg | Installed dep | `@lifi/sdk` routed call + onchain Seaport reads |
| Shipping | First-party MCP | Shippo MCP (`@shippo/shippo-mcp`), SAMPLE labels, buy-label gate |
| Grade verify | HTTP + sponsor API | QR → public TAG DIG report match; Nemotron Nano-2-VL identity judgment |
| Buy/skip decision brain | Sponsor API | NVIDIA Nemotron via NIM — the single brain for every agent, always-on 24/7 on <backend-host>, no Opus/OpenRouter |
| Fiat money loop | Sponsor API | Stripe collect / Connect payouts / agentic-commerce operating spend |
| **MDP policy solver `routes_plan`** | In-process | In-process TS bounded expectimax over the card-state graph |
| **`acquisition7683/` solver** | **Must-build** | ~150–250 LOC over the OIF fork, watching the adapter `Open` event |
| **Settlement MCP** | **Must-build** | Over the ERC-7683 adapter |
| **Beezie onchain-Seaport adapter** | **Must-build** | Chain-state reads, never the marketplace API |
| **Payment ↔ card-state binding** | **Must-build** | Ties a Stripe charge / USDC transfer to a specific verified fill |
| **Arbitrage earn-engine glue** | **Must-build** | Spread → buy/skip → sell-leg → Stripe payout |

---

## Proof it runs

The full acquire→grade→settle→redeem loop ran end-to-end on **Base Sepolia** (chain 84532) — 10/10 legs PASS, money conserved (system net Δ = 0.00 USDC). The on-camera escrow lifecycle is this same flow.

The canonical live deploy is the **3-contract money path** that `DeployVault.s.sol` produces and that the frontend (`app/src/lib/chain.ts`) and plugin loop-state actually read. Keeping the real-money deploy to this surface is the audit `#27` mitigation — the mainnet run touches only audited, money-bearing code (verify on BaseScan):

| Contract | Address |
|---|---|
| SlabClawVault (ERC-4626 + 7540, the headline) | [`0x013f4b4bbbf8dace5cAa55d6284E272Fd2862636`](https://sepolia.basescan.org/address/0x013f4b4bbbf8dace5cAa55d6284E272Fd2862636) |
| VaultFactory | [`0xDC3893D03765CC8Ee8a730b7E02e85F0222FEdC6`](https://sepolia.basescan.org/address/0xDC3893D03765CC8Ee8a730b7E02e85F0222FEdC6) |
| MockUSDC (escrow asset, 6dp — testnet only; mainnet uses real Base USDC) | [`0x20c0F8AD9E3784C0340CaaE964047611c2B3088B`](https://sepolia.basescan.org/address/0x20c0F8AD9E3784C0340CaaE964047611c2B3088B) |

The parked OIF/escrow contracts (`IntentRegistry`, `Registry7683Adapter`, `SolverRegistry`, `SlabClawRedeemable7578`) are deployed by the separate `Deploy.s.sol` and are intentionally **off** the money path — they never run in the `#27`-bounded mainnet deploy, so they are not listed in the canonical money-path set above.

`verifyFill` was signed by the owner key (`0x3D70…b6b8`), distinct from the SOLVER key (`0x0D4F…A61A`) that submitted the fill — the executor/judge separation holds onchain, not just on the board. Full per-leg tx receipts in `E2E-REHEARSAL-REPORT.md`.

---

## Standards lineage (interface-compatible, not ours)

We expose real EIP interfaces over verified, tested internals. These standards are interface-compat anchors, not authored here:

- **ERC-4626** — tokenized vault (OpenZeppelin audited base)
- **ERC-7540** — async redeem extension
- **ERC-7578** — per-card real-world-asset redemption
- **ERC-7683** — cross-chain intent open/resolve/fill (OIF legacy-draft), spoken by the forked OIF solver
- **ERC-8004 / ERC-8128 (SIWA)** — onchain solver authentication
- **OIF** — Open Intents Framework solver scaffold (Apache-2.0 fork; LICENSE kept, NOTICE added, modified files marked)

Never ship the raw unaudited MIT ERC-7540 reference impl; never fork a copyleft live solver (UniswapX/CoW/Across/DLN).

---

## Limits / not-yet

- **No grader submission API exists anywhere.** Grading and custody have no API. We model the cost in the planner and prove the outcome against TAG's public DIG report — we do not call a grading service.
- **Escrow runs on Base Sepolia (rehearsal).** The on-camera escrow lifecycle is the testnet rehearsal of the real `IntentRegistry` flow.
- **Shipping labels are SAMPLE mode.** Shippo test labels are watermarked "SAMPLE – DO NOT MAIL"; the buy-label confirmation gate is real.
- **No marketplace API reads.** Beezie/Courtyard data comes from onchain Seaport order data and chain state, never `api.beezie.com` or the OpenSea API (ToU-banned).
- **Live on-camera Redeem is staged.** Beezie Redeem is web-only and irreversible; the demo shows a scripted path behind a `kanban_block` gate.
- **NemoClaw egress sandbox is demo-optional.** The always-on guardrail is the SOUL.md restrictions + profile attenuation + the external-approval stamp; NemoClaw is the additional egress firewall.
