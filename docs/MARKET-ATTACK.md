# Aqueduct — Market Adversarial Review (venture stress test)

> Written 2026-07-02 by a hostile reviewer: part venture investor (the Kamiya chair — ex-Polygon
> Ventures, reads receipts), part agtech operator who has watched ten "farmer platform" decks die.
> Target: `docs/DEMO-SPEC.md` v2 (the locked build contract), plus whatever of
> `APPLICATION-DRAFT.md` carries forward. Evidence base: `docs/research/02, 05, 06, 08`,
> `SOURCE-MATERIALS.md`. The PRE-MORTEM already found: RFP shape mismatch, build convergence,
> money-shot theater, EthicHub SPOF/consent, the unwritten sustainability paragraph, clause
> contradictions, the SIM-wall first impression, first-wave funder risk. **None of that is
> repeated here.** This review hunts the business-logic bugs the pre-mortem missed: unit
> economics, demand-side adoption, customer identity, competitive substitution from the
> funder's chair, and code-market alignment.

---

## 1. Enumerated claims (verbatim or implied)

| # | Claim | Where |
|---|---|---|
| C1 | "An **open financial + logistics layer for smallholder commodities**" | DEMO-SPEC §1 |
| C2 | "**Neutral rails they join** — venues… render as first-class nodes the layer aggregates and routes intents TO; Aqueduct adds no toll and replaces nobody" | DEMO-SPEC §2 |
| C3 | "**Services, not tolls** — layer free + forkable; Ecofrontiers sustains on hosted instances, connector maintenance, integration consulting… the open reference solver earns its visible capped margin when it fills. Both rent-free by construction" | DEMO-SPEC §2 |
| C4 | "**Farmer empowerment** — the judge watches agents compete and concludes 'this machinery works for the producer'" | DEMO-SPEC §2 |
| C5 | The gap sentence: "nobody runs an open, cross-platform aggregation + certification + intent/solver layer over the venues where smallholder commodity production already lives" | DEMO-SPEC §4 / research/05 |
| C6 | Backstop solver: "a forkable, open-source backstop that wins ONLY when no other solver bids; code public, margin visible" | DEMO-SPEC §2 |
| C7 | "the intent/matching layer is the unlock, not the price feed" (the RCT thesis) | DEMO-SPEC §10 / research/02 |
| C8 | Unlock ladder rungs 1–6 as application/deck claims (dedupe registry, EUDR-priced access, liquidation path, WRS-conditional, receivables, Agrotoken-style credit) | research/08 |
| C9 | "**$50k, scoped honestly** — the layer build justifies it" | DEMO-SPEC §2 |
| C10 | "the open layer is what makes any farmer-facing app non-extractive" | DEMO-SPEC §10 / research/06 |
| C11 | "Rails lineage: **domain-neutral citation** — 'we deployed an intent-settlement registry (Base Sepolia) and closed a live USDC→marketplace buy rail'; **verifiable onchain**, zero collectibles language" | DEMO-SPEC §2 |
| C12 | Carry-forward from APPLICATION-DRAFT: milestone gating "on **farmer-retained-value** and independent re-verifiability, never on GMV" (Q5); "that cost collapse… is what makes a $5 lot legible at all" (Q5.3); the Q2(d) team-proof inventory | APPLICATION-DRAFT |
| C13 | Implied: "no moat by design" — MIT, forkable, displaceable operator; durability = ops muscle | DEMO-SPEC §2/§10 |
| C14 | "Identity resolution is a **HEADLINE capability**… two real surfaces resolving into one entity" | DEMO-SPEC §5 B3 |
| C15 | Good for "the people the market forgot" (the funder's screen #1, which the bid claims to pass) | SOURCE-MATERIALS |

---

## 2. Findings

### F1 — CRITICAL · The anchor lot disproves the problem statement (the selection bug)

**Claim (C4, C15):** "Farmer empowerment… this machinery works for the producer"; good for
"the people the market forgot."

**Reality:** The demo's only real farmer is **shop lot 79 — Soconusco, Chiapas, Bourbon Honey,
SCA 86, €17/kg** (DEMO-SPEC §4). Walk the funder's own five functions against him:
he already **has a grade** (SCA 86, cupped), already **has an origin record** (published on a
European webshop), already **has a distant buyer channel** (EthicHub's shop IS the distant
buyer), already **has a price** (€17/kg green — roughly 2× the ICE C commodity level; he is
capturing a large specialty premium, not being denied one), and already **has financing**
(EthicHub lending, 688 projects, Celo CreditLine). The RFP's protagonist — "she has no way to
prove it is worth more" — is, by construction, **not on EthicHub's webshop**. The aggregation
doctrine ("read anything reachable," §2 F1) can only ever see farmers who are already platform-
visible, i.e., the *least* forgotten smallholders. Research/05 makes the ceiling explicit:
EthicHub has 22 live lots; Algrano facilitated 4,000 connections **in ten years**
(research/05 §1). The scrapeable universe is a boutique.

**Why it matters:** Screen #1 of the funder's three ("is this good for the people the market
forgot," SOURCE-MATERIALS) fails on inspection of the demo's own hero. A hostile panelist asks
one question — "your anchor farmer sells at €17/kg with an SCA score and a European lender;
which of the five functions were you doing for him?" — and the empowerment narrative inverts:
the demo shows the layer aggregating an already-solved case.

**Fix:** Reframe the anchor beat's caption and the application's beneficiary logic: the anchor
is the **proof of what legibility looks like when it exists** — and the layer's job is stated as
extending that legibility to the farmers one ring out (EthicHub's own 688 lending-project
communities whose lots never reach the shop; the co-op members behind Cropster ERPs, research/07
roadmap). One sentence in the tour, one paragraph in Q2(b): "the anchor shows the ceiling; the
layer exists to raise the floor." Without this, the demo's realest element argues for the
opposition.

---

### F2 — CRITICAL · The sustainability model is bistable: zero revenue if it works, middleman if it doesn't

**Claim (C3, C6):** "Services, not tolls"; the backstop solver "wins ONLY when no other solver
bids… earns its visible capped margin when it fills."

**Reality — three stacked problems:**

1. **Bistability.** If the solver network bootstraps, the backstop by definition stops winning
   and its revenue → 0. If the network never forms (the realistic case — see F3), the backstop
   fills everything at 1–5% of lot value, making Ecofrontiers the sole execution counterparty on
   its own "neutral" rails: the new middleman, with the margin printed on the label. The RFP's
   fear paragraph is answered in exactly one of the two states, and it's the state with no revenue.
2. **The backstop cannot actually fill.** Research/04 (cited in DEMO-SPEC §3.4) identifies the
   T+7…T+90 physical capital-lock as "THE structural difference from DeFi." A real fill of a
   physical coffee lot means fronting freight, customs, phytosanitary paperwork, and 30–90 days
   of working capital against Cash-Against-Documents (DEMO-SPEC §3.5, research/08 §2c). A
   two-person EU research agency has neither the balance sheet nor the export operation. The
   Routes engine can **compute** a landed-cost bid (pre-mortem fix #2, good); it cannot
   **execute** one. The only revenue mechanism written into the spec is inoperable as described.
3. **Unit economics of the service lines.** Chiapas micro-lots at €17/kg run ~€2–8k a lot;
   1–5% solver margin = **€20–400 per fill**. Even total capture of an Algrano-scale flow
   (~400 connections/yr, a decade in the making) at 3% of generous $20k average lots is ~$240k/yr
   — a theoretical ceiling that requires *abandoning neutrality*. Meanwhile "connector
   maintenance" is a cost center, not a revenue line: the team's own operating history (the
   SlabClaw engine this fork descends from) documents scraped-surface connectors as perpetual
   firefighting — proxies dying, CF-403s, solver rotations. Realistic year-one service revenue:
   near zero. Realistic connector-maintenance labor: tens of thousands of dollars equivalent.
   "Hosted instances" has no named buyer anywhere in the spec, the application, or the research.

**Why it matters:** "Long-term potential" is one of the funder's four formal axes
(research/06 §3). The current answer is a mechanism that either earns nothing or contradicts
the thesis, sold to no named customer.

**Fix:** Split sustainability from the solver. The one **proven willingness-to-pay** in the
entire evidence base is research/08 §2b: **MonetaGo has sold duplicate-financing checks to banks
in India since 2018 across billions of dollars of transactions.** Aqueduct's rung-1 claim (open
lot registry prevents duplicate financing) has a named paying customer class: **lenders and
factors**, not co-ops, not platforms. Rewrite C3 as: layer free and forkable; Ecofrontiers
sustains on **lender/factor-facing services over the open registry** (attestation queries,
diligence-agent reports, EUDR-readiness checks) plus integration consulting; the backstop solver
is a cold-start mechanism, not a business. This survives the middleman-fear paragraph *and*
names who pays.

