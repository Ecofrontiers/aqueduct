# AQUEDUCTX — FABLE KICKOFF

> This file is the plan. It supersedes DEMO-SPEC.md and DESIGN-BRIEF.md, which are
> demoted to reference material — they contain useful detail and two structural errors
> that wasted a day (documented below). When any document conflicts with the north star
> or the corrected direction here, this file wins, and the rendered outcome wins over
> this file.

## North star (Pat, verbatim — every decision derives from this)

**"AqueductX is a generalized peer-to-peer logistics and finance layer for smallholder
farmers: agents aggregate, verify, and price commodity lots, and intents match and
settle them."** (updated 2026-07-03 to name the finance layer explicitly — the financing,
capital-formations, and tokenizer-solver work built this session is load-bearing, not
a side quest.)

This is a demo for a grant application (Sentient Foundation, "AI Supply Chain for
Smallholder Farmers" RFP — see docs/SOURCE-MATERIALS.md). It is a demo. Pragmatism over
ceremony. Real where it touches the world, simulated and labeled where counterparties
don't exist yet.

---

## Where we are

**Repo:** `~/Desktop/1_projects/aqueduct/` = `Ecofrontiers/aqueduct` (GitHub, private
until submission). `atlas/` is a fork of Regen Atlas (React/TS/Vite/Mapbox, live app,
runs: `cd atlas && npm run dev` → :5173). `routes/` is a fork of the Routes
intents/solver engine. Three commits; nothing pushed.

**Real and working (keep all of it):**
- EthicHub connector: live reads of greencoffee.ethichub.com (21-22 lots), the lending
  API (688 projects), and the Celo CreditLine contract. Anchor = shop lot 79 (Chiapas,
  Bourbon Honey, SCA 86, €18.70/kg live), 2 fallback lots, snapshot-with-timestamp
  architecture. `atlas/src/aqueduct/connectors/`
- Canonical lot schema (research/07), content-addressed lot IDs (sha256, recomputable),
  join_confidence levels, accent-aware name redaction. `atlas/src/aqueduct/schema/`
- Lot detail page in the Atlas asset-page pattern (`/lots/:lotId`) — this is the one
  piece that IS integrated correctly; treat it as the model.
- Real-vs-sim receipts, now inline (WP3, 2026-07-03): the settle-payload block lives
  in the header's expanded dev-mode bar, and every real source read (ethichub.com,
  Celo onchain) surfaces as a link on the lot it belongs to — the standalone `/ledger`
  page was folded in and deleted, not lost.
- The cascade sim: scout → diligence (real EUDR gaps rendered PARTIAL) → oracle (live
  ICE C quote via dev proxy) → intent → solver race (5 sim solvers calibrated to
  research/04 + 1 REAL bid computed by the routes/ landed-cost engine at runtime) →
  buyer match → settle. Replays cleanly. `atlas/src/aqueduct/sim/`
- Settle payload prepared against the deployed IntentRegistry on Base Sepolia
  (0x3AA739c2…, verified live). Stopped before broadcast — script expects
  `AQUEDUCT_SETTLE_PRIVATE_KEY`, which Pat has not yet provided. Do not hunt for keys.
- docs/: 8 cited research reports, pre-mortem, market attack, reachout list. Good
  material; the strategy in them survived adversarial review and is trustworthy.

**Wrong (this is the rebuild):**
The demo currently renders as a SECOND APP stacked on the Atlas: dark amber-on-black
terminal panels (tour rail, feed, captions) floating as overlays on top of the stock
Atlas pages, z-fighting the Atlas's own UI, feed showing "no events match" on pages it
doesn't belong to. Pat's verdicts, verbatim: "you just built an app on top of the other
app (literally). There's no integration at all" / "your whole fucking UI doesn't look
integrated or at all like the atlas."

**Root cause, so it is not repeated:** the spec and design brief invented a separate
visual identity ("terminal amber-on-black, scoped to the swarm layer") and an additive
overlay structure ("Atlas base untouched"). Build agents obeyed the documents
faithfully. The documents were wrong. The verification gates checked spec-compliance,
never "does this look like one app" — so the error passed two gates.

---

## Supersession — 2026-07-02, Pat's answers (binding over the section below where they conflict)

