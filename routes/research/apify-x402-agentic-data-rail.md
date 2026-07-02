# Research — Apify over x402 as a Pay-Per-Use Data Rail for Routes

> **Status:** research + live-verified proof-of-concept (2026-07-01). Not yet wired into the engine.
> **Source article:** Apify blog, "Your AI agent just got 20,000+ new tools on x402" (Štěpán Škopek, 2026-06-30) — `apify.it/x402-awal`.
> **Relevance to Routes:** high. x402 is *already* the declared Routes settlement rail (`hermes-hackathon/ROUTES-MECHANICS.md §5.2`), and the acquisition agent already signs with the same `awal` wallet. This makes Apify a native extension of the desk, not a new integration.

---

## 0. TL;DR for Routes

The acquisition agent can now **discover, pay for, and run 20,000+ web-scraping/automation tools ("Actors")** by paying **USDC on Base over x402** — no Apify account, no API key, no proxy of our own. It buys one small **spend-capped prepaid token** ($1 = many runs), then runs Actors against it. The anti-bot / Cloudflare / residential-proxy problem that Routes' automation toolbox (`ROUTES-MECHANICS.md §6`, ranks our `turnstile.mjs` #1) exists to solve becomes **someone else's job, metered by the row.**

Three fits, in priority order:
1. **DISCOVER-leg fallback** — a paid escape hatch for CF-blocked venues (Cardmarket, Beezie native) that feed the `spread-detector` DETECTOR.
2. **Route-cost / oracle enrichment** — pay-per-use sourcing of sold comps, pop data, and new venues (MySlabs) to sharpen `quoteAcquire`/`quoteExit` landed-cost math.
3. **New demand signal** — social sentiment (X/Reddit) as a *what/when to acquire* input the desk does not have today.

**It is a fallback + capability-extender + prototyping tool — not a replacement for the in-house engine** (cost at scale + community-Actor reliability rule that out). The moat stays where it always was: identity resolution + the oracle hierarchy + the Routes decision layer. Apify only commoditizes raw ingestion — which *strengthens* the "outflank, don't scrape" thesis.

---

## 1. What Apify is

Apify is a **serverless web-scraping / automation cloud**. The unit of work is an **Actor** — a Dockerized scraper you invoke over plain REST, running on Apify's infrastructure with **their residential/datacenter proxy pool and anti-bot handling built in**. The **Apify Store** is a marketplace of 20,000+ Actors (many community-built), priced pay-per-result / pay-per-event / monthly-rental.

The historical friction was never the scrape — it was the *account*: signup, API token, billing, credit top-ups, secret rotation. **x402 removes the account entirely.** The server declares a price at request time (HTTP 402), the agent's wallet signs a USDC payment, the call retries and runs. As of 2026-06-30 Apify put its whole catalog on that rail (~10× the ~2,000 tools x402 had before).

## 2. The x402 mechanism (how the payment works)

- `POST` an Actor endpoint with no creds → server returns **HTTP 402** with a base64 `PAYMENT-REQUIRED` challenge listing accepted schemes, in USDC on Base (`eip155:8453`).
- **`exact` scheme** (x402 v1): fixed price up front. Apify layers a **$1.00 prepaid deposit + refund** on top — sign an EIP-3009 `TransferWithAuthorization`; unused balance refunded after 60 min idle. *Caveat: metering is off-chain against that balance — a trust assumption in Apify's bookkeeping.*
- **`upto` scheme** (x402 v2, the one Apify leads with): sign a Permit2 `permitWitnessTransferFrom` authorizing a **ceiling**; the service charges only actual usage, zero up to the cap. Best fit for variable-cost batch scraping.
- One signature stays valid while the prepaid balance lasts — reused across calls, no new signing until it runs out.

The **`upto`/allowance** shape is conceptually identical to the Routes **resource-lock** primitive (`resource-locks-and-routes.md §3`): authorize a maximum, settle the real cost on completion. Apify's x402 integration is, in effect, a resource lock over an API call.

## 3. Live proof (executed 2026-07-01, this session)

Ran the full rail end-to-end from the `apify-x402-agentic-wallet` skill, on the **same `awal` wallet the acquisition desk uses** (`0x232b0056ca0616CF49b33Beb5C3aA131566A05c2`):

| Step | Result |
|---|---|
| Wallet auth (`npx awal status`) | Authenticated as pat@ecofrontiers.xyz; Base wallet funded (USDC $40.02, ETH 0.00304) |
| Buy prepaid token (`awal x402 pay …prepaid-tokens?amount=1`) | **201 Created** — token, $1.00 balance, expires 2026-07-15 |
| Run Actor (`scrap_them_all/cardmarket-pokemon-trend-scraper`, 12 results) | 12 real Cardmarket trending cards returned; **cost $0.004** (balance $1.0000 → $0.9960) |