---

### F3 — HIGH · Demand-side vacuum: no actor in the two-sided market has a reason to show up

**Claim (C2, C5, C7):** venues are "neutral rails they join"; the intent/solver network is the unlock.

**Reality, actor by actor:**

- **Venues:** "routes intents TO" Algrano/GrainChain/AgriDex — but none has an intent-receiving
  surface (pre-mortem noted consent; this is the *economics*). A venue's listing data is its
  asset; cross-venue price comparison commoditizes it. Either an intent routed "to Algrano" goes
  through Algrano's normal take-rate flow (the layer adds a hyperlink) or around it (channel
  war). "Adds no toll and replaces nobody" and "unlocks captured rent" cannot both be true —
  if the layer changes no flows it changes no incomes.
- **Solvers:** the only entities capable of filling physical-lot intents (export licenses,
  working capital, customs) are **incumbent exporters/traders** — the middlemen themselves.
  Joining means bidding transparently against each other with itemized cost vectors,
  i.e., voluntarily destroying their own information rent. There is no stated incentive for a
  single real solver to register. The research/04 DeFi precedents (CoW, Across, UniswapX)
  bootstrapped with *subsidized first-party* solvers in markets with instant, atomic fills —
  the T+90 capital lock breaks the analogy at its load-bearing joint.