Asked before Phase 1; answers verbatim in spirit:

1. **The app IS AqueductX — that's why we forked it.** Not "a mode of the Atlas."
   Header rebrands to an AQUEDUCTX wordmark set in the Atlas's own design language
   (DM Sans, same light header). Nav: Map / Ledger / About. Regen Atlas credited in
   About + README. `/` is the AqueductX map view because everything is AqueductX.
2. **The rail inherits the Explore machinery.** Bioregions stay as the geographic
   browse; the bottom accordions remap to **Lots / Intents & Routes / Solvers &
   Venues** with live counts. The bioregion views are an asset to leverage, not chrome
   to avoid.
3. **Comprehensive app, not a 7-beat corridor:** a **multi-commodity synthetic
   economy at scale** — 1000s of SIM lots/intents/routes, ~50–100 solver archetypes —
   populating the registry browser. Real EthicHub coffee lots remain the LIVE anchors.
   Every synthetic entity carries a SIM chip.
   *Amendment 2026-07-03 (Pat): two verticals, visible — same loop, two commodities, one
   settled over oceans, one over wires; Glow solar renders as a live-read second vertical
   (10 real farms, SNAPSHOT-chipped) in the LOTS category as a `solar` commodity.*
4. **Tour = docked chapter panel on the map** (drives camera/rail state, dismissible;
   the app is fully usable without it).
5. **Feed = three registers** (Fable's call, Pat delegated): live actor/action glyphs
   and arcs on the map, event rows inside entity rail cards/detail pages, and a compact
   activity column in the main view. It should feel like a live marketplace/dApp.
   The firehose is folded into those same registers (WP3) — no separate `/ledger` page.
6. **Fully light everywhere.** Mono survives only for data values (hashes, IDs, prices).
7. **The coop seat (north-star correction, same day):** Pat's pause — "who is this
   optimized for?" — surfaced that the build served judges and the demand side while the
   named beneficiary had no surface. Correction: `/coops/:coopId` — the same engine from
   the cooperative's chair. REAL EthicHub communities (identity + lending history real,
   production a declared projection) + SIM coops; publish-sell-intent runs the real
   solver race FOR the coop; tokenized trade finance = structured receivable → policy-
   engine eligibility → advance (declared 60%) vs the REAL Celo USDC benchmark; stablecoin
   settlement rail (real Celo USDC precedent, prepared Base Sepolia settle); duplicate-
   financing check over content-addressed IDs (the MonetaGo registry service).

## The corrected direction (binding)

1. **One app.** AqueductX is a mode of the Atlas — its own route, and the landing view
   of this demo build. Built from the Atlas's own components and design language:
   light surfaces, its cards, its type, its chips, its palette. Delete the `--aq-*`
   dark tokens. The lot detail page already shows the correct approach; extend that
   approach to everything. **The exit test: screenshot an Atlas page and an AqueductX
   view side by side — if a stranger would say "two apps," it is not done.**
2. **The map is the content.** The AqueductX view opens framed on Chiapas: lot markers,
   venue nodes, storage nodes, intent/route arcs as first-class map content. Atlas's
   bioregion browse stays fully functional via its normal nav, with zero AqueductX
   chrome on those pages.
3. **The tour drives the app.** Judge-clicked, chaptered rail, 7 beats: Aggregate →
   Verify → Price → Publish → Fill → Settle → Ask. Self-narrating for a cold visitor.
   Tour state controls route, camera, and panels — it never floats over unrelated pages.
4. **Honesty chips everywhere,** in Atlas styling: LIVE / SIM / SNAPSHOT / TESTNET /
   PARTIAL. The ledger enumerates all of it. The EUDR check shows the anchor's real
   gaps as PARTIAL — a real check finding real gaps is the credibility, keep it.
5. **The oracle line is a floor, not a verdict:** ICE C + differential = "commodity
   floor," never "fair price," never rendered as if the €18.70 specialty lot is
   overpriced. One context line: floor = ICE C + origin differential; specialty prices
   above it on grade.
6. **Names:** producers initialed everywhere (UI, JSON, code comments); source URLs are
   the allowed exception. Redaction helpers exist in `schema/canonicalLot.mjs`.
