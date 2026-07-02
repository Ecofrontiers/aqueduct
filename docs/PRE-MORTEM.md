# Aqueduct Demo — Pre-Mortem (adversarial, written before the build)

> Written 2026-07-02 by a critic with no hand in the spec. Premise: it is six weeks from
> now, the demo was built exactly to `DEMO-SPEC.md` v2, submitted to Sentient, and FAILED.
> These are the plausible failure paths, ranked by severity × likelihood, each with the
> CHEAPEST mitigation (spec edit / scope cut / labeled risk — never a rebuild).
> Evidence base: DEMO-SPEC.md, SOURCE-MATERIALS.md, research/01–06. No web research.

---

## Ranked failure-path table

| # | Failure path | Severity | Likelihood | Spec section attacked | Cheapest mitigation |
|---|---|---|---|---|---|
| 1 | **RFP shape mismatch** — funder asked for a farmer-facing app doing 5 functions "from a photo"; demo ships a B2B-looking layer that DROPS the RFP's headline function | Critical | Med-High | §2 (grade-from-photo DROPPED), §8 | Spec edit: add one tour beat + ledger row mapping the 5 RFP functions to layer components; argue the inversion explicitly |
| 2 | **Build never converges** — hidden platform build behind 7 "simple" criteria; ICE C feed never feasibility-spiked; first-wave window eaten | Critical | Medium | §7 crit. 3/7, §3.3, §9 deadline | Spec edit: date-box MVP tier; day-one ICE spike with named fallback source; demote crit. 3 to "scripted cascade replays cleanly" |
| 3 | **The money shot is theater** — every actor in the climax is SIM except a self-triggered testnet tx that proves nothing to a crypto-native panel | High | Med-High | §2 money shot, §3.4–3.6, §7 crit. 4 | Spec edit: backstop solver's bid computed by the REAL Routes landed-cost engine on the real lot — "1 real solver + N sim rivals," say so in the caption |
| 4 | **EthicHub single point of failure + consent** — shop inventory churns (lot 79 can sell), internal API undocumented, real named producers rendered inside a fake economy, EthicHub objects to Sentient | High | Medium | §4 EthicHub, §7 crit. 2, §9 outreach | Snapshot-with-timestamp architecture + 2 fallback anchor lots; upgrade outreach from "recommended" to pre-submission gate; ledger line: "no real transaction touches EthicHub inventory" |
| 5 | **"Who are you to farmers?"** — zero field presence, zero venue relationships, zero Global-South team; "routes intents TO venues" that were never asked; sustainability story unwritten | High | Medium | §2 incumbent stance, §10, SOURCE-MATERIALS Q2(d) | One reply/LOI from EthicHub or Algrano before submission; one spec paragraph: "we operate the reference solver at visible margin — the layer takes no rent" (the Across/Nessus answer) |
| 6 | **Internal contradiction cluster** — EUDR diligence vs. anchor-lot data gap; buyer criteria demand "EUDR-traceable" the hero lot can't satisfy; "farmgate" string ban collides with the literature; "watched live" vs. on-rails replay | Med-High | High (if unedited) | §3.2, §3.6, §7 crit. 6, §2 money shot | Four small spec edits (below) — all pre-decidable now |
| 7 | **Tour opens on a wall of SIM** — first screen = map of mostly-labeled-sim pins + honesty banner; judge tallies badges and concludes "almost nothing here"; bounces by beat 2 | Medium | Medium | §2 front door, §6 | Reorder: beat 1 = the REAL lot (live badge, fetch timestamp), breadth second; ledger leads with the LIVE column (Celo onchain reads are real — make live density visible) |
| 8 | **First-wave funder risk** — 8-day-old program, no grantees, council unformed; bar unknown; review stalls or shifts; crypto-heavy demo read as token-adjacent on the grant track | Medium | Medium | §9, research/06 | Labeled risk: submit fast (MVP tier), keep grant-track language public-goods pure, no SENT/token proximity anywhere |
| 9 | **Operational fragility at judge-time** — live EthicHub fetch fails during the judge's session; per-run testnet settles need a funded key on a public demo | Low-Med | Medium | §7 crit. 2/4 | Cached-live pattern ("last fetched N min ago") mandated in spec; one canonical settle tx, honestly labeled as replayed, optional "trigger fresh settle" button |
| 10 | **Scrub misses** — card-domain strings survive in forked `routes/` history/comments; `api.slabclaw.com` in a lockfile or fixture | Low-Med | Medium | §2 card lineage, §7 crit. 6 | CI grep gate in the repo (deny-list: farmgate, slabclaw, charizard, pokemon, psa/cgc/bgs card terms) run on every commit — one hook, done |