- **Buyers:** research/05's own dagger — **"in 2024, 90% of traded volume was between roasters
  and producers with an existing relationship"** (Algrano, research/05 §1). Specialty coffee is
  relationship-forward-contract commerce on an annual harvest cycle, not a spot market. An
  intent/solver design presumes spot liquidity the physical market structurally lacks.
- **Producers/co-ops:** see F6 — the channel that would onboard them is the one the layer
  threatens.

**Why it matters:** Every network claim in the application (solver race, buyer match,
routed intents) has N=0 external participants and no written acquisition path for participant #1
of any class. A venture-operator reviewer's first question is "who is the second user?" —
currently unanswerable.

**Fix:** In the application, stop claiming a network and claim the **precondition**: the demo
ships the open protocol + one real reference implementation of each role, and Q5 names the
concrete first-participant strategy per class (lenders via the registry — F2; venues via the
Cropster ERP import — DEMO-SPEC §5, the one adapter that gives a venue/co-op a *reason* to be
read; solvers explicitly deferred with the bootstrap-subsidy precedent cited). Honest N=0 with a
credible path beats implied N that a panel can falsify in one email.

---

### F4 — HIGH · From the funder's chair: three cheaper ways to buy the same outcome

**Claim (implied):** Aqueduct is the best $50k this RFP can spend.

**The alternatives Kamiya's panel will actually weigh:**

1. **Fund EthicHub directly.** They own the farmers (688 projects), the lots, the lending rail,
   the Celo deployment (a GRID launch chain — research/06 §2), eight years of Chiapas ops, and
   the exact data Aqueduct's demo scrapes from them. $50k to EthicHub to publish an open lot
   schema + attestation API achieves "legible smallholder lots, open" with field presence
   Aqueduct will never have in-window. **Aqueduct's only rebuttal is cross-platform
   neutrality — a claim currently backed by one (1) live connector, whose data is EthicHub's.**
2. **Fund a grade-from-photo team.** The RFP's first-listed, headline function ("from a photo it
   grades the produce") is Aqueduct's explicit DROP (DEMO-SPEC §2). Someone will apply with an
   open coffee/maize grading model on a cheap Android — a literal, legible answer to the prose
   the reviewers wrote themselves. Aqueduct's five-function beat renders grade as TO-BUILD; the
   competitor renders it as a demo.
3. **Fund a Global-South team.** The program's stated review posture "reaches deliberately into
   multilingual and underserved markets"; the founder gravity is IISc/India (research/06 §3).
   A Bangalore or Nairobi team with mandi/co-op relationships and a thinner demo beats a
   Chiapas-anchored EU agency on screen #1 optics even with weaker engineering.