7. **Never:** the string "farmgate" (in anything); card/collectibles references;
   fictional platform names; a capability shown as live that isn't.

## Locked decisions that survive (from ~40 answered questions — the load-bearing set)

| Decision | Answer |
|---|---|
| Money shot | An intent filled on the map: publish → solver race → fill → settle |
| Realness | Hybrid: real platform reads + simulated economy, 1 REAL solver bid (routes engine) + N sim, every element labeled |
| Anchor | EthicHub Chiapas lot 79, real reads, producer initialed, source-linked |
| Intents | Two: sell-this-lot (the spine) + finance-this-planting (routes to Silvi/AgroforestDAO as researched-real TO-BUILD venues) |
| Venue stance | Neutral rails venues join; AqueductX adds no toll; incumbents render as nodes, never competitors |
| Backstop | Open reference solver: fills only when nobody else bids, margin printed on the label |
| End of tour | The ask, stated: what the grant funds, milestones as user events |
| Sustainability story | Lender-facing registry services (duplicate-financing checks — the MonetaGo precedent); the solver is a cold-start mechanism, not a business |
| Ask | $50,000, grant track |
| Outreach | None pre-submission (final) |
| Repo | Public at submission |
| ROMA | Mapping note in ledger + application only; never "built on ROMA" |
| Scraping | Read anything publicly reachable; auth-gated is the only line |

## Build plan

**Phase 0 — Look first.** Run the app. Walk the stock Atlas pages and screenshot them.
Walk the current AqueductX build. Read `atlas/src/aqueduct/`. Do not write code until
you can say what the Atlas's design system is in one paragraph.

**Phase 1 — Integration rebuild.** The AqueductX route as landing view per the corrected
direction: Atlas-styled feed docked in the layout, tour rail in the view, restyle every
AqueductX component to the Atlas system, fix the feed empty-state bug, camera framed on
Chiapas. Show Pat a screenshot EARLY — after the first coherent render, not after 150
tool calls.

**Phase 2 — The label fix + polish.** "Commodity floor" relabel (must-fix); then
spotlight dimming, camera easing per beat, mobile as time allows.

**Phase 3 — Settle for real.** When Pat provides `AQUEDUCT_SETTLE_PRIVATE_KEY` (his
decision: reuse routes deployer vs fresh throwaway), run
`atlas/scripts/prepare-settle-tx.mjs` → broadcast → the settle beat flips to a real
Base Sepolia explorer link. Everything is prepared; this is one script run.

**Phase 4 — Ship.** Fresh-clone build from the README (must work). Walk the tour as a
cold judge. Stranger test on the screenshots. Deploy (hosting/domain = Pat's call;
Vercel default URL acceptable). The URL goes into Q2(f) of the application.

## The application (parallel track, mostly done)

`docs/APPLICATION-V2.docx` is the source of truth — **edit sections in place, never
regenerate the file.** Q2(a) LOCKED (Pat's hand). Q2(c) LOCKED (the north star line).
Q2(b)/(d)/(e) current per Pat's edits and the north-star rewrite. Q2(f) awaits the demo
URL. Any prose written for it: load `~/.claude/skills/prospecting/VOICE.md` first
(banned patterns + Pat's register, §7 especially: the prose walks, nothing is sold).

## Working rules (learned this session, the hard way)

1. **The rendered outcome outranks every document, including this one.** When a doc
   and "one app that looks like the Atlas" conflict, the outcome wins and the doc gets
   a one-line correction.
2. **Show, early and often.** Screenshot after every coherent increment. Pat catching a
   wrong direction at minute 20 costs nothing; at hour three it costs the direction.
3. **Convert findings into questions, not silent decisions** — but don't ask what a
   screenshot can answer.
4. **Verify like a stranger, not like an author.** Every gate includes one check that
   isn't derived from the spec: would a cold visitor say this is one app, one story,
   one register?
5. **Keys, broadcasts, deployments, outreach: Pat's, always.** Prepare everything up to
   the boundary, then stop and ask.

## Kickoff

```
cd ~/Desktop/1_projects/aqueduct && claude --model fable
> Read FABLE-KICKOFF.md and start with Phase 0. Show a screenshot at the end of it.
```