---

## The failure paths, worked

### 1. RFP shape mismatch — the judge scores against the checklist we opted out of (CRITICAL)

The RFP's own words (SOURCE-MATERIALS): "From a photo it **grades the produce, generates an
origin record… matches the lot to buyers, prices it against the live market, and tracks it
from farm to sale**." Five functions, framed as a farmer-facing app. The spec:

- **Grade-from-photo: DROPPED** (§2) — the RFP's *first-listed, headline* function.
- **Farmer-facing app / cheap-Android: OUT** (§8) — the RFP's protagonist ("a farmer carries
  her harvest…") never appears in the demo.
- Two of the funder's six beliefs are conceded misses (Accessible, Private-by-default —
  research/06 §4).

Research/06 calls this "the central tension of the bid… it must be argued explicitly, not
papered over" — but the spec routes the entire argument to the application rewrite (§10)
and the deck (§2 swarm-meaning row). The demo itself — the thing Q2(f) requires and the
thing the spec calls "the truth" — contains **no visible answer** to "where is the farmer
and where is the photo-grading?" A cold reviewer who opens the URL before reading the
application (the likely order: Q2(f) is a required field) scores 2–3 of 5 functions and
moves on. Worse: a reviewer sympathetic to the layer thesis still can't find it stated
*in the demo*, because §2 explicitly pushes the argument out of the UI ("the explicit
argument lives in the deck, not the UI").

**Why this kills:** the failure isn't that the layer thesis is wrong — research/02 shows
it's *stronger* than the app framing (Peru SMS worked only WITH an alternative buyer; the
matching layer is the unlock). The failure is that the thesis lives everywhere except the
one artifact the form requires.

**Cheapest mitigation (spec edit, ~1 beat):** one tour beat (or the ask-screen's top half)
titled "the five middleman functions" — a 5-row strip mapping RFP function → layer
component → status (`origin record: LIVE (EthicHub read + Celo)`, `pricing: LIVE (ICE C)`,
`buyer match: SIM (this demo)`, `tracking: SIM route`, `grade-from-photo: TO-BUILD — the
open layer is what makes any grading app non-extractive`). This keeps the subtlety rule
(no preaching) while making sure the checklist-scoring reviewer finds their five functions
answered *inside the demo*. Also add one greyed "farmer app" node at the map's edge,
labeled TO-BUILD, so the protagonist visibly has a place in the architecture.

### 2. The build never converges — a "demo" that is secretly a platform (CRITICAL)

Count the surface behind criteria 1–7: Atlas fork adaptation + guided-tour engine with
captions + 6 animated agent types + activity feed + a calibrated sim economy (power-law
wins, Dutch auctions, itemized 7-line cost vectors with confidence tags, solver P&L
ledgers, a scripted slash event — research/04's parameter table is a *product spec* on its
own) + EthicHub connector (HTML scrape + JSON API + Celo eth_call) + ICE C price feed +
Base Sepolia integration + real-vs-sim ledger page + universal badge system + fresh-clone
build (crit. 7) + a card-domain scrub of `routes/`. That is weeks of work wearing a
weekend demo's clothes.

Two specific convergence traps:

- **Criterion 3** ("full swarm cascade plays end to end without manual intervention") is
  an *orchestration reliability* requirement — the hardest class of demo bug — imposed on
  a tour that is already defined as on-rails (§2). An on-rails tour doesn't need live
  orchestration; it needs a cascade that *replays* deterministically.
- **The ICE C feed was never spiked.** EthicHub got a real feasibility spike with a YES
  verdict (research/03). The other "LIVE tier minimum one real feed" (§3.3, §5) rests on
  "ICE C-contract public quote" — ICE market data is licensed; free surfaces are delayed,
  scrape-hostile, or ToS-encumbered. If the one real price feed proves infeasible on day 3,
  the LIVE oracle tier — one of only two live legs in the whole demo — silently degrades
  to sim, and acceptance is unreachable as written.

**Cheapest mitigation (spec edits):** (a) date-box the MVP tier now — §9 says "scope-tiered,
not date-cut," which is exactly how first-wave windows die; research/06's whole timing
argument ("Real builders with real repos move fast. So will we") decays weekly. (b) Add the
ICE spike to the §4 day-one connector spike list, with a pre-approved fallback price source
named in the spec (any publicly published daily coffee reference price qualifies for
"≥1 real tier"). (c) Reword criterion 3: "the scripted cascade replays end-to-end cleanly
on every tour run" — same judge experience, one class of failure removed.

### 3. The climax is theater and the panel is expert in exactly this theater (HIGH)

The money shot: "publish → solvers compete → fill → onchain settle, watched live." Audit
the realness of each actor at that moment: the intent (published by a SIM buyer), the
solvers (SIM), the bids (SIM), the buyer (SIM), the vault (SIM), the settle (a real tx —
*triggered by the demo itself, on a testnet, settling a simulated fill*). The labels are
honest, but honesty doesn't change what the judge is watching: a labeled animation whose
single "real" element — the tx hash — is the least evidentiary thing a crypto-native
reviewer can be shown. Kamiya (ex-Polygon Ventures) and the ROMA authors have seen a
thousand testnet txs; they know a self-settled Sepolia receipt proves key possession, not
a market. Research/04 warns the sim reads as decorative if it fails the shape tests — but
even a perfectly calibrated sim is still a sim, and the tour's *climax* is its most
simulated moment. The demo's actually-real material (server-rendered lot scrape, live Celo
CreditLine reads, a real deployed IntentRegistry) is all in the *quiet* beats.

