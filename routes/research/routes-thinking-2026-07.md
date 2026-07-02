# Routes — Where It Stands and Where It Goes (thinking doc, 2026-07-01)

> A working synthesis to re-open Routes as an active workstream after the Hermes hackathon.
> Pairs with `apify-x402-agentic-data-rail.md` (new data rail) and the hackathon extraction in
> `hermes-extraction-for-routes.md`. Not a spec — a map of what's real, what's latent, and the
> highest-leverage next moves.

---

## 1. What Routes actually is now (three layers of reality)

Routes has quietly become the most *materialized* of the parallel bets, because the Hermes hackathon built its money spine under a different name (the Acquisition Desk). Three layers:

**Layer A — the design (mature, ~0 code originally).**
`resource-locks-and-routes.md` (917 lines): card movement as a **cost-weighted directed graph**. Nodes = locations (marketplaces, custody vaults, graders, tokenization platforms). Edges = moves with a cost vector `[shipping, taxes, service_fee, insurance]`. **Resource Locks** (from CyberFund's DeFi cross-chain taxonomy) give credible commitments so a solver can act *before* physical settlement confirms. Two intent layers: **Registries** (Layer 1, "acquire card X ≤ $Y") and **Routes** (Layer 2, "move card A→B optimizing cost/time/risk").

**Layer B — the hackathon materialization (real code + real onchain).**
The Acquisition Desk turned the design into a running engine:
- `MarketplaceAdapter` interface — `quoteAcquire` (ranks `landedCostUsd`) / `quoteExit` (max `netProceedsUsd`) / `acquire` / `list` / `confirmSale` (`SPEC.md §3.2.2`), implemented for Beezie (Base/Seaport), Courtyard (Polygon/Seaport), eBay (Browse + browser checkout).
- The **round-trip**: `DISCOVER → BUY below oracle → CUSTODY/SETTLE → LIST at oracle → SALE`. Routes sits across BUY and LIST.
- Live code in this repo: `services/spread-detector.ts` (finds `B > A + fees` across venues), `services/spread-decision.ts` (Nemotron buy/skip with deterministic fallback), `services/routes-plan.ts` (the MDP/expectimax card-state policy solver), `services/fees.ts` (fee model).
- Onchain standards-native contracts (in `slabclaw-vaults`): ERC-4626+7540 vault, ERC-7683 registry adapter, ERC-7578 per-card redemption, an OIF Apache-2.0 solver fork.
- The **D11 autonomy model**: in-cap BUY/LIST commit **autonomously with zero human taps**; the `policy.yaml` cap (`per_card` + rolling `window`) is the *only* firebreak. Human steps remain only on cap-*unbounded* legs no dollar cap can govern (physical ship-out, one-time KYC, one-time eBay OAuth consent).

**Layer C — the settlement rail (declared, partially wired).**
`ROUTES-MECHANICS.md §5.2`: **x402 on Base is the Routes resource-lock settlement rail** (`@x402/fetch` + `ExactEvmScheme`, CDP facilitator); PayGuard `policy.yaml` over `@x402/*@2.14.0`; the `awal` wallet `0x232b…` signs. Circle CCTP moves USDC cross-chain (Base↔Polygon) — **only the settlement currency crosses chains, never the asset** (§5.1).

**The one hard truth Routes is built around** (§5.1): there is **no API and no token bridge to move the physical ASSET cross-custodian** — Beezie(Base) and Courtyard(Polygon) vault NFTs are chain-bound islands, and redeeming *burns* the token. The only cross-custody hook that works is **physical**: eBay-bought card → ship to Courtyard intake → tokenize (~1–2wk mint). So "cross-custodian movement" = a physical, fund-and-go, weeks-long route — honestly shown in-progress, never faked.

## 2. The moat, stated precisely

Per `slabclaw-routes/CLAUDE.md` rule 4 and the desk's DETECTOR framing, the moat is **not** the scrape and **not** the buy. It is:

1. **Route intelligence** — carrier reliability, grading turnaround, customs/tax processing, keep-vaulted availability — the edge weights nobody else models. This is proprietary *accumulated* data, not public.
2. **Landed-cost-aware deal scoring** — the DETECTOR computes opportunity (`spread = B − A − fees` incl. the *route* cost), where incumbents "show data but don't compute opportunity."
3. **The competed sourcing layer** — every incumbent (Courtyard "0% seller," Beezie 6%, Collector Crypt 2%) is a sole market-maker taxing a hidden 10–15% buyback spread; a multi-solver auction structurally compresses it.

This is why the Apify news is *good* for Routes, not threatening: it commoditizes raw ingestion (a low-moat cost center) and leaves all three moat sources untouched. **Outflank, don't scrape.**

## 3. Open threads (from the hackathon GROUNDING-TODOs + gaps)

Carried forward from `ROUTES-MECHANICS.md §10` and the current code state:

| # | Thread | Status | Why it matters for Routes |
|---|---|---|---|
| 1 | Beezie programmatic BUY/LIST on Base (one real low-value `fulfillAdvancedOrder` + `createListing`) | verified read-side; write unproven on mainnet | the featured live same-venue relist-in-place loop |
| 2 | Courtyard buy/list on Polygon (fulfillment_data → seaport-js createOrder) | unproven | the cross-chain autonomous route |
| 3 | CCTP/LI.FI Base→Polygon USDC (one small transfer, confirm landed amount) | unproven | `crossChain:true` quote math in `quoteAcquire` |
| 4 | eBay buyer session + Stripe Issuing capped card + camofox reaches "Confirm and pay" | partially proven in hackathon | the physical BUY leg firebreak (D14) |
| 5 | eBay Sell Inventory USER token (auth-code + one-time consent, NOT business-unit-gated) | bounded TODO | the non-vaulted Path-1 exit |
| 6 | keep-vaulted boolean read from checkout DOM + net-exit recompute when missing | TODO | a hard input to the net-exit model (eBay glitch drops the toggle) |
| 7 | Cap-guard enforcement in the engine `acquire()` path (block-or-commit before staging) | **VERIFIED SOLID 2026-07-01** (§7) | the *only* firebreak — confirmed two-layer, fail-closed, tested |
| 12 | ~~Route-cost oracle absent from the RUNNING engine~~ | **RESOLVED 2026-07-01 (§7)** — engine merged into `slabclaw-routes/engine/`, oracle wired in, 535 tests green |
| 8 | Route-cost oracle populated with real edge weights (shipping/tax/grading-turnaround) | design only | the actual moat; currently `fees.ts` is a flat model |
| 9 | Apify-over-x402 as metered DISCOVER fallback + oracle enrichment | research done (this dir), not wired | resilience for CF-blocked venues + T1 comp fallback |

## 4. The highest-leverage next moves (my read)

Ranked by moat-per-effort, not by demo value (the hackathon is over — build the real product):

**① Make the route-cost oracle real (thread #8).** Today `fees.ts` is a flat `DEFAULT_FEES` model. The moat *is* the edge weights. Start populating real cost vectors: per-venue take rates (known: Beezie ~8%, Courtyard 0% native, eBay sell fee), real shipping rates (Shippo MCP already wired — mint SAMPLE labels for rate quotes), grading turnaround distributions (PSA Value paused since 2026-06-02, ~10M backlog — this is a live, proprietary-ish signal), and keep-vaulted/tax deltas. Feed these into `routes-plan.ts` so `quoteAcquire`/`quoteExit` optimize over *landed* cost, not listing cost. **This is the single most differentiating thing Routes can do.**

**② Close one real onchain round-trip (threads #1–3).** The hackathon proved a $5 eBay buy end-to-end but the tokenized Seaport round-trip on mainnet is still unproven write-side. One real low-value Beezie `fulfillAdvancedOrder` + `createListing` closes the "does the money actually move autonomously" question for good and de-risks everything above it.

**③ Wire the DISCOVER resilience layer (thread #9, Apify).** Cheapest insurance against the recurring CF/proxy failures (Decodo died yesterday). Add Apify as the metered tail of the cascade + A/B the eBay-sold Actor as the T1 comp fallback. Route spend through PayGuard's cap.

**④ Verify the cap firebreak is code, not prose (thread #7).** Per memory `feedback_human_gate_must_be_enforced` — a gate any HTTP client can resolve is not a gate. The D11 model puts *all* the safety on the `policy.yaml` cap in the `acquire()` path. That code path must fail-closed and be traced, before any unattended run.

## 5. Bigger-picture questions worth opening

These are strategy prompts, not tasks — the "let's think more about routes" part:

- **Is Routes a product or a moat feature?** It can ship as (a) a standalone logistics/arbitrage desk (the hackathon framing), or (b) a scoring enrichment that makes the core SlabClaw app's Deals tab landed-cost-aware (`CLAUDE.md` cross-dep rule 1). Both are valid; they imply different roadmaps. My lean: **(b) first** (route-aware deal scoring is immediately useful to the existing app and needs no custody), **(a) as the tokenized-arb layer on top** once the onchain round-trip is proven.
- **Where does the multi-solver auction actually earn?** The competed-sourcing thesis is the real differentiator vs incumbents, but it needs *multiple real solvers* bidding, which needs liquidity (4K/RealWorld validated the model but died on liquidity). Is the near-term version a single first-party solver (us) that *proves* the spread compression, with the auction as the scaling story?
- **What's the demand signal?** Routes optimizes *how* to move and *whether* the spread clears — but not *what to chase*. The Apify social-sentiment rail (§6 of the Apify doc) is the first candidate for a real what/when-to-acquire input. Worth a cheap experiment.
- **Physical vs tokenized split.** The tokenized round-trip is instant and clean but low-margin (arb on liquid commons). The physical raw→graded route is high-margin (~2.1× ex-tail per `PHYSICAL-GOODS-ECONOMICS`) but weeks-long and capital-locked. Routes' real value may be **routing capital between these two regimes** based on grading-backlog state — a dimension no incumbent models.

## 6. Immediate to-do (concrete, this-week-able)

- [x] **Build the route-cost oracle as MARKETPLACE POLICIES** — DONE 2026-07-01 (boiled).
  `services/route-costs.ts` — a `MarketplacePolicy` per venue is more than a fee: economics + chain +
  settlement rail + asset class + custody model + **cross-custodian movability** (tokenized = chain-
  bound island) + execution **autonomy** + provenance. Delivered:
  - Sourced take-rates for 11 venues, **all confirmed live 2026-07-01** (PSA Regular $79.99 / Value
    PAUSED, BGS $14.95-124.95, Alt tiered 14/9/7/5%, Fanatics 6%, USPS shipping+insurance schedule).
  - Tiered fees (eBay >$1k singles ~6.6%, Alt price bands), value-aware USPS shipping + insurance,
    sales tax (redemption-only), round-trip grader shipping (both legs insured).
  - `bestExit`/`quoteExit` (net-maximising exit; tokenized can only relist-in-place, §5.1) +
    `landedCeilingUsd` (route-aware acquisition ceiling).
  - Wired into `spread-detector.ts` (per-venue landed cost by default) + `routes-plan.ts` (all magic
    constants sourced). `fees.ts` superseded to flat fallback. **85/85 tests green** incl. the moat
    property (Courtyard nets +$15.96 vs Beezie +$6.46 on the same $100→$118) + best-exit + policy
    fields. Architecture updated: `CLAUDE.md`, live `/admin#architecture` page.
  - REMAINING (minor): the few ESTIMATE-tagged fields (PSA "economy" alias, auction buyer premiums);
    optional live Shippo rate quotes to replace the USPS-schedule model.
- [x] A/B `caffein.dev/ebay-sold-listings` (Apify) vs our PC-sold oracle — DONE 2026-07-01
  (`apify-x402-agentic-data-rail.md §11`). Verdict: real grade-matched comps but ±15-30% window/config
  noise on mid-value cards (+0.8% on high-value) → adopt as a T6 last-resort sanity band, NOT a
  precision T1 replacement. Would poison T1 if fed blind.
- [ ] Trace the `acquire()`-path cap guard in the engine; confirm it blocks-or-commits before staging and fails closed (thread #7).
- [ ] One real low-value Beezie mainnet `fulfillAdvancedOrder` + `createListing` to close thread #1.
- [ ] Decide product framing (§5, question 1) — route-aware deal scoring vs standalone desk — and write it into `slabclaw-routes/CLAUDE.md`.

## 7. Cap-guard audit + the engine merge (2026-07-01)

**Cap firebreak — VERIFIED SOLID (two independent layers, fail-closed, tested).** Traced the D11 cap
end-to-end in the engine:
- **Orchestrator** (`engine/services/orchestrator.ts:806-859`): resolves `perCardCapUsd` from
  `policy.yaml`; `typeof cap !== "number"` → `blocked-no-cap` **fail-closed** (`:808`); `landedCost >
  cap` → blocked **before any send** (`:818`); rolling window envelope guard (`:829`); prod-mode →
  `approved-pending`, never stages a real buy (`:843`); only then `acquire({maxUsd: cap})`.
- **Beezie adapter** (`engine/lib/adapters/beezie.ts:476-485`): re-enforces `MIN(maxUsd, spendCapUsd)`,
  **re-parses the tx calldata and re-sums the USDC consideration** against the cap (doesn't trust the
  quote), fails closed if a signer is present with no resolvable cap.
- **Policy loader** (`engine/lib/policy.ts:111-133`): missing file/key → `undefined` cap → fail-closed.
- **Tests**: `engine/test/orchestrator.test.ts` AC3 + the synth-sim (over-cap + window firebreak fire,
  determinism) — all green (535-test suite).
- **`routes-api.mjs` `/api/routes/execute`** is a **pure `/routes` dashboard SIMULATION** (scripted
  events, hardcoded P&L, decorative animation gate) — not a real-money bypass. The real gate is the
  fail-closed email magic-link on `desk-api-prod`.

**The engine merge — DONE (Pat's call: "grab it and bring it into the routes part of the monorepo").**
`slabclaw-acquisition-desk/` was a hackathon-time split (its own public repo, gitignored here). The
running engine (orchestrator + adapters + policy + custody + pnl) is now folded into
`slabclaw-routes/engine/` + `slabclaw-routes/hermes-plugin/` (tracked in the monorepo; node_modules /
`.env` / `.mov` / contracts excluded). The route-cost oracle is now wired into the engine that actually
runs: `route-costs.ts` in `engine/services/`, per-venue pricing in `spread-detector.ts`, sourced
constants in `routes-plan.ts`. **535/535 engine tests green.** The oracle now influences the real
acquire decision. (Open follow-up: wire `landedCeilingUsd`/`bestExit` directly into the orchestrator's
cap + exit selection — the adapters currently own landed cost; the oracle informs the detector/planner.)

---

*Companion docs: `apify-x402-agentic-data-rail.md` (the new pay-per-use data rail), `hermes-extraction-for-routes.md` (durable routes material mined from the hackathon corpus), `resource-locks-and-routes.md` (the founding design).*