The Cardmarket Actor ran the scrape **through Apify's residential proxies** — the exact CF-gated source our Decodo proxy died on (2026-07-01, see SlabClaw memory `project_cm_proxy_tiered_cascade`), returned in ~seconds, for less than half a cent, with no solver of ours involved.

## 4. Actors that map onto Routes' venues / oracle

Store search surfaced Actors aimed at our exact targets (health = user/run counts; ⚠️ = thin, validate before trusting unattended):

| Actor | Routes use | Health | Price |
|---|---|---|---|
| `scrap_them_all/cardmarket-pokemon-trend-scraper` | Cardmarket DISCOVER (dead-proxy replacement) | ⚠️ 16 users | $1 / 1k results |
| `caffein.dev/ebay-sold-listings` | Oracle **T1 sold comps** → `landedCostUsd`/`netProceedsUsd` | ✅ 229k runs | $4 / 1k results |
| `jungle_synthesizer/cgc-cards-population-report-scraper` | CGC pop → grade-matched value | ⚠️ 4 users | per-event |
| `jungle_synthesizer/myslabs-graded-cards-marketplace-scraper` | **New venue node** (not scraped today) | ⚠️ 7 users | per-event |
| `apidojo/tweet-scraper` | Demand/hype signal (§6) | ✅ 150M runs | ~2,500 posts / $1 |
| `trudax/reddit-scraper-lite` | Demand/hype signal | ✅ 3.6M runs | cheap |
| `compass/crawler-google-places` | (generic; unlikely for cards) | ✅ 486k users | ~250 / $1 |

## 5. Where it slots into the Routes architecture

Routes is a cost-weighted logistics graph over `MarketplaceAdapter` (`quoteAcquire`/`quoteExit`/`acquire`/`list`/`confirmSale`, `hermes-hackathon/SPEC.md §3.2.2`), fed by the live oracle DETECTOR (`services/spread-detector.ts`). Apify-over-x402 touches three seams:

**(a) DISCOVER-leg fallback — the immediate win.**
`ROUTES-MECHANICS.md §0` decision rule: `API → our patchright+turnstile → Hermes browser → STOP`. Add a metered tier: `… → Apify Actor over x402 → STOP`. When our in-house CF solver is blocked on a read (Cardmarket, Beezie native), the agent pays ~cents to get the listings rather than dropping the venue. Slots behind `detectSpreads()` / `fetchLiveDeals()` in `services/spread-detector.ts` as a source of last resort, **with a validation guard** (a 4-user Actor can return garbage or vanish).

**(b) Route-cost & oracle enrichment.**
`quoteAcquire` ranks on `landedCostUsd`; `quoteExit` maximizes `netProceedsUsd`. Both are only as good as the comp/fee data behind them. The eBay-sold Actor (battle-tested) is a clean **fallback for oracle T1 sold comps** when eBay Browse 429s (memory: spike-throttle, 5000/day). Pop Actors (CGC/MySlabs) extend census coverage. This directly sharpens the numbers the `routes-plan` MDP optimizes over.

**(c) Settlement-rail composability — the strategic fit.**
`ROUTES-MECHANICS.md §5.2` already declares **"x402 IS the right rail for OUR agent-to-API / Routes resource-lock settlement"** (`@x402/fetch` + `ExactEvmScheme` on `eip155:8453`, CDP facilitator), and `ROUTES-PRD.md` wires PayGuard + `awal` over `@x402/*@2.14.0`, wallet `0x232b…`. **Apify-over-x402 uses that exact rail.** The agent that acquires cards can now pay for the data it needs to *decide* on the same wallet, same protocol, same spend-cap firebreak. One treasury, one policy envelope, priced-in as an operating input alongside grading and shipping. This is the "composability of vendor endpoints" the Apify article sells — and Routes is already built for it.

## 6. New capability — social sentiment as a demand signal

The article's marquee use case is *trading signals from social data*: price feeds tell you what happened; live X/Reddit conversation tells you **why, before it's priced in**. Routes today decides *how to move* a card and the desk decides *whether the spread clears fees* — neither has a **what/when-to-acquire demand signal**. At ~2,500 X posts per $1, a `tweet-scraper` pull on a grail (or on a set catching a hype wave — a video feature, a pop-report shift going viral) is a cheap leading indicator that could feed the Nemotron BRAIN's buy/skip step (`services/spread-decision.ts:decideBuySkip`) as an extra feature. Experimental, but genuinely additive.

## 7. Economics — why fallback, not primary

- Cardmarket trends: **$1 / 1,000 results.** eBay sold: **$4 / 1,000.** Tweets: ~$0.0004 each.
- A full 420-product registry scan pulling ~30 eBay sold comps each ≈ 12,600 results ≈ **~$50/scan** on Apify. Too expensive as the primary rail; perfectly reasonable as a **break-glass fallback** and as a way to **validate a new source before building it in-house**.
- Ordering is dictated by cost: our own (free-ish, rate-limited) rail first; Apify only when blocked or when the source doesn't exist in-house yet.