**Cheapest mitigation (spec edit, no rebuild):** the open reference solver (§2 backstop
row) should not be sim-scripted — its bid should be **computed at runtime by the real
Routes landed-cost engine** (the code already exists; research/04's cost-vector table maps
1:1 to the shipped route-cost oracle). Then the race is honestly "1 real solver + N
simulated rivals," the caption says so, and the winning bid the judge inspects is real
code output on a real lot — forkable, per the backstop's own story. This converts the
weakest beat into the openness proof: "click here to see the solver source." One sentence
in §3.4; the engine is already built.

### 4. EthicHub: one real source, and it's a live shop with real people in it (HIGH)

Four distinct sub-risks, all attacking §4/§7-crit-2:

- **Inventory churn.** The anchor is a *shop listing* (22 lots). Lots sell out. If lot 79
  (Neri Ortíz Pérez) disappears between build and review, a naive live-fetch architecture
  breaks the anchor beat at judge-time; a stale cache shows a weeks-old timestamp under a
  LIVE badge — either way criterion 2 degrades exactly when it matters.
- **Surface drift.** `app.ethichub.com/api/v1/*` is an undocumented internal API
  (research/03 fragility notes: "could change without notice"). Odoo markup is stable-ish;
  the API is not a contract.
- **Consent and depiction.** The demo renders a *named real smallholder* and his real
  €17/kg offer inside a simulated economy where fake solvers bid on his coffee, a fake
  buyer "wins" it, and a fake settlement completes. Every badge can be correct and the
  optics still bad: a real person's livelihood used as a prop. §9 makes outreach
  "recommended… Pat approves" — i.e., optional. If EthicHub discovers the demo cold (the
  Celo/Sentient world is small; Celo is a GRID launch chain AND EthicHub's home chain —
  the overlap that makes the roadmap elegant is the same overlap that guarantees
  discovery), one annoyed email to Sentient ends the application. The neutral-rails story
  (§2) makes this worse, not better: "venues render as first-class nodes the layer routes
  intents TO" — no venue agreed to be a node, and none has an intent-receiving surface.
  "Being aggregated" is not "joining."
- **Sim-fill ambiguity.** A judge could momentarily believe the demo *transacted* against
  EthicHub's real inventory. That misreading flatters the demo — which is exactly why it
  will feel like intent if not pre-empted.

