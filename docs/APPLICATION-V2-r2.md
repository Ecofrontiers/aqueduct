# Aqueduct — Sentient Application, Round 2 (Q2 block)

> Rewritten 2026-07-02 against VOICE.md §1–6. Supersedes APPLICATION-V2-r1.md (kept beside it
> for the diff). Paste-ready per field. Demo URL lands at Gate-final.

---

## Q2(a) — What problem are you solving, and why now?

A smallholder's coffee lot has no identity. Coffee has no universal lot ID: the ICO's identification mark tracks export parcels and resets every October 1, and below identity-preserved custody a lot is a line in a co-op ledger that dies at the first blend. The grade, the origin record, the financing history, the certifications all exist—on a lending platform, in a marketplace listing, inside a co-op's ERP—and none of them join. A lot nobody distant can verify is a lot nobody distant can finance or match. She sells to the one buyer in front of her, at his price.

The field record says where the constraint sits. In Peru, farmers given SMS price information earned 13–14% more (Nakasone 2014); an alternative buyer was reachable. In India, 933 farmers got the identical treatment and incomes moved not at all (Fafchamps & Minten 2012). Price information pays only when a path to act on it exists. We claim a mechanism, not an effect size: the layer cuts the cost of verification-plus-matching appearing anywhere new. That bundle is your product request's five functions, priced.

Why now. From 30 December 2026, the EU Deforestation Regulation (EUDR) makes plot-level origin proof a legal requirement for coffee and cocoa entering the EU—legibility stops being a virtue and becomes priced market access. In the same window, verification agents got cheap and intent settlement got real. The law and the tooling arrived together; the layer that joins them has not.

---

## Q2(b) — Who does this help?

Who pays, who distributes, who benefits. In that order.

Lenders and factors pay. Duplicate financing—the same collateral pledged to two lenders—costs trade finance over $10 billion a year, and registry checks that catch it have sold to banks since 2018 (MonetaGo, India). An open lot registry with content-addressed identities is that check as a public good, with paid services on top. This is the party with proven willingness to pay, and the check gets stronger as the registry opens.

Cooperatives and exporters distribute. Their 2026 problem is EUDR: per-lot readiness shown as the actual fields—plot geolocation, harvest window, due-diligence statement reference—gaps visible, document chain tracked instead of reassembled per shipment. The co-op is the channel, so the layer is built to cut its costs. Transparency rails that antagonized their own channel have been built before; they got captured or routed around—warehouse-receipt finance in Africa went to large traders, not smallholders (Thunde & Baulch, IFPRI 2020). We designed for the channel instead.

The platforms that already serve smallholders get reach: lending, marketplaces, agroforestry finance, grain tokenization. We read them and route intents to them. Funding one venue improves one silo. The layer compounds across all of them—fund EthicHub too; we are the layer they'd publish into.

The farmer is last in the chain and the point of it. Our demo anchor is a real Chiapas lot: SCA 86, published origin, ~2× the commodity price, European buyers. He is the ceiling, not the norm. One ring out sit 688 lending-project communities whose lots never reach any shop; behind them, co-op members whose lots exist only in ledgers. The layer's job is to move the floor toward his ceiling.

---

## Q2(c) — In one line, what are you building?

Aqueduct: an open layer that reads the platforms where smallholder commodity lots already live, gives every lot one verifiable identity, and settles intents against them—forkable end to end, so no operator, including us, can become the new middleman.

---

## Q2(d) — Who is building this, and why is your team the right one to do it?

Patrick Rawson and Louise Borreani, Ecofrontiers SARL—applied research on AI orchestration, blockchain mechanism design, and environmental finance since 2021, advising central banks and international organizations.

The record:

Regen Atlas (regenatlas.xyz, MIT). Our live open-source geospatial registry: 505 tokenized environmental assets on 185 bioregions, provenance records a stranger re-verifies by content address, no registry trust required. 1st place, Infrastructure & Digital Rights, at Protocol Labs' PL_Genesis across 572 submissions. Aqueduct is a fork and extension of it.

The rails. An intent-settlement registry deployed on Base Sepolia (publish→fill→verify→settle) and a live USDC→marketplace buy rail executed end to end by an agent. Cross-platform identity resolution runs in production for us today over thousands of entities; it is the capability an aggregator lives or dies on.

The reference works. The Green Crypto Handbook (Rawson & Borreani, Taylor & Francis): the diligence framework for this domain—what measurement backs a claim, where the data lives, who governs it. Louise also authored the canonical decentralized-MRV reference (Celo Foundation, CC-BY) and co-built Regen Atlas.

The verification posture. In a prior two-agent build, our independent diligence agent returned 10 PASS and 5 CAUTION—real data-quality gaps, not staged results. Our diligence agents do the job ROMA's Verifier does; publishing our scout, oracle, diligence, and solver agents on the GRID is a fit we'd welcome scoping with your team.

---

## Q2(e) — What's open about it, and what would get worse if it closed tomorrow, and for whom?

Your request names the failure mode: the tool becomes the new middleman, extracting the same rent. We designed against it structurally, and every piece is checkable.

What's open. The repo is MIT and public at submission: the aggregation layer (forked from our already-MIT Regen Atlas), the connectors, the intent pipeline, and a reference solver anyone can fork and run. The solver fills only when nobody else bids; its margin prints on the label. The two artifacts that compound hardest are standards, not code: a canonical lot schema distilled from how co-ops, ERPs, and the ICO system actually track lots, and a content-addressed lot ID anyone can derive from the lot data itself. The namespace is the algorithm, not us. Opening the layer does not eliminate the middleman's work—it changes who can do it, and what they can charge.

What we take. No toll on the rails, no equity in anyone's lot, no exclusive data. Ecofrontiers sustains on services to the party that already pays for lot legibility: duplicate-financing checks, registry queries, diligence-agent reports, EUDR-readiness screens for lenders and factors. That line strengthens as the registry opens; a closed registry would break our own revenue logic before it broke anyone's trust.

If it closed tomorrow. The lot registry becomes a proprietary credential—the same opaque, rent-bearing asset the incumbent middleman sells, with better software. Lenders fall back to paper. The scientific loss is documented: every counterfactual evaluation of a nature or provenance market to date ran on public data (zu Ermgassen et al., Oxford). A closed origin record can't be independently checked, so it can't be believed, so it can't command a premium—for the farmer and the honest buyer both.

Honest scope: the cheapest-phone front door and on-device privacy are roadmap, not v1. The demo is the layer, not a farmer-facing app. The order is load-bearing: an open, neutral layer underneath is what keeps any farmer app built on top from turning extractive. Close the layer first and every app inherits the rent.

---

## Q2(f) — Demo or trial link

[DEMO URL—inserted when the build passes its final gate.] One link, on rails, self-narrating: a real Chiapas lot read live from a real platform, source-linked and timestamped; given a canonical identity; certified with its gaps shown; priced against a real reference feed; published as an intent; settled onchain. A real-versus-simulated ledger sits on the page and says exactly which is which.

Live today: https://regenatlas.xyz—the open base layer this extends. Repo public at submission.

---

*Notes (not submitted): Q3 Grant. Q4: the ask is $50,000—connectors, the swarm, the reference solver, registry hardening. Q5 milestones are user events: first external registry query by a named lender or EthicHub; first non-anchor platform reading in through the ERP path; first self-host run by someone who isn't us.*
