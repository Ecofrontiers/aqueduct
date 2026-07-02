# D19 — Plug in your own item type / marketplace / price source

> **Who this is for:** someone using Hermes (by Nous) who has copied the SlabClaw Acquisition
> Desk and wants to point the **same** find → decide → buy → verify → pay loop at a *different
> kind of item* (comics, sneakers, watches, sealed boxes, art, domains), a *different
> marketplace*, and a *different price source* — **without touching the core, the Hermes
> system, or the part that controls the money.**
>
> **We show this works, we don't just claim it.** Graded Pokémon cards are example #1. A second,
> fully working item type — **graded comics (CGC/CBCS key issues)** — already runs through the
> exact same engine, unchanged. You can run the proof yourself:
>
> ```bash
> node --experimental-strip-types engine/sim/run-comics.ts        # 200 comics, same orchestrator
> ```
>
> Read `engine/sim/comics.ts` (the comics version of the swap-in pieces) and
> `engine/sim/ADR-0001-commodity-agnostic-seams.md` (why it's built this way) alongside this
> guide. They are the worked example for every step below.

---

## 0. The big picture — three swap-in points, and one part you never touch

The desk is built in layers (called "rings" here), so changing it to handle a new item type means
**swapping in a piece, not rewriting the core.**

```
RING 3  product wiring        ← you write a tiny config + connect your swap-in pieces at startup
RING 2  adapter interfaces    ← THE 3 SWAP-IN POINTS (you write these, do NOT edit them)
        DealsAdapter · OracleAdapter · MarketplaceAdapter
RING 1  orchestrator          ← AcquisitionDeskOrchestrator — UNCHANGED, works for any item type
RING 0  trust line            ← the trusted manager holds the keys, verifies work, releases money
```

Here's what you add or swap to point the desk at a new item type:

| Layer | File(s) you ADD / SWAP | What it is |
|---|---|---|
| **Engine swap-in pieces** | a `DealsAdapter`, an `OracleAdapter`, a `MarketplaceAdapter` | the 3 swap-in points — where you find deals, where you get fair value, and where you buy/list/move the item |
| **Item config** | a `CommodityConfig` object | what the item is called, who verifies it, which marketplaces, and storage labels (used for on-screen text and for spotting when an item must change hands) |
| **Hermes worker profile** | a new `skills/<your>-authenticate-solver/SKILL.md` | the general "verify the item" step, pointed at your kind of proof |
| **Worker permission limits** | a section in `profiles/routing.yaml` (+ a SOUL note) | the strict list of tools the new worker is allowed to use, enforced by the system |
| **On-screen item picture** | `registerItemRenderer("<commodity>", …)` in `app/src/components/itemRenderers.tsx` | how your item looks on screen (the only card-specific thing in the app) |

What you **never** touch: `engine/services/orchestrator.ts` (RING 1 — the core), the `defaults.hard_bans`
in `routing.yaml` (the things every worker is banned from), and the trusted manager's profile (RING 0). The
core already works for any item type because you hand it your swap-in pieces at startup — it reads them and
never assumes "card" or fetches anything on its own (see ADR-0001).

> **The field names in the code still say `cardId` / `listingGrade` / `psa-vault`.** That's
> honest and on purpose (ADR-0001 §Consequences): the *existing* interface already carries a
> second item type with no changes. For comics, `cardId` holds the comic's id and
> `grade`/`grader` hold `"CGC 9.4"`. The engine treats these as a generic id plus a generic
> quality score — it never assumes "card". Renaming `cardId` to `assetId` would be nice but is a
> separate job owned by another team — noted, but not needed to ship a new item type.

---

## 1. Swap-in point #1 — where you FIND DEALS (`DealsAdapter`)

**What it answers:** *what items are for sale below their value, right now?*

The interface (`engine/lib/adapters/index.ts` §2.5b):

```ts
interface DealsAdapter {
  getDeals(query?: DealQuery): Promise<DealRecord[]>;   // the ONLY fetch to your listing feed
}
```

You write `getDeals` so it reads from **your** source of listings — your own scraper, a partner's
data feed, an exchange's API, or a fixed test list. Each listing (a `DealRecord`) carries:

- **identity:** `cardId` (your item's id) / `id` (a fallback id from the marketplace)
- **the asking price side:** `listingPlatform`, `listingPrice`, `listingGrade`, `listingUrl`
- **the fair value, passed through exactly as given:** `oraclePrice`, `oracleSource` (which
  trust tier it came from), `oracleConfidence`, `stale`, `oracleUrl`, `oracleSoldCount` —
  **passed through, never re-calculated** (rule P3).

**Examples to copy:**
- Cards (LIVE — really happening): `engine/lib/adapters/deals.ts` — the one place that fetches
  `GET ${SLABCLAW_API_URL}/api/deals/listings`.
- Comics (MOCK — a synthetic offline demo): `ComicsDealsAdapter` in `engine/sim/comics.ts` —
  returns a fixed made-up list and uses no network.

**Honesty rule (P7):** mark your piece `mode = "live"` or `"mock"` so it's clear which it is.
Never make up listings, marketplaces, or prices. If there's nothing for sale, return an empty
list (`[]`) — never invent a deal.

---

## 2. Swap-in point #2 — the FAIR VALUE (`OracleAdapter`) — and treat it as a **SUSPECT**

**What it answers:** *what is each item worth, and how much should I trust that number?*

The interface (`engine/lib/adapters/index.ts` §2.5):

```ts
interface OracleAdapter {
  getDeals(productId?: string): Promise<OracleRecord[]>;
  getOracleInputs(i: {productId; grade; grader}): Promise<OracleInputs | null>;  // for BUY/SKIP
}
```

Swap this to point at **your** value source: a watch price guide, a sneaker price index, a comics
sold-price database, or a set of art sale comparisons. The hard rule:

> **P3 — treat the fair value as a SUSPECT, not as gospel.** The engine *trusts it less* when it's
> from a weak source, old, or backed by few sales — and it **never re-calculates the value
> itself**. Your piece must *show where the number came from*: which trust tier (`OracleTier`),
> how recent it is (`OracleFreshness`), how many past sales back it (`oracleSoldCount`), and
> whether those sales were at the same grade. If you have no value, return `null` — be honest,
> don't guess a price.

The tier names (`pc_sold` … `ebay_active`) are SlabClaw's own ranking of price sources for cards.
A different item type **maps its own sources onto these tiers** — the engine only cares about the
*order* (a price from matching graded sales beats an estimate, which beats a current asking price)
and how recent it is, not the exact label. Any source it doesn't recognize MUST be treated as the
**least trustworthy** tier (`normalizeTier` in `engine/lib/adapters/oracle.ts` does exactly this —
never over-trust a source you don't know).

**Examples to copy:**
- Cards (LIVE): `engine/lib/adapters/oracle.ts` — reads the live feed and works out *how much to
  trust the value* (from its tier, label, freshness, and number of past sales), and never changes
  the price itself.
- Comics (MOCK): `ComicsOracleAdapter` in `engine/sim/comics.ts` — a fixed lookup table of
  values by id.

---

## 3. Swap-in point #3 — the MARKETPLACE (`MarketplaceAdapter`) — BUY / LIST / MOVE

**What it answers:** *how do I buy it, list it for sale at its fair value, and move it between
holders — and where does a human have to tap approve?*

The interface (`engine/lib/adapters/index.ts` §2.6) — covers both marketplaces and storage
providers:

```ts
interface MarketplaceAdapter {
  readonly marketplace: Marketplace;
  discover(query): Promise<MarketplaceListing[]>;          // read candidates
  quoteAcquire(listing): Promise<AcquireQuote>;            // ranks on landedCostUsd
  quoteExit(i): Promise<ExitQuote[]>;                      // maximises netProceedsUsd
  acquire(i: {quote; approvalRef?; maxUsd?}): Promise<AcquireReceipt>;   // ← the cap firebreak lives here
  list(i): Promise<ListReceipt>;
  confirmSale(i): Promise<SaleReceipt | null>;
  initiateCustodyMove(req): Promise<CustodyMoveHandle>;    // async, multi-day, human ship-out
  getCustodyMove(i): Promise<CustodyMoveHandle | null>;
}
```

Swap this to trade on **your** marketplaces and storage providers. Keep the honesty guards that
are built into the interface:

- `acquire`/`list` are **not** simple "done instantly" calls when the action can't be undone (like
  buying on eBay, or any onchain buy in this demo): they return a **staged** result (set up but not
  sent) and stop for a human approval before the step that can't be undone (`ExecutionStatus`:
  `staged → approved → committed`).
- Moving the **physical item** between two holders is physical only — it ships, takes days, and
  may need ID checks. There is **no** blockchain bridge for the item itself; only the *money*
  (USDC) crosses chains. So `initiateCustodyMove` runs in the background over several days and
  gives you a handle you check on later.
- **`acquire()` is where Safety Rule #2 lives.** It caps spending at the smaller of the
  per-purchase limit and the configured limit (`min(maxUsd, configCapUsd)`) and **refuses to buy**
  if no limit is set (see §6). The comics version shows the exact 4-line check — copy it.

**Examples to copy:**
- Cards (LIVE, verified): `engine/lib/adapters/beezie.ts`, `ebay.ts`, `courtyard.ts`.
- Comics (MOCK): `ComicsMarketplaceAdapter` in `engine/sim/comics.ts` — an onchain vault using
  fake test money that respects the spending limit, records each payment with a clearly-fake
  `mockusdc:comic:…` tag, and moves physical buys (ship them in, then turn into a share) into its
  own storage.

---

## 4. The item config (`CommodityConfig`)

One small object describes *your* item type. It's only used for **on-screen text and for spotting
when an item must change hands** — the engine itself never reads item-specific words; only your
swap-in pieces and this config do. From `engine/sim/comics.ts`:

```ts
export const COMICS_CONFIG: CommodityConfig = {
  label: "Graded comics (CGC/CBCS key issues)",
  assetNoun: "comic",                       // the generic of "card"
  authenticators: ["CGC", "CBCS"],          // the generic of "grader"
  assetNames: [ "Amazing Spider-Man #300", "Incredible Hulk #181", /* … */ ],
  physicalVenues: ["ebay", "cardmarket"],   // bought in hand → must re-route to tokenize
  tokenizedVenue: "beezie",                 // the vault the re-route mints into
  tokenizedCustody: "onchain-base",
  physicalCustody: "self-custody",
};
```

Cards supply a card-flavored config; comics supply the one above; a watch desk supplies its own
(`authenticators: ["WatchCSA","authenticity-cert"]`, marketplaces `["chrono24",…]`, and so on).

---

## 5. Connect it all — RING 3 (no changes to the core)

Build the **same** `AcquisitionDeskOrchestrator`, handing it your three swap-in pieces. That's the
entire change at the engine level (this is the exact shape from `runComicsLoop` in
`engine/sim/comics.ts`):

```ts
import { AcquisitionDeskOrchestrator } from "../services/orchestrator.ts";

const orch = new AcquisitionDeskOrchestrator(
  {
    deals:        new YourDealsAdapter(/* your feed */),
    oracle:       new YourOracleAdapter(/* your value source */),
    marketplace:  new YourMarketplaceAdapter(/* your venue */, perCardCapUsd, YOUR_CONFIG),
    custodyStore: new InMemoryCustodyStore(),
  },
  { perCardCapUsd, windowCapUsd, windowHours: 24, selfApprove: true, mode: "sim", source: "your-sim", resolved: "defaults" },
  { decide: yourDecideFn(), maxCandidates: n, objective: "max-risk-adjusted-ev" },
);
const result = await orch.runLoop();   // step-by-step records + holdings + profit for YOUR item type
```

The core's "treat fair value as a suspect" check, its same-grade check, its Nemotron buy-or-skip
slot, its route plan, its best-way-to-sell pick, its spending limit, its change-hands process, and
its profit book are all **shared and unchanged**. Same loop in, your buy/skip decisions and profit
out.

---

## 6. THE THREE PAYGUARD SAFETY RULES — keep these EXACTLY (do not weaken)

You can swap every piece — every marketplace, every price source — but these three safety rules
are what protect the money, and they **must never be weakened.** They're enforced in two places
that have to agree: the plain-language SOUL guidelines and the machine-checked
`profiles/routing.yaml` + `policy.yaml`.

**Safety Rule 1 — workers NEVER release the money (only the trusted manager can).**
`verifyFill`/`withdraw`/`setOperator` are in `routing.yaml` `defaults.hard_bans`, which applies to
every worker. Only `privileged-executor` (the trusted manager) is allowed to use them. Your new
worker profile must keep `verifyFill` in its `exclude` list. The one who checks the work must never
be the one who gets paid for it.

**Safety Rule 2 — workers NEVER spend beyond the spending limit.**
No worker may list a money-spending tool (`awal`, `x402_pay`, `evalanche`, `send`, `trade`) in
`tools.include` — except `acquisition-solver` (the buying worker), and even it can only spend
**within** the limit set in `policy.yaml`. The check lives in the engine's `acquire()` step: it
decides to block or buy **before** any payment is set up, capping at the smaller of the
per-purchase limit and the configured limit, and **refusing to buy** if no limit is set at all.
Copy the comics check exactly:

```ts
const cap = i.maxUsd ?? this.configCapUsd;
if (cap === undefined)  return { status: "failed", /* … */ approvalRef: "BLOCKED:no-cap-set" };      // fail closed
if (landed > cap)       return { status: "failed", /* … */ approvalRef: `BLOCKED:over-cap $${landed}>${cap}` };
```

**Safety Rule 3 — steps that can't be undone need a human's OK first.** Locking up money, turning a
card into a share, or swapping a share back for the real card all require the human approval step
(`kanban_block`). `kanban_block` is only in the trusted manager's tools; the buying worker
explicitly `exclude`s it (it "cannot approve its own spending"). Every step that can't be undone
sets `ExecutionPlan.requiresHumanGate = true`; the `acquire()`/`list()` flow returns `staged` (set
up but not sent) and waits for the approval. The board you see on screen *is* this approval step
made visible.

> **Check this after you edit `routing.yaml`:** make sure no grading, shipping, or new worker lists
> `verifyFill`, `awal`, `x402_pay`, `evalanche`, `send`, `trade`, or `kanban_block` in
> `tools.include`. Per ADR-0001 §D1: a worker's profile only *describes which tasks wake it up* —
> it never *adds powers*. The comics run re-checks all three safety rules on the second item type
> (`engine/sim/comics.ts` → the `invariants[]` block).

---

## 7. Add the Hermes worker profile (the "verify the item" step, for your item)

Grading is **example #1** of a general step: *figure out what it's worth to get a more trustworthy
check on an item, then bid on the job.* To add an item type, copy the pattern in
`skills/comics-authenticate-solver/SKILL.md` (the worked comics example):

1. **New worker file:** `hermes-plugin/skills/<commodity>-authenticate-solver/SKILL.md`. Keep the
   header `category: solver`, tag it `generalizable`, and copy the guardrails **word for word**
   from the `grading-solver` SOUL (no releasing money, no spending money, bid-only, and don't blindly
   trust the check). Only the source of the check changes (CGC/CBCS for comics; a legit-check service
   for sneakers; an authenticity certificate for watches) — the math is the same (the odds of each
   outcome → the expected check result → the expected value, after costs and fees).
2. **New routing section:** add a `profiles.<commodity>-authenticate-solver` block to
   `profiles/routing.yaml`, modeled on `grading-solver` — `tools.include` =
   `[compute_grading_ev, submit_fill, get_active_intents]`, `tools.exclude` =
   `[verifyFill, awal, x402_pay, evalanche, send, trade]`. **Do not** add any money-spending or
   money-releasing tool.
3. **(Optional) new SOUL note:** if you want its own plain-language guidelines, add
   `profiles/<commodity>-authenticate-solver/SOUL.md`; otherwise it reuses the grading one.

The planner, the buying worker, and the shipping worker stay exactly as they are — they already use
generic words (item / check / verifier), not card-specific ones. You only add the one
"verify the item" worker for your item type.

---

## 8. Add the on-screen item picture (the only card-specific thing in the app)

In the app, the board, the sell-route comparisons, and the planner are all generic — they work for
any item type. The **only** card-specific thing is how the item *looks* (the graded slab). That's
kept separate, in `app/src/components/itemRenderers.tsx`:

```ts
import { registerItemRenderer, type ItemRenderer } from "./itemRenderers";

const WatchItem: ItemRenderer = (view, opts) =>
  opts?.variant === "lot" ? <WatchHero {...view} /> : <WatchChip {...view} />;

registerItemRenderer("watch", WatchItem);   // board cells now render watches; engine untouched
```

A board cell calls `renderItem(view, { size })` and never knows whether it's a card. `viewFromTrace(t,
"<commodity>")` pulls the generic item info (title, grade, who verified it, cert number, cached
`imageUrl`) out of a real engine record. **Honesty (P7):** `imageUrl` is never made up — if there's
no image, your renderer shows its own placeholder (the card version uses a small monogram crop).
`Slab.tsx` stays the official card version; you register your item *alongside* it, you don't
replace it.

---

## 9. Checklist — a new item type, start to finish

- [ ] **DealsAdapter** over your listing feed (mark `mode`; return `[]`, never make up listings).
- [ ] **OracleAdapter** over your value source (show the tier + freshness + number of past sales;
      never re-calculate the value; an unknown source is the least trusted tier; `null` when you
      have no value).
- [ ] **MarketplaceAdapter** over your marketplace (spending-limit check in `acquire()`; stop for
      human approval on steps that can't be undone; moving the physical item runs in the background
      and needs a human to ship it).
- [ ] **CommodityConfig** object (label, item noun, who verifies it, marketplaces, storage labels).
- [ ] Hand all three plus a `CustodyStore` to the **unchanged** `AcquisitionDeskOrchestrator`.
- [ ] New **`<commodity>-authenticate-solver` SKILL.md** + **`routing.yaml`** section (safety rules
      kept; `verifyFill`/money tools/`kanban_block` all excluded).
- [ ] **`registerItemRenderer("<commodity>", …)`** in `itemRenderers.tsx`.
- [ ] **Re-check the 3 safety rules** on your item type (copy the `invariants[]` block in
      `engine/sim/comics.ts`).
- [ ] Run it: `node --experimental-strip-types <your run script>.ts` → you should see real
      step-by-step records and a profit number, the spending limit holding, no worker releasing the
      money, and steps that can't be undone waiting for approval.

---

## References

- **The 3 swap-in points:** `engine/lib/adapters/index.ts` (the RING-2 interfaces).
- **Live card pieces:** `engine/lib/adapters/deals.ts` · `oracle.ts` · `beezie.ts` · `ebay.ts`.
- **Proof it works for a second item type:** `engine/sim/comics.ts` · `engine/sim/run-comics.ts`.
- **Why it's built this way:** `engine/sim/ADR-0001-commodity-agnostic-seams.md`.
- **Worker template:** `hermes-plugin/skills/grading-solver/SKILL.md` ·
  `hermes-plugin/skills/comics-authenticate-solver/SKILL.md`.
- **The worker permission limits (machine-enforced):** `hermes-plugin/profiles/routing.yaml`.
- **The spending limit:** `hermes-plugin/policy.yaml`.
- **The on-screen item-picture registry:** `app/src/components/itemRenderers.tsx`.
- **The loop:** `hermes-plugin/AGENTS.md` · `hermes-plugin/README.md`.