**Why it matters:** research/06 §5 says what wins is receipts. Each alternative has a receipt
Aqueduct lacks (farmers, the headline function, field presence). Aqueduct's winning receipts —
shipped rails, the book, Regen Atlas, the honesty apparatus — must be aimed at the *layer*
category where none of the three can follow: none of them can credibly run cross-platform
aggregation + open registry + intent settlement. The application must make the funder see the
categories as complements ("fund EthicHub too — we're the layer they'd publish into"), not
substitutes.

**Fix:** Add one explicit paragraph to Q2(d)/Q5: why funding the layer is *not* fungible with
funding any single venue or any single app — the venue improves one silo, the app rebuilds the
middleman, the layer is the only artifact that compounds across all of them (the research/05
table as a diagram). Say the EthicHub-complement line out loud before the panel thinks it as a
substitute.

---

### F5 — HIGH · The receipt-scrub paradox: "verifiable onchain" citations that lead to a concealed lineage

**Claim (C11):** "domain-neutral citation — 'we deployed an intent-settlement registry (Base
Sepolia) and closed a live USDC→marketplace buy rail'; **verifiable onchain**."

**Reality:** The same spec row that offers verifiability mandates that the domain be scrubbed
("Card lineage: omitted entirely… `api.slabclaw.com` appears nowhere," DEMO-SPEC §2). A
crypto-native reviewer who does what the citation invites — opens the tx, reads the contract,
follows the deployer address — lands in the SlabClaw/Hermes universe within minutes: the
registry's broadcast artifacts, the wallet's x402 payment history, the GitHub lineage of the
forked `routes/` code. Two outcomes, both bad: the receipt **dead-ends** (unverifiable → not a
receipt, and this panel's register is receipts, research/06 §5) or it **verifies into a
discovered concealment** — worse than any Charizard, because the one thing this funder screens
hardest for is inspectability, and the bid will have curated its own provenance. Meanwhile the
spec celebrates the *other* lineage: "Openly a fork/extension of Regen Atlas… Lineage is a
feature" (§2). Two opposite honesty policies about the team's own history, in one artifact,
in front of a diligence panel.

**Why it matters:** This is the only finding that attacks the bid's core differentiator —
honesty — at its own game. The real-vs-sim ledger says "we label everything"; the lineage
policy says "except where we came from."

**Fix:** One sentence of owned lineage, exactly like the Atlas sentence: "the rails were
proven in a collectibles market (graded trading cards) before being pointed at commodities —
same legibility problem, lower stakes first." No mascots, no domain in the UI — but the
provenance chain a reviewer can walk must arrive somewhere the application already admitted.
Scrub decoration; never scrub provenance.

---

### F6 — MED-HIGH · Channel conflict: the feature is anti-adoptive for the channel that must distribute it

**Claim (C4, C10):** the layer surfaces the spread; empowerment is seeing "the gap between the
live-market price and the offer in front of her."

**Reality:** Per the spec's own field-realism rule (§5): settlement credits the
cooperative/exporter node because "the co-op carries their credit stack" — the exporter/co-op
is the farmer's *lender*, and the entity through which any co-op onboarding must flow (Cropster
ERP, exporter paperwork chain, §3.5). The spread the layer surfaces **is that same entity's
margin**. The distribution channel and the disintermediation target are the same actor. Every
prior transparency rail that ignored this was either captured by it (WRS → large traders,
research/02 §1c) or routed around (eNAM's mandi political economy, research/02 §1b) — the
evidence base documents the pattern and the spec quotes it without applying it to its own
go-to-market.

**Why it matters:** "Who onboards co-op #1, and why would they?" currently has the answer:
"the party whose rent we print on screen." That is a dead deck's signature move.

**Fix:** Position the exporter/co-op as a **user, not a target**: the layer's EUDR sub-object,
dedupe registry, and document-chain tracking (§3.5, §5) are *exporter cost-savers* (compliance
is their 2026 nightmare, research/01). The spread panel stays — but the pitch to the channel is
"we make your paperwork and compliance cheap," with spread transparency as the system's
integrity property, not its sales pitch. One paragraph in the application; zero demo changes.

---

### F7 — MEDIUM · The evidence base licenses matching-for-farmers, not aggregation-over-platforms

**Claim (C7):** "the intent/matching layer is the unlock, not the price feed."

**Reality:** Research/02's RCTs (Peru +13–14%, RML null) treated **farmers** with information
and measured income when an **alternative buyer** existed. Aqueduct does not treat farmers;
it aggregates **platforms** — and the platforms it aggregates (EthicHub, Algrano) already *are*
the alternative-buyer channel the RCTs identify as the necessary complement. The marginal
income effect of federating existing alternative-buyer venues — for farmers already on them —
is evidenced nowhere in the research base, and is plausibly small (see F1: those farmers
already capture premia). The five strongest sentences are being spent to justify a different
intervention than the one specced.

**Why it matters:** A panelist who actually reads Nakasone (this panel might) will notice the
treated unit changed between the evidence and the product. It doesn't kill the layer thesis —
it kills the *quantified* version of it.

**Fix:** State the causal chain honestly in Q2(a): the RCTs prove the complement bundle
(price + buyer + verification) moves income at the farmer level; the layer's claim is that it
**lowers the cost of that bundle appearing anywhere new** — a mechanism claim, not an effect-size
claim. Never let "+13–14%" sit adjacent to "aggregation layer" as if the former measured the
latter.

---

### F8 — MEDIUM · The M2 question has no answer: nobody is specified to use this in month 2 (flagged as instructed: previously UNANSWERED)

**Claim (C1, C9):** a layer, and "$50k, scoped honestly — the layer build justifies it."

**Reality:** The demo is an on-rails tour — zero accounts, zero API consumers, zero standing
service, by design (and rightly, for judge-safety). But the spec, the application inputs, and
the research contain **no named party who touches the system in month 2** after submission:
no co-op, no lender, no venue, no GRID publication commitment (kept as "offer," §2), no
self-host user. Retention is not low — it is *undefined*. Relatedly, the ask is incoherent
across artifacts: DEMO-SPEC §2 locks "$50k, scoped honestly," §9 says re-derive,
APPLICATION-DRAFT argues $25k *because* "the hard part is done." The stronger the
already-shipped story (Q2d), the weaker Q5's "cannot happen without it" test — a team that
ships this demo un-funded in weeks has demonstrated the grant is not the binding constraint
on the demo. The $50k must therefore buy something the demo visibly does not contain.

**Fix:** Q5's milestones must each name a **user event**, not a build event: M1 = registry API
public + first external query (a named lender/factor pilot per F2, or EthicHub itself);
M2 = first non-anchor platform reading *into* the layer via the Cropster/ERP path; M3 = first
externally-run fork or self-host (`npx aqueduct up` graduates from roadmap the moment someone
else runs it). "Gate on farmer-retained-value" (APPLICATION-DRAFT Q5) must be cut or
downgraded: the system as specced cannot measure farmer-retained value (settle credits the
co-op; pass-through is a labeled downstream step, §5) — an unmeasurable gate is a promissory
metric of exactly the kind research/06 says this panel punishes (metric is premature + vague).

---

### F9 — MEDIUM · The layer's most valuable data is structurally unscrapeable

**Claim (§2 F1, C8 rung 2):** "Read anything reachable — if it renders, it's data"; EUDR
origin attestation is "priced market access."

**Reality:** The cert layer's highest-value fields — plot geolocation, Due Diligence Statement
references, legality evidence (the concrete EUDR fields the diligence agent checks, §3.2) —
live in co-op ERPs, exporter compliance files, and national systems. **No public surface
renders them** (the anchor lot's own PARTIAL verdict, criterion 9, proves it). The read-anything
doctrine bottoms out precisely where rung 2's value begins. Closing the gap requires
write-side relationships (Cropster imports, exporter partnerships, field presence) — the exact
capabilities the team lacks and pre-submission outreach (locked: none, §2) defers. Meanwhile
EUDR compliance is a funded competitive space (Dimitra deployments in four countries,
research/05 §1; exporter compliance departments) whose players *hold* the data.

**Why it matters:** The unlock ladder's rung 2 — one of only two rungs claimed as
application-grade proven functions (DEMO-SPEC §10) — is, on current capabilities, a gap
*detector*, not a gap *closer*. Detecting that lots lack EUDR fields is honest and demo-credible;
claiming "EUDR-priced market access" as a delivered function overdraws it.

**Fix:** Reword rung 2 in application/deck: the layer makes EUDR-readiness **legible and
priced** (buyers see the flag; the gap has a cost); *closing* readiness is the write-side
roadmap that runs through the ERP/exporter channel (F6's user, same paragraph). One verb
changes: "provides market access" → "prices market access."

---

### F10 — LOW-MED · "Compounds in the open" names the wrong artifact

**Claim (C13, §2 end-of-tour):** the ask-screen states "what compounds in the open"; durability
= forkable code + ops muscle.

**Reality:** Open scraper code does not compound — it rots (connectors are perishable; the ops
muscle that keeps them alive is precisely the non-forkable part, which contradicts the
forkability-as-resilience story). What genuinely compounds at zero maintenance is already in
the spec but billed as a footnote: the **canonical lot schema** (§5, research/07) and the
**content-addressed lot ID** ("the namespace is the algorithm, not us," §5 B2). Those are
standards — the one artifact class in this domain with a real public-goods track record
(research/05: OADA/GOAT exist and persist; every platform died or closed).

**Fix:** The ask-screen and Q5 lead with schema + lot-ID + registry as *the* compounding
deliverables the grant hardens; connectors and the solver are reference implementations
around the standard. This also quietly upgrades the "no moat" answer: the moat a funder can
love is "we authored the schema everyone joins on" — Linux-Foundation-shaped, which is
literally Kamiya's stated self-image (research/06 §3).

---

## 3. Revenue attack (consolidated)

| Question | Current answer in the artifacts | Verdict |
|---|---|---|
| **Who pays?** | Unnamed "hosted instances, connector maintenance, integration consulting" (DEMO-SPEC §2) | FAIL — no named customer class. Only proven WTP in evidence base: **lenders** (MonetaGo precedent, research/08 §2b). See F2 fix |
| **Why now?** | EUDR 30 Dec 2026 + AI cost collapse | HALF-PASS — EUDR is real urgency, but the EUDR data is unscrapeable (F9); AI cost collapse argues equally for every competitor |
| **How much?** | 1–5% solver margin on €2–8k lots = €20–400/fill; service lines unpriced | FAIL — maintenance cost exceeds plausible year-one revenue (F2) |
| **How many?** | Scrapeable universe: 22 EthicHub lots; Algrano ~400 connections/yr after a decade | FAIL at claimed scale — boutique market until write-side channels open (F1, F9) |
| **CAC — co-op #1?** | No outreach pre-submission (locked); no field presence; ERP import is roadmap | UNANSWERED — and the natural channel (exporter) is the disintermediation target (F6) |
| **CAC — platform #5?** | "Neutral rails they join" | UNANSWERED — no venue incentive stated; being aggregated commoditizes them (F3) |
| **Retention — month 2?** | Nothing specified; no user of any kind post-submission | **UNANSWERED — standing finding (F8)** |
| **Moat?** | None by design; ops muscle | NEGATIVE moat as written — connectors are revocable at will by the aggregated parties; the durable asset is the schema/ID standard, currently underplayed (F10) |

---

## 4. Competitor map from the funder's chair

| Alternative $50k | What the funder gets | Aqueduct's honest counter |
|---|---|---|
| **EthicHub directly** | Open lot schema on real farmers, field presence, Celo/GRID-adjacent, 8 yrs ops | "We're the layer they'd publish into — complement, not substitute; no single venue can be the cross-venue registry" (must be said explicitly, F4) |
| **Open grade-from-photo team** | The RFP's literal headline function, on a cheap Android | "A grading app without an open market layer beneath it rebuilds the platform-middleman" (C10 — the strongest carry-forward argument; keep it) |
| **Global-South agtech w/ field presence** | Screen-#1 optics, real farmer relationships | Engineering receipts + the honesty apparatus + onchain rails this panel uniquely values (research/06 §5) — but only if F1's beneficiary story is fixed |
| **Academic consortium (ag-econ + CS)** | Rigor, evaluation | Weakest alternative — "real builders with real repos move fast" is the program's own tiebreak; Aqueduct wins this one outright |
| **Do nothing / wait for wave 2** | Option value | First-wave showcase appetite is Aqueduct's single best tailwind (research/06 §0) — argues for speed over completeness |

---

## 5. Code-market alignment audit

| Market claim | What the specced demo actually shows | Gap |
|---|---|---|
| "Empowers small farmers" (C4) | One real farmer's public listing, scraped without contact, initialed, inside a simulated economy; producer-share data "sits quietly" in a panel | Empowerment is narrated, not demonstrated; the farmer neither uses nor benefits from anything shown (F1) |
| "Aggregation layer" (C1, C5) | 1 confirmed live connector (EthicHub), 2 probable (Algrano, Agrotoken), rest TO-BUILD; map breadth = sim lots with fictional co-op names | Aggregation across N≈1 platforms is a connector, not a layer; the gap sentence claims a category the demo instantiates at n=1 |
| "Intent/solver network" | 1 real cost computation (Routes engine) + 4–6 sims, calibrated; N=0 external participants ever | A network with no second participant; honest labels don't change the N (F3) |
| "Certification layer" | Re-render of the source platform's own published attributes + an honest gap report against EUDR | The diligence agent verifies claims **against the surface the claims came from** — with one connector there is no independent second source; the cross-check is circular until connector #2 lands |
| "Identity resolution — HEADLINE capability" (C14) | EthicHub shop lot ↔ EthicHub lending project | Both surfaces are one company's — **intra**-platform resolution demonstrated, **cross**-platform claimed. Honest fix: label it "cross-surface"; promote to cross-platform when Algrano lands |
| "Open financial layer" (C1, C8) | Zero live financial primitives: no credit, no receivable, no vault (SIM), testnet registry | "Financial layer" is a deck ladder + a testnet contract; keep the ladder's own conditionality language in every surface (research/08 does this right — don't let the application flatten it) |
| "Services, not tolls" (C3) | No service exists, no customer named, backstop can't execute fills | F2 |

---

## 6. Summary table

| # | Finding | Severity | Fix cost |
|---|---|---|---|
| F1 | Anchor lot disproves the problem statement (selection bug — layer only sees the already-platformed) | **CRITICAL** | Caption + Q2(b) reframe: "anchor = ceiling; layer raises the floor" |
| F2 | Sustainability bistable; backstop can't fill; no named payer — lenders are the proven customer (MonetaGo) | **CRITICAL** | Rewrite C3 around lender-facing registry services |
| F3 | Two-sided-market vacuum: no incentive for any venue/solver/buyer to join; 90%-existing-relationship stat contradicts spot-matching | HIGH | Claim the precondition, not the network; per-class participant-#1 path in Q5 |
| F4 | Funder can buy the outcome cheaper 3 ways (EthicHub direct; grade-photo team; Global-South team) | HIGH | Explicit complement-not-substitute paragraph in Q2(d)/Q5 |
| F5 | Receipt-scrub paradox: verifiable-onchain citations dead-end or expose concealed lineage; opposite policies for Atlas vs SlabClaw | HIGH | One owned-lineage sentence ("proven on collectibles first"); scrub decoration, never provenance |
| F6 | Channel conflict: spread-surfacing targets the exporter/co-op that must distribute it | MED-HIGH | Pitch channel on EUDR/paperwork cost-saving; spread stays as integrity property |
| F7 | RCT evidence licenses farmer-matching, not platform-aggregation; treated unit changed | MEDIUM | Mechanism claim, not effect-size claim, in Q2(a) |
| F8 | M2 retention undefined; ask incoherent ($25k "done" logic vs $50k); unmeasurable farmer-retained-value gate | MEDIUM | User-event milestones; cut the unmeasurable gate |
| F9 | EUDR value-data (plot geo, DDS) structurally unscrapeable; rung 2 overdrawn | MEDIUM | "Prices market access," not "provides"; write-side = roadmap through F6's channel |
| F10 | "What compounds" names perishable connectors instead of the durable schema/lot-ID standard | LOW-MED | Ask-screen + Q5 lead with schema/ID/registry as the compounding artifacts |

### Fundability verdict

**CONDITIONALLY FUNDABLE — likely a first-wave showcase grant on engineering receipts and the
honesty apparatus, but as currently argued it loses the side-by-side against "fund EthicHub
directly," because its only real farmer needs nothing it offers and its only revenue mechanism
cannot operate.** The demo craft, the research discipline, and the onchain rails are genuinely
above this program's likely first-wave bar (research/06); the business logic underneath —
beneficiary, payer, participant #1, month 2 — is where a Kamiya-grade reviewer will push, and
every push currently lands.

- **Top risk:** F1 — the anchor lot is a walking counterexample to "good for the people the
  market forgot," and it is the single realest thing in the demo.
- **Top fix:** the F1+F2 combined edit — reframe the anchor as the *ceiling* the layer extends
  to the unplatformed 688, and rebuild sustainability around lender-facing registry services
  (the MonetaGo precedent), which simultaneously answers who-pays, month-2, and the
  fund-EthicHub-instead substitution. All of it is application/caption text; zero new build scope.
