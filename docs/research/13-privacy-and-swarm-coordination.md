# 13 — Privacy as the final layer of swarm coordination

Written 2026-07-03. Companion to doc 12 (the value-chain/swarm-DSS thesis). Inputs: a live
probe of The Interfold and the open-source privacy landscape (all load-bearing claims
URL-cited), and the LVGA/MyLugano paper's privacy-by-design section (P2PFISY 2026 paper 28
— see doc 12 §6). Every integration grade below is honest about alpha/testnet/TO-BUILD
status; nothing here claims a capability the stack doesn't have.

## 1. The thesis

A swarm that coordinates on **public** data is just a faster marketplace: every agent sees
every other's inputs, so visible bids get shaded against, visible reserves feed buyer
power, and visible farm polygons get targeted. The coordination is contaminated by the act
of observing it. Coordinating on **private** inputs breaks the link between *contributing
to a shared outcome* and *exposing yourself to produce it* — and that is the difference
between a swarm that *replaces* the intermediary and one that merely races it. The
sensitive information (competitive bids, individual repayment histories, precise plots) is
exactly the information whose sensitivity was the reason an intermediary existed. A
decision-support swarm that can compute over it without seeing it is the complete form of
the category defined in doc 12.

The design bar, from the Lugano paper (doc 12 §6), citizen swapped for smallholder:
institutional knowledge should be *"limited, situated, and functional: sufficient to
enable a right, a benefit, or a protective measure, but not such as to make the user's
entire digital life more exposed, more linkable."*

## 2. Interfold, verified

