# Aqueduct — Sentient Application, Round 1 (Q2 block)

> Rewritten 2026-07-02 to the layer thesis per DEMO-SPEC §10. Supersedes APPLICATION-DRAFT.md
> (kept for provenance). Paste-ready per field. Demo URL pending Gate-final.

---

## Q2(a) — What problem are you solving, and why now?

A smallholder's coffee lot has no identity. There is no universal lot ID in coffee: the ICO mark identifies export parcels and resets every October; below identity-preserved custody, a farmer's lot survives as bookkeeping in a co-op ledger or a Cropster record, and dies at the first blend. Grades, origin records, financing history, and certifications all exist, but they live in silos that don't interoperate: a lending platform holds her credit history, a marketplace holds her lot specs, her co-op's ERP holds the delivery records, and no buyer, lender, or platform can see the whole picture. Illegible lots can't be verified, so they can't be financed, matched, or priced beyond the one buyer physically in front of them.

The field evidence says exactly where the constraint sits. In a randomized trial in Peru, farmers given price information earned 13–14% more, because an alternative buyer was reachable. An identical trial with 933 Indian farmers found no effect at all, because there wasn't one. Price feeds don't move income; the bundle does: verification a distant party can trust, plus a path to act on it. Our claim is a mechanism claim, not an effect-size claim: the layer lowers the cost of that bundle appearing anywhere new.

Why now, concretely: from 30 December 2026, EUDR makes plot-level origin proof a legal requirement for coffee and cocoa entering the EU, so lot legibility stops being nice-to-have and becomes priced market access. At the same time, the cost of running verification agents collapsed, and intent-based settlement matured enough to move real value. The middleman functions became automatable in the same eighteen months that the law began demanding them.

---

## Q2(b) — Who does this help?

Honestly, in order of who touches it first:

**Lenders and factors** pay for lot legibility today, not someday. Duplicate financing of the same collateral costs the trade-finance system over $10B a year, and registry checks that prevent it have been sold to banks since 2018. An open lot registry with content-addressed identities is that check, as a public good with services on top.

**Cooperatives and exporters** get their 2026 nightmare made cheap: EUDR readiness per lot, rendered as concrete fields (plot geolocation, harvest window, due-diligence reference) with the gaps visible, plus a document chain tracked instead of re-assembled per shipment. They are the channel, and the layer is built to save them cost, not to disintermediate them.

**The platforms that already serve smallholders** — lending, marketplaces, agroforestry finance — get aggregated reach without surrendering their model. We read them and route intents to them. Funding any single venue improves one silo; the layer is the only artifact that compounds across all of them. Fund them too. We are the layer they'd publish into.

**And the farmer.** Our demo's anchor is a real Chiapas lot: SCA 86, published origin, roughly twice the commodity price, EU buyers. That farmer is the ceiling, and he is the exception. One ring out sit the hundreds of lending-project communities whose lots never reach any shop, and behind them the co-op members whose lots exist only in ledgers. The layer exists to extend the anchor's legibility to them: to raise the floor, not to decorate the ceiling.

---

## Q2(c) — In one line, what are you building?

Aqueduct: the open aggregation and settlement layer for smallholder commodities — it reads the platforms where lots already live, gives every lot one verifiable identity, and lets intents move them, open so that no operator, including us, can become the new middleman.

---

## Q2(d) — Who is building this, and why is your team the right one to do it?

Patrick Rawson and Louise Borreani, Ecofrontiers SARL — an applied-research agency at the intersection of AI orchestration, blockchain mechanism design, and environmental finance, advising central banks and international organizations since 2021.

Receipts, in order of relevance:

1. **We built and run the base layer.** Regen Atlas (regenatlas.xyz, MIT) is our live, open-source geospatial registry: 505 tokenized environmental assets anchored to 185 bioregions, with content-addressed provenance records a stranger can independently re-verify — it took 1st place in Infrastructure & Digital Rights at Protocol Labs' PL_Genesis across 572 submissions. Aqueduct is openly a fork and extension of it.

2. **We shipped the rails.** We deployed an intent-settlement registry (publish → fill → verify → settle, Base Sepolia) and closed a live USDC-to-marketplace buy rail executed by an autonomous agent. Cross-platform identity resolution — the capability every aggregator lives or dies on — is a system we already operate in production over thousands of entities.

3. **We wrote the reference works.** The Green Crypto Handbook (Taylor & Francis) formalizes the diligence framework this domain runs on — what measurement backs a claim, where the data lives, who governs it. Louise also authored the canonical decentralized-MRV reference and co-built Regen Atlas.

4. **Our agents surface honest failures.** In a prior two-agent build, our independent diligence agent returned 10 PASS and 5 CAUTION on real data-quality gaps — findings, not staged results. That verification posture runs through everything below: our diligence agents play the same role your ROMA Verifier does, and publishing our scout, oracle, and diligence agents on the GRID is a natural fit we'd welcome scoping together.

---

## Q2(e) — What's open about it, and what would get worse if it closed tomorrow, and for whom?

Your own words name the failure mode: the obvious risk is the tool becoming the new middleman, extracting the same rent. We designed against that structurally, not rhetorically.

**What's open.** The whole repository is MIT and public: the aggregation layer (a fork of our already-MIT Regen Atlas), the connectors, the intent pipeline, and a reference solver anyone can fork and run — it fills only when no one else bids, its margin printed on the label. The two artifacts that compound hardest are standards, not code: a **canonical lot schema** distilled from how co-ops, ERPs, and the ICO system actually track lots, and a **content-addressed lot ID** anyone can derive and verify from the lot data itself. The namespace is the algorithm, not us. Standards persist where platforms die; that is the part of this that keeps compounding with zero maintenance and zero permission.

**What we take.** No toll on the rails, no equity in anyone's lot, no exclusive data. Ecofrontiers sustains on services to the parties with proven willingness to pay — registry queries, diligence reports, and EUDR-readiness checks for lenders and factors — the one revenue line that gets stronger the more open the registry is.

**What closes if it closes.** The lot registry becomes a proprietary credential: exactly the opaque, rent-bearing asset the incumbent middleman already sells, now with better technology. Lenders go back to trusting paper. And the scientific loss is documented: every credible counterfactual evaluation of a nature or provenance market to date was possible only because the underlying data was public. A closed origin record can't be independently checked, so it can't be believed, so it can't command the premium — for the farmer, the honest buyer, and the market itself.

**Where we're honestly short of your beliefs today:** the cheapest-phone front door and on-device privacy are roadmap, not demo — the demo is the layer, not a farmer-facing app. We'd argue the order is load-bearing: an open, neutral layer underneath is precisely what makes any farmer-facing app built on top non-extractive. Closed layer first, and every app inherits the rent.

---

## Q2(f) — Demo or trial link

**[DEMO URL — inserted at Gate-final]** — an on-rails, self-narrating walkthrough of the live layer: a real Chiapas lot read from a real platform (source-linked, timestamped), given a canonical identity, certified with honest gaps shown, priced against a real reference feed, published as an intent, and settled onchain — with a real-versus-simulated ledger enumerating exactly what is live and what is not, on the page itself.

**Live today:** https://regenatlas.xyz — the open base layer this extends (505 assets, 185 bioregions, provenance a judge can independently re-verify). Repository public at submission.

---

*Round 1 notes (not submitted): Q3 track = Grant; Q4 = $50,000 (the layer build: connectors, swarm, reference solver, registry hardening); Q5 milestones are user events, not build events — first external registry query by a named lender or EthicHub itself; first non-anchor platform reading in via the ERP path; first externally-run self-host. Voice pass (humanizer) still owed before paste.*
