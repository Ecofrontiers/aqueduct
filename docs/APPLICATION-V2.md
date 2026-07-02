# Aqueduct — Sentient Application, Round 3 (Q2 block)

Rewritten 2026-07-02 in the long-form register (VOICE.md §6–7, Man and Swarm correction).

Supersedes r1 and r2, kept beside it. Paste-ready per field. Demo URL lands at Gate-final.

## Q2(a) — What problem are you solving, and why now?

Agriculture is one of the largest markets on earth, and its deepest structural fact has not changed in a century: between the third of the world's food that smallholders grow and the markets that consume it stands a chain of intermediaries, and the chain exists because trade runs on judgment. Somebody has to grade the goods, vouch for their origin, know the buyers, price the lot, and carry the risk of moving it, and that judgment has always required people, stationed at every collection point, mill, warehouse and port, who charge what the producer's isolation will bear.

Their judgment does not scale down. A shipload can carry the cost of inspection houses and registries; a smallholder's lot cannot, which is why the producers with the least leverage trade the least legible goods and pay the most for the trust their trade requires. What changes in the producers' favor today is the cost of judgment. Aggregating, verifying, pricing, matching and settling are exactly the tasks AI performs cheaply and at any scale, which means the logistics layer of an entire industry is about to become software. Take coffee. The information about a particular coffee lot exists: the grade, the origin record, the financing history, the certifications. But each piece sits somewhere different (a lending platform, a marketplace listing, a co-op's ERP) and nothing connects them. A buyer or a lender who cannot verify the lot will not finance it or buy it. The question this application answers is the one your product request already asks: whether that layer will be open, or closed.

Let’s be clear: we're not building a price-transparency app; we're building the layer that gives a producer a way to act on the price. When farmers in Peru were given SMS price information, their prices rose 13–14%, but this is because an alternative buyer was reachable, and the information could be acted on (Nakasone 2014). When 933 farmers in India received the identical treatment, nothing moved; the information arrived but there was nowhere to take it (Fafchamps & Minten 2012). Price transparency pays only where verification and matching already exist, which is to say the expensive part of a middleman's work was never about knowing the price. It is the grading, the vouching, the finding of the buyer, and the moving of the lot. We believe an open layer will lower the cost of that bundle appearing in places where it has never been economical to build.

The timing is not ours. From 30 December 2026 the EU Deforestation Regulation (EUDR) makes plot-level origin proof a legal requirement for coffee and cocoa entering the EU, which converts lot legibility from a virtue into priced market access and forces the industry to rebuild its origin infrastructure inside eighteen months. Rebuilds of this kind happen roughly once a generation, and the standards chosen during them persist. The open version of that infrastructure has not been built, by anyone, and that gap is this application.

## Q2(b) — Who does this help?

Aqueduct is multi-party infrastructure. The parties, in the order they show up:

(1) Lenders pay first. Duplicate financing, the same collateral pledged to two lenders at once, costs trade finance more than $10 billion a year, and banks have paid for registry checks that catch it since 2018 (MonetaGo, in India). The aggregated lot record is that check, and a lender who can verify a lot before it ships can prefinance it.

(2) Cooperatives and exporters run the paperwork. From December 2026, every coffee or cocoa lot entering the EU needs plot geolocation, a harvest window, and a due-diligence reference. The layer shows those fields per lot, gaps included, and keeps the export document chain in one place instead of reassembling it each shipment.

(3) Producers and co-ops post intents: sell this lot, finance this planting, move this shipment.

(4) Buyers, lenders, and transporters fill them.

(5) The platforms that already hold smallholder lots (lending, marketplaces, agroforestry finance, grain tokenization) are the venues intents route to, not competitors. Funding any one of them improves one silo; the layer compounds across all of them.

## Q2(c) — In one line, what are you building?

Aqueduct is a generalized peer-to-peer logistics layer for smallholder farmers: agents aggregate, verify, and price commodity lots, and intents match and settle them.

## Q2(d) — Who is building this, and why is your team the right one to do it?

Patrick Rawson and Louise Borreani, Ecofrontiers SARL, an applied-research practice working on AI orchestration, blockchain mechanism design, and environmental finance since 2021, advising central banks and international organizations.

We have built both halves of this layer before, separately. The agent half is Regen Atlas (regenatlas.xyz, MIT): our live open-source geospatial registry, 505 tokenized environmental assets on 185 bioregions, each with a provenance record a stranger can re-verify by content address. First place, Infrastructure & Digital Rights, Protocol Labs' PL_Genesis, 572 submissions. Aqueduct is a fork and extension of it, and the identity-resolution work underneath (matching records that describe the same thing across platforms) runs in production for us today across thousands of entities. The intent half is deployed: an intent registry on Base Sepolia (publish→fill→verify→settle) and a live USDC-to-marketplace buy rail executed end to end by an agent.

The Green Crypto Handbook (Rawson & Borreani, Taylor & Francis) is the diligence framework this proposal lives inside: what measurement backs a claim, where the data lives, who governs it. Louise also authored the canonical decentralized-MRV reference (Celo Foundation, CC-BY).

One more item, a posture rather than an artifact: in a prior two-agent build, our independent diligence agent returned 10 PASS and 5 CAUTION against real data-quality gaps. Findings, not staging. That is the role ROMA assigns its Verifier, and publishing our agents on the GRID is an integration we would welcome scoping once there is something worth publishing.

## Q2(e) — What's open about it, and what would get worse if it closed tomorrow, and for whom?

A platform shared by counterparties only works if none of them owns it. A lender will not query a registry controlled by the party it lends against; a venue will not accept intents from a competitor's pipe; and your request names the end state when one operator wins: the tool becomes the new middleman, extracting the same rent. Openness is not a value we hold about this system; it is the property that lets these parties stand on the same layer at all. Each piece of it is checkable.

The repository is MIT and public at submission: the aggregation and verification agents, the intent pipeline, and a reference solver anyone can fork and run, which fills only when nobody else bids and prints its margin on the label. The parts that compound hardest are standards rather than code: a canonical lot schema distilled from how cooperatives, ERPs, exporters and the ICO system actually track lots, and a content-addressed lot identifier anyone can derive from the lot's own data. The namespace is the algorithm, not us. An identifier scheme nobody owns cannot be enclosed or rented back, and opening the layer does not eliminate the middleman's work; it changes who can perform it and what they can charge.

What we take: no toll on the rails, no equity in anyone's lot, no exclusive rights to data. Ecofrontiers sustains on services to the party that already pays for lot legibility (duplicate-financing checks, registry queries, diligence reports, EUDR-readiness screens, sold to lenders and factors), and the arrangement strengthens as the registry opens; it would break if we closed it.

If it closed tomorrow: the lot registry becomes a proprietary credential, the same opaque asset the incumbent middleman already sells, with better software. Lenders fall back to paper. The scientific loss is documented: every counterfactual evaluation of a nature or provenance market to date has run on public data (zu Ermgassen et al., Oxford). A closed record cannot be independently checked, so it cannot be believed, so it cannot command a premium, and the cost lands on the producer and the honest buyer, in that order.

Where we fall short of your beliefs today: the cheapest-phone front door and on-device privacy are roadmap, not v1; the demo is the layer, not a farmer-facing app. The order is deliberate. A peer-to-peer layer underneath is what keeps any farmer-facing app built on it from turning extractive; a closed layer guarantees every app above it inherits the rent.

## Q2(f) — Demo or trial link

[DEMO URL, inserted when the build passes its final gate.] One link, on rails, self-narrating for a visitor with no context: a real Chiapas lot read live from a real platform, source-linked and timestamped, given a canonical identity, certified with its gaps shown rather than hidden, priced against a real reference feed, published as an intent, and settled onchain. A real-versus-simulated ledger sits on the page and states exactly which is which.

Live today: https://regenatlas.xyz, the open base layer this extends. The repository goes public at submission.

Notes (not submitted): Q3 Grant. Q4: the ask is $50,000, and it funds the connectors, the swarm, the reference solver, and the hardening of the registry. Q5 milestones are user events rather than build events: the first external registry query by a named lender or by EthicHub itself; the first platform beyond the anchor reading in through the ERP path; the first self-host run by someone who is not us.