## 8. Risks & guardrails

- **Community-Actor reliability.** The ⚠️ thin Actors (4–16 users) can be abandoned or return malformed data with no warning. Treat as on-demand-with-validation only; never an unattended production dependency. Prefer battle-tested Actors (eBay-sold, tweet, reddit).
- **Off-chain metering trust** (`exact` scheme). Fine for a scraper; note it before it ever touches real-money accounting.
- **Shared hot wallet.** `0x232b…` holds real USDC and is the acquisition buy rail. The Apify article's own security disclaimer restates SlabClaw memory `feedback_verify_wallet_control_before_funding`: treat as a low-balance hot wallet, never fund from main, assume a compromised/hallucinating runtime could drain it. **Do not put unattended Apify calls behind this wallet until there is a per-loop spend cap** — which is exactly what PayGuard `policy.yaml` (`per_card` + rolling `window`) already provides. Route Apify spend through the same cap.
- **Provenance / ToS.** Same "reads from onchain / public data only, never a first-party private API" discipline the desk already applies (`LEGAL-IP` D5) carries over — an Actor scraping a venue is subject to that venue's ToS.

## 9. Concrete next steps (ranked)

1. ~~**A/B the eBay-sold Actor vs our T1 sold-comp scraper.**~~ **DONE 2026-07-01** — see §11.
2. **Wire Apify as the metered tail of the CM DISCOVER cascade** (`patchright → tinyfish → unverified → Apify`), behind a validation guard — immediate relief for the dead Decodo proxy.
3. **Prototype the social-sentiment feature** — one cheap `tweet-scraper` run on a vintage grail; check whether conversation volume leads price; if so, add as a feature to `decideBuySkip`.
4. **Route all Apify spend through PayGuard `policy.yaml`** so the same cap firebreak that governs card buys governs data buys. Never behind an uncapped wallet.

## 11. A/B result — `caffein.dev/ebay-sold-listings` vs our PC-sold oracle (2026-07-01)

Ran the eBay-sold Actor grade-matched against three high-confidence PC-sold oracles from the live
engine (`/api/deals/listings`, `pc_sold`, high-conf, ≥3 sold). Filtered Actor output to grade-matched
titles (name word-boundary + exact `PSA <n>`, dropped lots/reprints), took the median.

| Card (our oracle) | 90d soldPrice median | 30d soldPrice | 30d +ship, no-BO/auction |
|---|---|---|---|
| Poliwrath BS2 PSA 9 ($118.18) | $100.00 (−15%) | $147.74 (+25%) | $140.50 (+19%) |
| Vileplume Jungle PSA 7 ($64.77) | $52.61 (−19%) | $48.97 (−24%) | $44.99 (−31%) |
| Shining Charizard Neo Destiny PSA 1 ($1274.67) | $1285.00 (**+0.8%**) | — | — |

**Findings.** The Actor works cleanly — real confirmed sold prices (`soldPrice`/`totalPrice`,
`isBestOfferAccepted`, `endedAt`), correctly grade-matched, via Apify's proxies, ~$0.01/card. BUT the
median is **window/config-sensitive**: Poliwrath swings −15%→+25% just between a 90-day and 30-day
window; shipping and best-offer/auction handling shift it another ±10%. High-value low-pop cards land
near-exact (+0.8%) because their sales are distinct; mid-value cards carry ±15-30% noise (inherent
eBay-sold variance — our own PC oracle draws from the same underlying sales, on a thinner 3-5 comp
sample).

**Verdict: adopt as a LAST-RESORT fallback / sanity band, NOT a precision T1 replacement.** Blindly
feeding this median into T1 would inject ±20% oracle noise (the poisoning class SlabClaw memory warns
about). To use it as a fallback: replicate our oracle's exact filters (30-day window, grader-matched,
`totalPrice` incl. shipping, best-offer/auction policy) and treat it as a wide sanity band, not a point
estimate. Slot at ~T6 ("eBay active/sold fallback"), gated behind the in-house PC/CF sold tiers.
Total A/B spend: ~$0.05 of the $1 Apify token.

## 10. References

- Apify article: `apify.it/x402-awal`; skill: `apify-x402-agentic-wallet` (verified `awal` v2.12.0, Base).
- Apify API: `https://docs.apify.com/api/v2`; x402: `https://docs.apify.com/platform/integrations/x402`; AGI endpoint: `https://agi.apify.com`.
- Routes settlement rail: `hermes-hackathon/ROUTES-MECHANICS.md §5.2`, `ROUTES-PRD.md` (PayGuard/awal/x402 rows).
- Resource-lock ≈ x402 `upto`: `slabclaw-routes/resource-locks-and-routes.md §3`.
- SlabClaw memory: `project_cm_proxy_tiered_cascade`, `feedback_verify_wallet_control_before_funding`, `project_autonomous_buy_execution`.
