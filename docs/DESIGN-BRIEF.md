# Aqueduct — Design Brief (binding for the build session)

> Written 2026-07-02 from the five reference-research reports (live-ops maps, block
> explorers/terminals, agent dashboards, product tours, commodity-trade UIs) against
> `DEMO-SPEC.md` v2. This settles every question the spec delegated to design-research
> (§2 A5 feed register + currency, plus the swarm layer, tour chrome, badges, lot card,
> ask screen). Every decision cites its reference pattern. Where this brief and the spec
> conflict, the spec wins; deviations from THIS document during the build require a noted
> reason in the ledger of build decisions, not silent judgment.
>
> Scope guard (spec §2 "Visual identity"): **Atlas base untouched. Everything below
> applies ONLY to the new swarm/intent layer** — the feed, agent marks, intent/route
> overlays, badges, tour chrome, lot-card extensions, ledger, ask screen.

---

## 0. Visual identity of the new layer

**Terminal amber-on-black, scoped to the swarm layer only.** (Bloomberg: amber-on-black
is the recognized identity of "real financial system"; density-with-discipline reads as
professional competence to exactly this audience. TradingView: dark palette deliberately
NOT pure green/red.)

Tokens (the build uses these names):

| Token | Value | Use |
|---|---|---|
| `--aq-panel` | `#131722` | feed/panel background (TradingView canvas) |
| `--aq-panel-2` | `#1e222d` | cards, expanded rows |
| `--aq-border` | `#2a2e39` | dividers, chip outlines |
| `--aq-text` | `#d1d4dc` | body text |
| `--aq-dim` | `#787b86` | de-emphasis (fees, totals-in-parens, timestamps) |
| `--aq-amber` | `#ffb700` | agent activity, active tour chapter, selection accent |
| `--aq-up` | `#26a69a` | positive deltas/spread direction ONLY |
| `--aq-down` | `#ef5350` | negative deltas / FAILED status ONLY |

Rules:
- **Color is semantic, never decorative** (Bloomberg). Teal/red are reserved exclusively
  for direction and pass/fail status. Amber is the one accent. Chrome stays neutral
  (Cloudflare Radar: one accent, alive through timestamps not motion).
- **Religious consistency** (Bloomberg): ONE feed-line grammar (§1) reused verbatim in
  the swarm feed, the lot card's history section, and the ledger page. No per-surface
  reinvention.
- Numerals: monospace/tabular everywhere in the layer. Missing data renders as em-dash
  `—`, never "N/A", never blank (TradingView key-facts strip).

---

## 1. Feed line format (settles §2 A5)