The Interfold **is** Gnosis Guild's Enclave protocol, renamed — stated in their own docs
("The Interfold was previously known as Enclave", https://docs.theinterfold.com/;
rebrand essay https://blog.theinterfold.com/from-enclave-to-the-interfold/). Stack:
FHE + ZKPs (Noir circuits) + distributed threshold cryptography — explicitly no trusted
hardware, no single operator. Model: encrypted inputs enter an E3 (Encrypted Execution
Environment); a ciphernode committee enforces threshold conditions; outcomes verify
without input exposure; release requires threshold decryption
(https://blog.theinterfold.com/how-interfold-works/).

Honest status: **Network Alpha** — staged, hand-selected operators, pre-TGE, effectively
testnet (https://blog.theinterfold.com/what-is-network-alpha/); no third-party audit
surfaced. Genuinely open source: core monorepo LGPL-3.0, CRISP Aragon plugin AGPL-3.0
(https://github.com/theinterfold), actively committed 2026-07. The shipped reference app
is **CRISP secret ballots** (the Aragon demo); **sealed auctions are a documented use case
but not a shipped primitive**. Integration grade: **watch / prototype on alpha — TO-BUILD**.

Its three properties map one-to-one onto the swarm-DSS: **confidential inputs** = bids,
reserves, polygons never enter the shared surface as plaintext; **threshold enforcement** =
no single agent/solver/operator controls release (structurally: the coop federation as
ciphernode committee); **verifiable outcomes** = the match, floor price, or
deforestation-free verdict is provably correct without re-exposing inputs — so a human
allocator can trust the DSS without auditing anyone's private data.

## 3. The three privacy surfaces, graded

| # | Surface | Exposure today | Best open-source fit | Grade |
|---|---|---|---|---|
| 1 | Sealed-bid solver/tokenizer race | Sim is open-book; real bids/reserves are competitively sensitive | Interfold auction E3 (direct fit, LGPL) · MACI (mature, collusion-resistant, built for voting/QF — tally circuit would need adapting to bid-clearing; core maintained, `maci-platform` is not; https://github.com/privacy-ethereum/maci) · plain commit-reveal (wireable today, weak: no verifiable compute, no collusion resistance) | Interfold: **watch (alpha)** · MACI: **testnet-adapt** · commit-reveal: wireable-but-weak |
| 2 | EUDR plot geolocation vs farmer safety | See §4 — the exposure is commercial chains + public maps, NOT the regulator | Non-publication + certifier attestation (W3C VC / BBS+ selective disclosure — mature): **wireable today**. Astral Protocol for *verifiable* containment (`within`/`contains` on polygons → signed EAS attestation, https://github.com/AstralProtocol/astral-location-services): alive, open, but self-described **dev-preview** and runs in a **TEE** (EigenCompute) — verifiable, not input-private, and trusted-hardware-dependent (contradicts Interfold's model; the polygon is visible to the enclave). ZK location proofs (zkLocus-class): immature | Subtraction + attestation: **wireable-today** · Astral: **testnet** · ZK-location: **TO-BUILD** |
| 3 | Cross-coop credit/pricing aggregates | Any real aggregate today would require pooling raw coop data | Interfold FHE (alpha) or MP-SPDZ (mature MPC research toolkit, heavy, https://github.com/data61/MP-SPDZ) for the crypto; ag-data-cooperative governance for the *harder* half — who decides what gets computed (NAPDC framework https://www.agdatacoop.org/napdc-data-governance-framework; Development Gateway farmer-centric models) | **TO-BUILD / research-stage** (crypto AND governance) |

## 4. The EUDR correction — privacy by subtraction

The load-bearing factual finding: **EUDR does not require plot polygons to be public.**
Geolocation goes into the Due Diligence Statement via TRACES/the Information System, and
only Member-State competent authorities access it
(https://green-forum.ec.europa.eu/nature-and-biodiversity/deforestation-regulation-implementation/information-system-deforestation-regulation_en;
EEAS FAQ 2024). The real exposure is (a) commercial upstream operators demanding
coordinates to assemble their own DDS, and (b) **any public map that renders the polygon —
a self-inflicted wound AqueductX can simply decline.**

The stack already half-embodies this: the map derives and renders EUDR **status**
(ready/partial/gap via `deriveEudrStatus`) without ever holding a polygon; lots carry
`title_redacted` (initials-only names, `redactName` in the EthicHub connector); the anchor
pipeline comments its "honest EUDR gap, rendered PARTIAL." These were instincts; this doc
names them **policy**: *AqueductX renders compliance status, attestations, and aggregates —
never plot geometry, never full names.* Farm-level coordinates on the map (Glow solar) are
different in kind: Glow publishes them itself via a public API as protocol design — the
provenance chip carries that fact.

Documented harms this policy answers (citations, not vibes): SEI on EUDR traceability
risks to smallholder income and supply-chain position
(https://www.sei.org/publications/smallholder-farmers-eu-deforestation/); Owley (2017) on
public parcel-level geodata (Buffalo Law); Yang (2021) and Busscher et al. (2020) on land
grabbing and displacement — the mechanism geo-exposure feeds.

## 5. Sequenced recommendation

1. **Now (this pass, subtractive + doc):** the non-publication policy stated above; name
   `title_redacted` as a deliberate privacy default; one privacy sentence on the About
   page. Zero new cryptography, fully real.
2. **Next (shippable without alpha dependencies):** wire the certification databases
   (Fairtrade, Rainforest Alliance, and the TIC firms already in the certifier/standards
   registry) so a lot's compliance is verified at source rather than self-declared. That
   certification-database wiring is the grant-deliverable form of this layer. The signed
   VC/BBS+ selective-disclosure credential (a "plot deforestation-free / outside protected
   areas" attestation attached to a lot's EUDR status, issued through the same certifier
   role) is the technical evolution of that wiring: verified-at-source made
   privacy-preserving and independently checkable, and it remains TO-BUILD. Astral cited as
   the *labeled testnet* path to making containment *verifiable* (honestly flagged:
   dev-preview, TEE trust model).
3. **Prototype and watch (Interfold):** a sealed-bid solver-race E3 — the direct
   structural fit — prototyped against Network Alpha when their auction primitive ships;
   graded TO-BUILD until then. MACI's collusion-resistance machinery is the fallback to
   adapt if Interfold's timeline slips.
4. **Research-stage:** cross-coop collaborative intelligence — pair the MPC/FHE question
   with the governance question from day one (the coop federation as the release
   committee, per the ag-data-coop frameworks; structurally identical to Interfold's
   ciphernode committee).

## 6. What this commits us to (not silently implied as done)

- No polygon rendering, ever, without an explicit farmer-side decision — a standing
  constraint on all future map work, including the Glow vertical's non-solar successors.
- The attestation object (step 2) is TO-BUILD; nothing in the current UI claims it.
- Sealed bids and private aggregates remain SIM/open-book today and are labeled as such;
  doc 12's honesty table extends to privacy claims.
- Revisit Interfold at their auction-primitive ship date; revisit Astral at
  production-readiness.