**Cheapest mitigations:** (a) snapshot-with-timestamp as the *architecture* (live fetch
refreshes the snapshot when it succeeds; the card always renders the snapshot + "fetched
2026-07-XX HH:MM" + source URL — this satisfies criterion 2's letter verbatim); (b) two
fallback anchor lots pre-selected from the other Chiapas listings (research/03 lists six);
(c) upgrade §9 outreach to a pre-submission gate — a two-line courtesy email to EthicHub
costs nothing and converts the biggest external risk into a possible LOI (see path 5);
(d) one ledger sentence: "No real transaction touches EthicHub inventory; the fill and
settlement simulate what the layer would do."

### 5. "So who pays for this, and who are you to farmers?" (HIGH)

Two hostile questions the current spec has no written answer to:

- **Sustainability.** Neutral rails, no toll, MIT, forkable, no take-rate — every
  anti-enclosure choice is right for belief #6 and simultaneously deletes every visible
  revenue line. "Long-term potential" is one of the four formal axes. Research/04 supplies
  the honest answer (every real intent network is sustained by a first-party solver:
  CoW's DAO-underwritten solvers, Across's Nessus at ~half of volume, UniswapX's
  standing fillers): **Aqueduct's business is operating the best solver on its own open
  rails, at a visible 1–5% route margin; the layer itself takes nothing.** This survives
  the middleman-fear paragraph *because* the solver is displaceable by forks — but it is
  written down nowhere in the spec or application inputs.
- **Standing.** Q2(d) asks "why is your team the right one." The honest inventory: a
  published book, shipped rails, a Hedera diligence loop — and zero farmer relationships,
  zero venue relationships, zero Global-South presence, for a funder whose review promise
  is "reaching deliberately into multilingual and underserved markets" and whose RFP
  protagonist is a farmer. An aggregation layer whose builders have never exchanged an
  email with a single platform they aggregate is one pointed panel question from collapse.

**Cheapest mitigations:** (a) one paragraph added to §10 rewrite inputs — the
first-party-solver sustainability model, cited to the research/04 §3 bootstrap table;
(b) the same outreach gate as path 4 — even ONE reply from EthicHub or Algrano ("happy to
be read, keep us posted") upgrades Q2(d) from "we scraped them" to "we're in contact,"
and research/06 says receipts are this panel's register.

### 6. Internal contradictions that will surface as build-time judgment calls (MED-HIGH)

Each of these is two spec clauses that collide the day someone implements both. The spec
bans silent judgment calls (§0), so unresolved they become blocking questions to Pat
mid-build; resolved now they're free.

- **EUDR diligence vs. the anchor lot's actual fields.** §3.2: the diligence agent
  "visibly checks the concrete fields (plot geolocation, harvest window, legality
  evidence, DDS reference)." Research/03's field table: EthicHub's public surface has
  altitude, process, SCA, harvest season — **no plot geolocation, no DDS**. So the hero
  lot must either FAIL its most prominent on-screen check or the check gets faked.
  *Edit:* pre-decide the verdict — the anchor lot renders **CAUTION** with the two missing
  fields named, and the caption owns it ("this is what honest diligence output looks like
  — most real lots are exactly here before Dec 2026"). Turns the collision into the
  demo's credibility peak.
- **Buyer criteria demand what the lot can't prove.** §3.6's example buyer wants
  "Chiapas, SCA 84+, **EUDR-traceable**, ≤$X landed" — that buyer cannot match the CAUTION
  anchor lot without lying. *Edit:* the demo buyer's criteria drop EUDR; optionally a
  second standing buyer visibly *declines* on the EUDR gap (one more honest beat, free
  narrative).
- **Criterion 6 vs. the literature.** "Zero occurrences of the string
  'farmgate'/'Farmgate' anywhere in repo, UI, or docs" — but "farmgate price" is the
  standard ag-economics term, used (correctly, lowercase) in research/02 and /05, which
  live in `docs/`. As written, the repo already fails its own acceptance criterion.
  *Edit:* ban `Farmgate` as a name (case-sensitive, standalone) in product code/UI/copy;
  exempt the lowercase domain term in research citations.
- **"Watched live" vs. on-rails.** §2 promises the settle "watched live" AND "zero
  live-demo breakage risk." Every visitor triggering a fresh Sepolia tx needs a funded
  hot key on a public URL (drainable, faucet-limited); one canonical replayed tx means
  every judge sees the same hash under a "live" caption — a small dishonesty in the one
  demo whose differentiator is honesty. *Edit:* canonical settle, labeled as the recorded
  run's receipt, with an explicit "trigger a fresh testnet settle" button as the live
  option. Ambiguity resolved, honesty preserved.

### 7. The tour's first 20 seconds lead with what's fake (MEDIUM)

§2: front door = the aggregated map; §6: global banner "Live reads + simulated economy" +
SIM badges on every synthetic element. Composite first impression for a cold judge: a map
where most pins are labeled SIM, under a banner whose first clause they may not finish
reading. The judge's tally instinct (these are diligence people) runs badge arithmetic:
~80% SIM. Honesty-as-differentiator flips into self-indictment when the *density* of real
material is invisible — and the demo actually has more real material than it shows off
(live Odoo scrape, 688-project lending API, real Celo CreditLine structs, a deployed
registry). Meanwhile beats 4–7 (certs → diligence → oracle → intent) are the densest and
judge-clicked with no autoplay — the venture-operator attention budget is ~90 seconds and
the payoff beat is #8.

**Cheapest mitigations:** (a) reorder — beat 1 opens *zoomed to the real lot* (LIVE badge,
fetch timestamp visible), then pulls back to the aggregated map; real first, breadth
second; (b) the ledger page leads with the LIVE table before the SIM table, with counts;
(c) captions hard-capped at 2 sentences; (d) autoplay-after-8s fallback so an idle judge
still reaches the climax.

### 8. The funder is 8 days old — the bar doesn't exist yet (MEDIUM)

No grantees, no named council, rolling review, prose written by the same people reviewing
it (research/06). Failure modes nobody controls: the bar calibrates *after* first
submissions (early = exemplar-or-rejection-lottery); the review stalls while the council
assembles; the program pivots tracks; a crypto-forward demo on the *grant* track pattern-
matches to "token project fishing for a public-goods check" if a single element smells
token-adjacent. Also first-wave cuts both ways: the same 8 days mean *no application
backlog and maximal showcase appetite* — the risk of waiting exceeds the risk of the
unknown bar.

**Cheapest mitigation (labeled risk + posture):** submit the MVP tier fast rather than the
full tier slow; keep SENT/token/airdrop entirely out of demo and application; grant-track
language stays public-goods pure ("No equity. No lockups… Just build." is their frame —
mirror it). Accept the residual risk in writing; it is not mitigable further from outside.

### 9–10. Operational fragility + scrub misses (LOW-MED)

Covered in the table. The one addition worth a line: criterion 7 (fresh-clone build) should
be verified in CI from day one, not the last day — a fresh-clone failure discovered at
submission hour is a classic convergence killer; and the card-domain scrub (§2) should be
a repo CI grep gate (deny-list: `Farmgate` (name), `slabclaw`, `api.slabclaw.com`,
`charizard`, `pokemon`, card-grading terms) rather than a one-time manual pass over a
forked codebase whose history and fixtures were written in another domain.

---

## What the spec gets right (so the mitigations don't undo it)

The honesty mechanics (§6), the backstop-solver concept, the settle-realism rule
(co-op-credited, never farmer-phone — §5), the research-calibrated sim parameters, the
ERC-8004-as-greyed-roadmap call, and the ban on the three indefensible claims are all
correct and load-bearing. Every mitigation above is an edit *inside* that frame; none
requires new scope. The single theme across the critical paths: **the spec's honesty is
currently pointed inward (labeling what's fake) and needs three cheap redirections
outward — show the RFP's five functions answered, make one solver real, and put the
realest material first.**

---

## Verdict

**BUILD-READY-WITH-EDITS.** The spec is coherent, researched, and honest, but as written
it (1) hides its answer to the funder's actual RFP outside the required artifact,
(2) contains four clause-level contradictions that will surface as mid-build escalations,
(3) stakes its climax entirely on simulation when a real solver is one sentence away, and
(4) carries an unspiked dependency (ICE C) and an optional-but-actually-load-bearing
outreach step. All fixes are spec edits or process gates — no rebuild, no new scope.

**The edit list (all cheap):**
1. §2/§3: one tour beat or ask-screen strip mapping the RFP's five middleman functions to
   layer components with status badges; greyed "farmer app" TO-BUILD node on the map.
2. §3.4: the open reference solver's bid is computed by the real Routes landed-cost
   engine at runtime — "1 real + N sim," captioned as such.
3. §3.2/§3.6: pre-decide anchor-lot diligence = CAUTION (missing plot-geo + DDS, named);
   demo buyer's criteria drop "EUDR-traceable" (optional: second buyer declines on it).
4. §4: add ICE C to the day-one spike list with a named fallback public price source.
5. §5/§7: canonical settle tx, honestly labeled as the recorded run + optional
   fresh-settle trigger; reword criterion 3 to "scripted cascade replays cleanly."
6. §7 crit. 6: scope the "farmgate" ban to the *name* (case-sensitive, product surfaces);
   exempt the lowercase ag-economics term in research docs.
7. §9: date-box the MVP tier; upgrade EthicHub/Algrano outreach from "recommended" to a
   pre-submission gate (courtesy email minimum).
8. §10: add the sustainability paragraph — first-party solver at visible margin on open
   rails (the Across/Nessus precedent), layer takes no rent.
9. Repo process: CI gates for fresh-clone build (crit. 7) and the card-domain/name
   deny-list grep, from day one.