**Verdict on the spec's hypothesis: VALIDATED, with one inversion.** Every reference
system (FR24 panel rows, Etherscan row grammar, mempool.space tables, OpenAI/LangSmith
spans, GitLab session logs) uses a terse structured line collapsed + detail on demand.
Blockscout's production convention adds the inversion: **in the EXPANDED view, the
plain-language sentence comes FIRST**, structure below it. And in tour mode, the
plain-language layer lives in the CAPTION, not the feed (product-tours report: feed
stays terse; caption narrates — Fuselab's conversation/activity separation).

### 1.1 Collapsed line (the grammar)

```
HH:MM:SSZ · [PROV] · @agent-handle · verb object — concrete quantity · value+unit · [STATUS]
```

Worked examples (these are the register, copy it exactly):

```
14:02:07Z · LIVE · @scout-ethichub   · read 22 lots at greencoffee.ethichub.com — 6 matched Chiapas · 1.8s · OK
14:02:11Z · LIVE · @scout-ethichub   · pinned lot aq:b3f2…9c1 — N.O.P. / Chiapas (Mexico) – Bourbon Honey – 86 SCA · €17.00/kg · OK
14:02:19Z · LIVE · @diligence-eudr   · checked 6 EUDR fields on aq:b3f2…9c1 — 4 verified, 2 unverifiable · 3.2s · PARTIAL
14:02:24Z · LIVE · @oracle-ice-c     · priced aq:b3f2…9c1 — ICE C 309.5 ¢/lb + Chiapas diff · fair FOB €6.63/kg · OK
14:02:31Z · SIM  · @sim-solver-3     · bid landed route aq:b3f2…9c1 — 5 cost lines, T+45 · €19.0613/kg landed · BID
14:02:36Z · SIM  · @sim-solver-1     · undercut — prev €19.0613 → new €18.9450/kg · UNDERCUT
14:02:41Z · SIM  · @sim-solver-3     · paid data fee via x402 — 1 call · $0.0040 USDC · OK
14:02:58Z · TESTNET · @settle-base   · settled intent aq:i-04 — tx 0x88a3…b87b · 2 confirmations · SETTLED
14:03:04Z · SIM  · @sim-venue-silvi  · funded intent aq:i-05 — planting renovation, 1,200 seedlings · €1,120 · FILLED
```

Field rules:
- **Timestamp**: relative age never appears in the feed line; absolute `HH:MM:SSZ`
  monospace (Etherscan trinity: absolute-UTC is canonical; relative only on hover
  tooltip).
- **[PROV]**: the provenance chip (§5), always second field, before the actor.
- **@agent-handle**: GitLab Pajamas taxonomy — provenance encoded in the handle itself.
  LIVE actors: `@scout-ethichub`, `@diligence-eudr`, `@oracle-ice-c`, `@solver-backstop`
  (the real Routes computation). SIM actors: `@sim-solver-1..5`, `@sim-buyer-eu`,
  `@sim-router-1`, `@sim-venue-silvi` (finance-intent fills: the `sim-` prefix marks the
  ECONOMY as simulated; the venue name stays real per spec §4 no-fictional-platforms).
  TO-BUILD: `@registrar-8004` (greyed, never emits events). Fixed-width
  column, one color per agent TYPE (§3).
- **verb vocabulary is typed, per agent** (OpenAI span taxonomy — a line is a rendered
  span, not prose): scout `read / matched / pinned`; diligence `checked / verified /
  flagged`; oracle `priced / updated`; intent `published`; solver `bid / undercut /
  declined`; router `costed / routed`; buyer `matched`; venue (finance intents)
  `accepted / funded`; settle `settled / confirmed`. Both intent types (sell-this-lot,
  finance-this-planting) use the SAME line grammar — the finance intent adds venue verbs,
  not a new format. x402 agent payments render as SIM `paid` lines (never TESTNET — no
  real tx behind them in the demo, spec §5 Q35) and are enumerated in the ledger sim
  tab (§8).
  Handoffs are their own lines (`@diligence-eudr → handed aq:b3f2…9c1 to @oracle-ice-c`)
  — the handoff is a first-class object (OpenAI `handoff_span`).
- **Concrete quantity in every line** (Fuselab: specific counts are the single strongest
  real-vs-theater lever; Anthropic: "searching three databases"). "read 22 lots",
  "4 verified, 2 unverifiable", "5 cost lines" — never a bare verb.
- **Duration** on tool-call lines (`1.8s`) — LangSmith run latency; instrumentation
  reads as real.
- **[STATUS]** pill last (§5.2): `OK / PARTIAL / BID / UNDERCUT / DECLINED / FILLED /
  SETTLED / FAILED`. One word, never a sentence (Etherscan).
- **Cadence**: events surface on a ~2–3 s tick (FR24's documented refresh rate). Faster
  reads fake; a burst renders as queued lines ticking out, not a dump.
- **Column discipline**: ≤5 visual columns (mempool.space); density via truncation
  (middle-ellipsis on IDs, `aq:b3f2…9c1`) not smaller fonts.
- **Parent-linking**: cascade children indent one level under their parent line with a
  thin connector (LangSmith run tree). The scout→diligence→oracle→intent→fill→settle
  chain is visibly one tree.

### 1.2 Expanded row (click any line)

Order (Blockscout inversion):
1. **Plain sentence headline** — "`The EthicHub scout read the public shop and pinned
   lot 79 — a Bourbon Honey micro-lot from Soconusco, Chiapas, scored 86 SCA, asking
   €17.00/kg.`" Second person is for captions only; expands are third person.
2. **Label:value sheet**, sectioned by hairline dividers (Etherscan tx page): identity
   (event id `run_…`, span type, parent id) · tool call (what was called, source URL as
   a live link, `fetched_at`) · payload (fields returned) · economics (values, dual
   denomination per §2).
3. Raw JSON behind "Show raw" (Etherscan "More Details"; Shopify nerd-stats
   transparency flex).

Every LIVE expand MUST show source URL + `fetched_at`. Every TESTNET expand MUST show
the tx hash linked to the Base Sepolia explorer. That link chain IS the honesty
mechanic (Radar: "the data behind this view is fetchable" as a UI promise).

### 1.3 Feed chrome

- Sticky header with count framing: "Latest 40 of 214 events · 3 queued" (Etherscan
  count microcopy; Cropster sticky header).
- Filter bar: by agent, by provenance chip, by lot — the filter bar doubles as the
  legend (MarineTraffic: one element = control + key).
- Hover a feed line → the corresponding map node/route flashes; select a map node → its
  feed lines highlight (Stripe hover-and-highlight sync; AutoGen's synced log+graph).
  This two-way sync is what makes feed-first legible — build it, it is not optional.

---

## 2. Currency & units (settles §2 A5, second half)

**€/kg primary · 60 kg-bag equivalent secondary · ¢/lb ONLY in the oracle line.**
(Commodity-trade report: EthicHub/EU-buyer register is €/kg; the trade's mental volume
unit is the 60 kg bag; exchange level is spoken in US ¢/lb. All three coexist in real
screens; a screen that shows only one reads amateur.)

1. **Per-kg first, lot total dimmed in parens** (Etherscan dual denomination):
   `€17.00/kg (€1,190 lot)` — total in `--aq-dim`.
2. **Quantities**: `70 kg · 1.2 bags (60kg)` — kg first, bag equivalent beside it
   (Algrano quotes everything in 60 kg bags).
3. **Incoterm labeled on every price, no exceptions** (Algrano): `FOB €17.00/kg` at
   origin, `Landed €19.06/kg` at destination. An unlabeled price is a build bug.
4. **The oracle line is two-register** (DRWakefield quoting grammar — this is what makes
   the oracle credible to coffee people):
   `ICE C 309.5 ¢/lb · Chiapas diff +22 ¢/lb → fair FOB 331.5 ¢/lb ≈ €6.63/kg`
   — the ¢/lb→€/kg conversion shown, the differential named and source-labeled. A
   C-quote without an origin differential is banned (§9).
   **Fallback tiers** (spec §5 prices, in order): if ICE C is unreachable, the SAME
   two-register grammar renders with only the source label swapped and ALWAYS dated —
   `ICO composite 331.2 ¢/lb (daily · 2026-07-01)` → `Pink Sheet (monthly · Jun 2026)` →
   a labeled snapshot price carrying the SNAPSHOT chip + date (§5.1). Structure never
   degrades; an unnamed or undated price source is a build bug (same class as a missing
   incoterm).
5. **Solver bids render as the Algrano landed stack** — itemized vertical breakdown,
   components at 4 decimals, total bold at 2:
   ```
   FOB (producer ask)        €17.00 /kg
   Freight & import          €1.2813 /kg
   Customs                   €0.4200 /kg
   Certification             €0.1500 /kg
   Financing (T+45)          €0.3100 /kg
   ─────────────────────────────────────
   Landed (FCA Hamburg)      €19.06 /kg
   ```
   The financing line always carries its tenor (`T+45`) — the capital-lock is THE
   structural point (spec §3.4). Solver-race deltas render mempool-RBF style:
   `prev €19.0613 → new €18.9450 · UNDERCUT`.
6. Every delta = sign + magnitude + % + hue together (TradingView): `−€0.12/kg (−0.6%)`
   in `--aq-up`/`--aq-down`.

---

## 3. Swarm layer on the map (marks, arcs, states — within feed-first)

The map shows RESULTS; the feed is the swarm view (spec A2). The map layer is therefore
quiet, data-encoded, and spends its entire motion budget on one event.

### 3.1 Glyph grammar (MarineTraffic: color = type, shape = state — two orthogonal encodings on one mark)

- **One hue per agent TYPE** (not per instance), used identically in feed handle, map
  mark, and ledger card: scouts, diligence, oracle, solvers, routers, buyers, settle —
  7 hues drawn from a desaturated set that sits on the Atlas base without fighting it;
  amber is reserved for SELECTION, not a type.
- **Shape = state**: filled glyph = acting now; hollow = idle; the moving dot along a
  route edge = in transit between nodes.
- **Stroke = provenance** (FR24's dotted-estimate convention — an honesty encoding
  judges already know from flight trackers): **solid stroke/edge = LIVE read, dashed =
  SIM, dotted grey at 40% opacity = TO-BUILD**. TO-BUILD venue nodes (DeHaat, Beyco…)
  render greyed-down with the dotted ring (MarineTraffic layer-opacity convention).
- Venue/storage/lot nodes carry human labels ("EthicHub", "dry mill — Tapachula
  region"), raw identifier middle-ellipsized beneath, click-through to source
  (Etherscan entity-labels-over-raw-identifiers; raw always one click away).

### 3.2 Motion budget (Shopify two-tier + FR24 ambient rules)

- **Motion carries data or doesn't exist.** No pulsing, no glow, no breathing on
  unselected marks (FR24/Windy). Ambient liveness = numbers ticking in panels on the
  2–3 s cadence + agent dots moving along edges when they actually move.
- **Bulk activity = small dots; hero events = arcs** (Shopify: arcs at volume are a
  visual mess). Solver bids do NOT draw arcs — they are feed lines + bid cards.
- **Exactly ONE arc per tour run**: the settle — **buyer node → cooperative/exporter
  node** (spec §5 settle realism, non-negotiable: the settle CREDITS the co-op/exporter;
  an arc terminating on the farmer, or skipping the co-op to read as direct payout, is a
  build bug) — drawn once, with the single celebration flourish of the entire demo
  (Shopify milestone punctuation: celebration budget = 1). Nothing else ever gets
  confetti-tier treatment.
- **Farmer pass-through** renders as a labeled downstream step off the co-op node: one
  dashed SIM segment + a dimmed `--aq-dim` label row `farmer pass-through — via co-op
  credit stack · SIM`. No arc, no flourish; same row appears in the lot card's settle
  section (§6.9).
- **Vault accumulation**: after the settle, the filled lot moves to the vault node as a
  state change, not a second arc — the vault glyph carries a monospace count badge in
  label:value register (`3 lots · €4,210`) that ticks up once per fill. The count
  persists across replays, so repeated runs visibly accumulate (GitLab
  update-don't-replace, applied to a map node).
- **Finance-intent route** (second intent type, spec §5): renders as a dashed SIM edge
  from the origin community node to the agroforestry venue node (Silvi/AgroforestDAO —
  researched-real venues; dashed = the fill is simulated, §3.1 stroke rule). No arc —
  the arc budget stays 1.
- Degrade resolution, never motion/framerate (Shopify auto-quality: if fps dips, drop
  pixel ratio, keep the tick).

### 3.3 Selection (FR24 dual-state + Windy picker)

- Click a node → it takes the amber selection accent; a panel slides OVER the map
  (map stays visible and pannable behind it — never navigate away, Windy/Stripe).
  Camera eases to the node; 400 ms.
- Route render on selection only: selecting the anchor lot or an intent draws its route
  graph (wet mill → dry mill → exporter → port → Hamburg) with document-chain steps as
  labeled waypoints (spec §3.5: documents ARE logistics); storage nodes render
  warehouse-receipt style: `{location · qty · quality · timestamp}` (GrainChain).
- Route codes in ORIG→DEST register: `TAP → HAM` (FR24 route row).

---

## 4. Tour chrome (settles A3 specifics)

### 4.1 Layout: Stripe three-column

Left rail = chapters · center = untouched Atlas map · right/bottom docked panel = feed +
active caption. Captions are EMBEDDED in the persistent panel, never floating pop-overs
(Chameleon: embedded beats pop-ups 1.5×; sustained narration belongs in a dock).

### 4.2 Side rail anatomy (checklist-launcher, NOT a stepper)

- 7 named chapters, all visible upfront: **Aggregate → Verify → Price → Publish → Fill
  → Settle → Ask** (spec A3). Chameleon: checklist-launched tours hit 67% completion vs
  ~23% auto-triggered; the rail IS a checklist where each chapter launches a short flow.
- Chapter states: done = green check pill · active = amber, subtle pulse (the ONE
  permitted pulse in the UI — Fuselab plan-and-execute chrome) · upcoming = dimmed but
  clickable (judge can jump, per spec).
- Thin progress bar under the rail; step counter inside each chapter: `2 of 2`
  (driver.js `{{current}} of {{total}}` — progress indicators +12% completion).
- **Each chapter = 1–2 captioned beats; total = 10 beats, locked.** The spec's
  "judge-clicked, ~8–10 steps" row governs — a 3+-beats-per-chapter build ships a
  20-beat tour and is banned (§9). Navattic's completion cliff (>6 steps per unbroken
  flow) never triggers: no chapter exceeds 2 beats.
- **The locked beat map** (settles where the spec's mandatory beats live in the
  7-chapter rail — this decision is binding):
  1. **Aggregate** — B1: map overview; scouts read real platforms, lots/venue nodes pin,
     the feed cascade begins.
  2. **Verify** — B2: **identity resolution** (spec B3, headline capability): the two
     EthicHub surfaces render as two side-by-side cards in the docked panel — shop lot
     left, lending project right, both in the §1.2 label:value grammar — then ease
     together (400 ms, the §4.5 travel cue) into the single lot card as the
     `join_confidence: name+place match` labeled tag (§5.2) appears between them
     (Blockscout relationship-tag; GitLab update-don't-replace). On the map, the two
     pins collapse to one node. Caption carries "linked by producer/community, not by
     platform id"; the beat is labeled **cross-surface** (§5.2).
     — B3: EUDR diligence check, hatched PARTIAL fields (§5.2).
  3. **Price** — B4: the two-register oracle line (§2.4).
  4. **Publish** — B5: sell-this-lot intent published.
     — B6: **finance-this-planting intent** (spec §5 intent type 2, one beat): intent
     published → routed along the dashed SIM edge to the agroforestry venue node (§3.2)
     → `@sim-venue-silvi` `funded` line in the feed (§1.1). Caption states the
     lifecycle thesis in ≤30 words (finance the system → sell its harvest).
  5. **Fill** — B7: solver race → buyer match; the **buyer demand card** (§6.1) shows
     WHY it filled.
  6. **Settle** — B8: settle arc to the co-op/exporter node + farmer pass-through label
     + vault count tick (§3.2).
  7. **Ask** — B9: **five-functions mapping** (§7.0, acceptance criterion 8).
     — B10: the ask screen (§7.1).

### 4.3 Opening

- **Never autoplay** (Chameleon: user-triggered beats auto-triggered 2–3×). Land on the
  map + rail; the judge's first click starts Chapter 1.
- **One welcome modal** (Navattic: 71.9% of top demos open with a modal): 2–3 sentences
  — what Aqueduct is, what you'll watch, "Live reads + simulated economy — see the
  ledger." One dark-neutral button: **Start the tour**. Routing only, never education
  (38% dismiss in <4 s when a modal educates).

### 4.4 Captions

- ≤25–30 words, second person, benefit-led (Navattic/Appcues copy metrics). The caption
  carries the plain-language layer; feed lines stay terse (§1).
- Placed in the docked panel; when a beat spotlights a map element, the caption/popover
  NEVER covers the element it describes (Storylane placement rule).
- Each caption states what is simulated as it appears (spec §6); its provenance chip
  deep-links to the ledger (Stripe test-mode signaling: the safety label sits ON the
  interactive element).
- No citations in captions (spec Q37); the ONE exception is the ask-screen RCT line.

### 4.5 Spotlight/dim mechanics (driver.js numbers, inverted for dark UI)

- Backdrop with a moving CUTOUT around the target: overlay opacity **0.5**, stage
  padding **10 px**, stage radius **5 px**, cutout travel animated **400 ms** between
  beats — the travel IS the "now look here" cue; no beacons needed.
- On the dark Mapbox base use a **light/desaturating overlay, not black** (driver.js
  documents the inversion explicitly; a black overlay on a dark map is invisible).
- **Spotlit elements stay interactive** (`disableActiveInteraction: false`) — the lot
  card is clickable mid-chapter; the surface under the rails is a sandbox (Storylane
  linked-pages free-roam).

### 4.6 Advance affordance

- Buttons: Next / Previous / Close, dark-neutral (Navattic: black/white chrome
  dominates top demos); arrow keys work (driver.js default).
- **Choreography gating** via the `onNextClick`-style override: the solver race must
  finish animating before Next fires; the settle arc completes before the Ask chapter
  unlocks. Advance is judge-clicked everywhere else (spec: judge-clicked 8–10 beats).
- Replay: chapter click replays that chapter; a "Replay the fill" affordance on the end
  screen (Shopify replay-as-first-class; acceptance criterion 3). When rendering
  snapshot data, the banner says so in the Shopify register: exact honesty microcopy,
  e.g. "Replaying the aggregation run of 2026-07-0X — live re-fetch failed, snapshot
  shown."

### 4.7 Cold load, in-progress, and failure states

- **Cold load**: panels render immediately in `--aq-panel` with every numeral as em-dash
  `—` (§0 rule — never blank, never spinner-as-content); the feed sticky header carries
  its count microcopy in loading form: `Connecting · 0 of — events` (Etherscan count
  register). The untouched Atlas map loads first; swarm marks appear as data lands. No
  skeleton theater — the em-dash IS the loading state.
- **Anchor re-fetch in progress** (spec §4 on-load live re-fetch): the lot renders from
  snapshot instantly with a `PENDING` status pill beside `fetched_at`; on success it
  resolves to the LIVE chip and `fetched_at` updates; on failure it resolves to
  SNAPSHOT (§4.8). The judge never waits on a fetch.
- **Empty feed** (pre-tour, or a filter with zero matches): one dim line in the §1
  register — `— · no events match · clear filters` — never a blank panel (the
  TradingView em-dash rule at surface scale).
- **Failed settle / failed tx**: the feed line takes the `FAILED` pill (red, §5.2); its
  §1.2 expand carries the error in the label:value sheet (identity · tool call ·
  error message · retry affordance). A failed choreography gate (§4.6) retries
  silently; after 3 retries the caption states the failure honestly and offers Replay.
  **Errors are feed lines, never modals** — one grammar (§9.20).

### 4.8 Snapshot fallback (spec §4 pre-mortem hardening)

- **First load on snapshot**: if the on-load re-fetch of the anchor lot fails,
  everything the lot touches — feed lines, lot-card header, ledger row — swaps its LIVE
  chip for the `SNAPSHOT` chip (§5.1) paired with the snapshot's `fetched_at`. Nothing
  else changes: same grammar, same layout, source link unchanged.
- **Banner**: one persistent line in the docked-panel header (never a floating toast),
  same Shopify honesty register and microcopy family as the §4.6 replay banner:
  "Rendering the snapshot of 2026-07-0X — live re-fetch failed; source link unchanged."
  Persists until a re-fetch succeeds; never dismissible.
- **Fallback lots**: the 2 designated backup Chiapas lots (spec §4) switch over at the
  data layer BEFORE the tour starts — if the anchor is sold/changed, a backup renders
  as the anchor with its own LIVE/SNAPSHOT provenance, and the switchover is recorded
  as a ledger live-reads entry ("anchor fallback: lot 79 unavailable → lot NN"), never
  announced in tour captions. **Mid-tour switchover is banned** — the tour runs on
  whatever the load resolved.

### 4.9 Global honesty banner + footer (spec §6)

- **Banner**: "Live reads + simulated economy — see the ledger." renders as a thin
  persistent strip at the top of the swarm-layer chrome (above the docked panel on
  desktop, above the bottom sheet on mobile) — monochrome-outlined in the provenance-chip
  register (§5.1), `--aq-dim` text, "see the ledger" as the one inline link. Never
  dismissible, never animated, never colored (Stripe test-mode signaling: persistent,
  small, sitting ON the surface it describes). The welcome modal (§4.3) quotes the
  sentence; the strip is what persists after the modal closes.
- **Footer** (spec §6 puts the ledger link here): one hairline `--aq-border` row on
  every surface, including the ask screen and the ledger itself:
  `Real-vs-sim ledger · Aqueduct extends the open Regen Atlas · repo` — three links,
  `--aq-dim`, no logos, no prose.

### 4.10 Mobile / responsive (spec criterion 1 — a cold judge on any device)

- **One breakpoint, ~900 px.** Below it the Stripe three-column re-stacks:
  - The chapter rail becomes a horizontal chip strip pinned top — same three states
    (green check / amber active / dimmed clickable), all 7 chapters reachable by scroll;
    thin progress bar beneath it unchanged.
  - The map keeps the full viewport behind everything.
  - The feed + caption dock becomes a bottom sheet with three detents: peek (caption
    only) · half (caption + last ~5 feed lines) · full (feed). Captions stay embedded
    in the sheet — §9.14 (no floating pop-over narration) holds at every width.
- The lot-card slide-over becomes a full-height sheet over the map (map stays behind
  it — §9.9 holds); §4.5 cutout/spotlight mechanics unchanged.
- Feed lines keep the §1.1 grammar but collapse to the essential columns
  (time · PROV · actor · verb-object · STATUS), value on a second indented line —
  truncation, never smaller fonts (§1.1 column discipline).
- Motion budget identical: the one settle arc, the 2–3 s cadence, no added mobile
  flourishes.

---

## 5. Badge system (LIVE/SIM/TESTNET/TO-BUILD + join-confidence)

### 5.1 Two orthogonal pill systems — never merged (explorers report)

- **Provenance chips**: `LIVE / SNAPSHOT / SIM / TESTNET / TO-BUILD` — **monochrome
  outlined, monospace caps, Etherscan method-pill register**. They do NOT use status
  colors and do NOT use agent-type hues (three color systems, zero collisions: agents
  colored, status colored, provenance outlined-neutral). TO-BUILD additionally renders
  its carrier at reduced opacity. `SNAPSHOT` is the degraded form of LIVE (spec §4
  pre-mortem hardening): same outline register, ALWAYS paired with the snapshot date
  (`SNAPSHOT · 2026-07-0X`); it replaces LIVE wherever the on-load re-fetch failed —
  rendering a LIVE chip over snapshot data is a build bug (§4.8).
- **Status pills**: `OK`(green) / `PARTIAL`(amber) / `FAILED`(red) / `PENDING`(amber,
  may pulse) / lifecycle words (`BID / FILLED / SETTLED / DECLINED`) — one word, GitLab
  status-color vocabulary (gray=queued, blue=working, orange=attention, green=done,
  red=failed).
- The axes are independent by design: a SIM solver's bid can be `FILLED`; a LIVE read
  can be `PARTIAL`. Rendering both chips on one line is correct, not redundant.
- Every lot, agent, price, and settlement carries its provenance chip adjacent to the
  value — persistent, small, never a footnote (Stripe test-mode signaling; spec §6).

### 5.2 Confidence: binary marks + labeled levels, never numbers

- Diligence field checks render **binary**: solid check = verified · hatched box =
  unverifiable/missing (Fuselab tested binary vs percentages — binary won). The EUDR
  check on the anchor lot shows plot-geo and DDS as hatched PARTIAL fields — the honest
  gap IS the credibility feature (acceptance criterion 9).
- **EUDR is a document chain, never a badge** (Sourcemap): enumerated field rows (plot
  geolocation · harvest window · legality evidence · DDS reference) resolving to a
  nullable DDS ref number; the diligence agent's audit trail linkable from the row.
- **Certifications** = scheme name + linked evidence document (Algrano) — never a bare
  icon.
- **join_confidence renders as a labeled level**, Blockscout relationship-tag style:
  `deterministic` / `name+place match` / `unmatched` — with the sentence "linked by
  producer/community, not by platform id" on the anchor (spec §5 B3/schema). Never a
  0–100 number, never a meter. The identity beat is labeled **cross-surface** (both
  surfaces EthicHub's) per MARKET-ATTACK code-honesty.

---

## 6. Lot card — block order (Atlas asset page, extended)

The lot card is the Atlas asset page with grafted sections. It opens as the slide-over
of §3.3 and is also GitLab's "update, don't replace" anchor artifact: it starts sparse
at scout-pin and visibly gains sections as each agent completes (diligence result,
price, intent status, settle receipt). Block order, top to bottom — **data always above
story** (EthicHub: producer narrative comes AFTER specs):

1. **Header**: EthicHub 3-segment title grammar as the lot's display name everywhere —
   `N.O.P. / Chiapas (Mexico) – Bourbon Honey – 86 SCA` — + provenance chip (LIVE, or
   SNAPSHOT + snapshot date when the on-load re-fetch failed, §4.8 — the chip and
   `fetched_at` are the only things that change) + `fetched_at` with a time-format
   toggle (Etherscan trinity) + source link.
2. **Content-addressed lot ID**: full monospace + copy icon, rendered like a tx hash
   (spec B2 — "the namespace is the algorithm, not us").
3. **Keyed spec list** (EthicHub, one attribute per line, label bolded): Origin ·
   Variety · Altitude (`1,700–2,000 m.a.s.l.` range form) · Process · Drying · Harvest
   2025 · Weight/state.
4. **Sensory profile** as its own block (EthicHub: sensory never mixed into origin):
   Aroma / Taste / Body / Acidity / SCA.
5. **Price & spread**: asking `FOB €17.00/kg (€1,190 lot)` · the two-register oracle
   line (§2.4) · spread vs fair FOB with delta grammar (§2.6). Producer-share sits here
   quietly as one row — no meter, no preaching (spec Q18).
6. **Diligence / EUDR panel**: binary field rows per §5.2, PARTIAL fields hatched,
   audit-trail link.
7. **Bottom attribute table** (EthicHub attribute-table pattern, carrying the schema
   extras): `Lot Type: Single Producer Lot` · `Custody: IP` · `identity_stage` ·
   `ico_mark: —` · `join_confidence: name+place match` (labeled level) · blend
   composition when present (the one sim community-blend lot shows N deliveries → one
   lot here).
8. **Activity/history**: this lot's feed lines, same grammar as §1 (Bloomberg
   consistency), parent-linked.
9. **Intent/settle section** (appears when reached): intent id, bid table (landed
   stacks, §2.5), fill attribution ("filled by @solver-backstop · margin 2.1%" —
   mempool's mined-by pattern), the matched buyer demand card (§6.1) as the fill's WHY,
   settle depth "Base Sepolia · N confirmations" + explorer link (Etherscan
   settlement-depth-as-number), and the settle chain as labeled rows:
   `credited: cooperative/exporter node` followed by a dimmed
   `farmer pass-through — via co-op credit stack · SIM` row (spec §5 settle realism —
   a settle row that reads as direct farmer payout is a build bug).
10. **Producer story** last, after all data (EthicHub).
Progressive disclosure: join_keys, raw schema JSON, snapshot history behind "Show more"
(Etherscan).

### 6.1 Buyer demand card (spec §3.6 — "the judge sees WHY it filled")

- One card per SIM buyer, `--aq-panel-2`, shown in the docked panel during the Fill
  chapter (beat B7). Header: `@sim-buyer-eu · SIM` + the words "standing demand". Body
  = the §1.2 label:value sheet, one row per criterion:
  `Origin: Chiapas` · `Quality: SCA 84+` · `EUDR-readiness: flagged` ·
  `Landed: ≤ €19.50/kg`.
- On fill-match, each criterion row takes the §5.2 **binary mark** against the lot's
  actual value: solid check + the satisfying value (`SCA 84+ ✓ 86`;
  `Landed ✓ €19.06/kg`). EUDR-readiness renders the hatched PARTIAL mark — flagged,
  not required (acceptance criterion 9) — never a green wall (§9.6).
- The card persists into the lot card's intent/settle section (§6.9) as the fill's
  WHY. The demand card is the ONE place matching is explained — captions stay ≤30
  words and never carry the criteria list.

---

## 7. Ask chapter (final chapter — two beats)

### 7.0 Five-functions mapping (beat B9 — acceptance criterion 8)

One beat BEFORE the ask screen maps the RFP's five middleman functions to layer
components — the demo's own answer to "you dropped the farmer app." It renders as a
**5-row mapping table in the docked panel** (not on the map), §1.2 label:value sheet
register — columns: RFP function · layer component · provenance chip (§5.1):

| RFP function | Layer component | Chip |
|---|---|---|
| grade | aggregated/imported attestations (cert layer) | `TO-BUILD` — carrier at reduced opacity per §5.1; caption names it "aggregated, not self-generated" |
| origin record | scout reads + content-addressed lot ID (§6.2) | `LIVE` |
| buyer match | intent/solver network + demand card (§6.1) | `SIM` |
| live pricing | two-register oracle line (§2.4) | `LIVE` |
| farm-to-sale tracking | route graph + custody/storage nodes (§3.3) | `LIVE`/`SIM` per element |

The honestly-badged grade row IS the beat's point (§9.6 no-green-wall applies to chips
too). Caption, ≤30 words, second person: "You asked for five middleman functions —
here is where each lives in the layer, including the one we haven't built." No new
visual grammar: it is a §1.2 sheet carrying §5.1 chips.

### 7.1 Ask screen (beat B10)

Layout = Lattice two-path end screen over a Radar quick-bytes card grid:

1. **Three glanceable stat cards** (mempool countdown-card grammar, label:value, NOT
   prose): **What $50k funds** · **Milestones** (F8 user-event milestones: registry API
   public + first external query → first non-anchor platform via ERP import → first
   external self-host; each with a Blockscout-style fraction/scope bar) · **What
   compounds in the open** (F10: canonical lot schema + content-addressed lot ID + open
   registry lead; connectors/solver named as reference implementations).
2. **Tesla-style KPI row**: 3–4 large numerals max, small unit captions (Prigent;
   Shopify rate-counter register): lots aggregated · platforms read live · spread
   surfaced · the real settle tx. No dashboards of meters.
3. **The single RCT line** (the one permitted evidence line, spec Q37), rendered as a
   TradingView labeled-verdict strip — a short labeled scale/sentence, not a paragraph:
   matching-without-price-info-alone is the unlock.
4. **Two named paths** (Lattice: tell them exactly what they'll see): primary CTA =
   the ask; secondary = "Replay the fill" and "Read the real-vs-sim ledger". CTAs
   concentrate HERE and nowhere else (Navattic: top demos concentrate CTAs in 1–2
   steps); dark-neutral buttons.

---

## 8. Ledger page (the diligent judge's page — spec §6)

- Blockscout tab structure: **Summary / Live reads / Sim actors & lots / Testnet txs /
  Raw** — tabs present even when thin, each thin tab says why (Blockscout documents
  empty-tab copy as a feature).
- Live-reads tab: every LIVE element with `fetched_at` + source URL + snapshot status
  (LIVE vs SNAPSHOT per §4.8), plus any anchor-fallback switchover record
  ("anchor fallback: lot 79 unavailable → lot NN", §4.8).
  Sim tab: each SIM agent as a card — name, handle, one-line capability, its
  brief (objective/tools/boundaries — Anthropic task-description structure), calibration
  note (power-law params), and its **ROMA-role mapping** (spec Q36: first-class here).
  The same tab **enumerates every synthetic LOT** (acceptance criterion 5 "enumerates
  all of them"): each map-breadth sim lot and the community-blend lot as a card —
  fictional co-op name flagged AS fictional, one line on why it exists (map breadth /
  commingling visibility), SIM chip. x402 agent-payment lines list here too,
  SIM-labeled in the §1 grammar, with the spec §5 caveat verbatim: capability claimed
  with a receipt, not wired into the demo.
  Testnet tab: tx list in the §1 grammar with explorer links.
- The ledger states the cross-surface (not cross-platform) labeling and the circular-
  cert-check caveat verbatim (MARKET-ATTACK code-honesty).
- mempool spatial split for intent lifecycle where intents are listed: open intents
  left with forecast microcopy ("fill window ~T+45d"), settled right with age +
  winning-solver attribution.

---

## 9. DO NOT (anti-patterns the references warn against — enforceable)

1. **No autoplay.** User-triggered tours complete 2–3× better (Chameleon).
2. **No unbroken flow >6 steps** (Navattic completion cliff) — chapters exist for this.
3. **No decorative motion**: no pulsing/glowing/breathing on unselected marks; the only
   pulse is the active chapter pill (FR24/Windy/Appcues).
4. **No celebration except the settle** — celebration budget is exactly 1 (Shopify).
5. **No confidence percentages, meters, or gauges** — binary marks + labeled levels
   only (Fuselab; Prigent).
6. **No green wall**: never render the EUDR check as all-pass; the hatched PARTIAL
   fields are required (acceptance criterion 9; Fuselab "agent always right" = the
   named demo anti-pattern).
7. **No price without incoterm; no C-quote without an origin differential; no bid as
   price±random** — bids are itemized landed stacks (Algrano; DRWakefield; spec §3.4).
8. **No "N/A", no blank cells** — em-dash for missing (TradingView).
9. **No navigation away from the map** to explain the map — panels slide over
   (Windy/Stripe/FR24).
10. **No tooltip/caption covering the element it describes** (Storylane).
11. **No black dim overlay on the dark map** — light/desaturating overlay (driver.js).
12. **No merging of the three color systems**: agent-type hues ≠ status colors ≠
    provenance chips (monochrome outline). A colored LIVE badge is a build bug.
13. **No feed faster than ~2 s cadence** — instant dumps read as fake (FR24).
14. **No floating pop-over narration** — captions live in the docked panel (Chameleon).
15. **No welcome modal that educates** — 2–3 sentences, route and go (Chameleon 38%
    dismiss).
16. **No low-contrast hotspots on the dark UI** (Appcues failure mode) — the moving
    cutout replaces beacons entirely.
17. **No fictional platform names; no story above data; no raw identifier without a
    human label; no identical replays presented as live** — variance rendered, end
    state verified (spec §2; EthicHub; Etherscan; Anthropic).
18. **No spread/producer-share preaching** — one quiet row in the lot card (spec Q18).
19. **No prose status**: status is a one-word pill (Etherscan).
20. **No new visual grammar per surface** — feed, lot history, and ledger share the §1
    line verbatim (Bloomberg).
21. **No LIVE chip over snapshot data** — a failed re-fetch renders `SNAPSHOT` + date
    everywhere the lot appears (§4.8, §5.1).
22. **No settle that reads as direct farmer payout** — the arc and the settle rows
    credit the cooperative/exporter node; farmer pass-through is a labeled SIM
    downstream step (spec §5 settle realism, §3.2, §6.9).
23. **No tour longer than the locked beat map** — 10 beats, 1–2 per chapter (§4.2);
    3+ beats in any chapter is a build bug.
24. **No blank or spinner-as-content surfaces** — cold load renders em-dash values +
    loading-form count microcopy; errors are FAILED feed lines, never modals (§4.7).

---

## 10. Build checklist (what this brief adds to the gates)

- [ ] Tokens from §0 defined once; no ad-hoc hex in the swarm layer.
- [ ] Feed line renderer implements §1.1 grammar + §1.2 expand; used by feed, lot
      history, ledger.
- [ ] Feed↔map hover sync both directions (§1.3).
- [ ] All prices carry incoterm + dual denomination; oracle line two-register (§2).
- [ ] Glyphs: type=hue, state=shape, provenance=stroke; one settle arc only (§3).
- [ ] Rail = checklist-launcher, welcome modal, docked captions, light-overlay cutout,
      choreography-gated Next (§4).
- [ ] The locked 10-beat map implemented exactly (§4.2) — incl. identity-resolution
      (B2), finance-intent (B6), and five-functions (B9) beats.
- [ ] Settle arc terminates at the cooperative/exporter node; farmer pass-through
      labeled SIM; vault count badge ticks and persists (§3.2).
- [ ] Cold-load em-dash states, PENDING re-fetch, empty-feed line, FAILED-as-feed-line
      error handling (§4.7).
- [ ] SNAPSHOT chip + snapshot banner + pre-tour fallback-lot switchover with ledger
      record (§4.8, §5.1).
- [ ] Global honesty banner strip + footer (ledger · lineage · repo) on every surface
      (§4.9).
- [ ] ≤900 px layout: chip-strip rail, three-detent bottom sheet, full-height lot
      sheet, essential feed columns (§4.10).
- [ ] Provenance chips monochrome-outlined; status pills colored; join_confidence
      labeled level; EUDR document chain with hatched partials (§5).
- [ ] Lot card block order §6, sections appearing as agents complete; buyer demand
      card with binary criterion marks (§6.1).
- [ ] Five-functions mapping table (§7.0) + ask screen (§7.1); ledger §8 with tabs +
      ROMA mapping + sim-lot enumeration + x402 SIM lines.
- [ ] Oracle fallback tiers render in the same two-register grammar, source named +
      dated (§2.4).
- [ ] Grep the DO-NOT list (§9) against the built UI before Gate 2.
