# Design Brief: Lot Detail IA + Networked Map Language

Date: 2026-07-02. For: `/lots/:lotId` rebuild + map network layer.

## 1. Domain Analysis

**Target user:** grant judges (cold visitors, 3 minutes) + agri-supply-chain operators.
**Their daily tools:** the Regen Atlas itself, marketplace listings (EthicHub shop), logistics dashboards, block explorers.
**Domain:** map-first commodity/logistics registry. **Expectations:** data-dense but sorted; provenance always labeled; the map is the content.

## 2. References

Host-app (primary — the host IS the design research when extending an app):
1. **AssetBioregionCard** (`atlas/src/Explore/AssetBioregionCard.tsx`) — the Atlas's richest detail view.
2. **ExploreCards + accordion rail** (`atlas/src/Explore/`) — card anatomy, section grammar.

External (scoped to the one idiom the host lacks — flow/network maps):
3. **Jenny et al. 2017, "Design principles for origin-destination flow maps"** (berniejenny.info, fetched 2026-07-02) — canonical, user-study-verified.
4. **deck.gl ArcLayer docs** (deck.gl, fetched) — arc geometry/encoding API conventions.
5. **Flowmap.blue** (flowmap.blue) — production OD-flow idiom: animated direction, volume encoding, cluster-on-zoom.

## 3. Extracted Patterns

**Host detail-page anatomy (AssetBioregionCard):**
- Hero header: full-bleed image, black gradient overlay, type badges (11px semibold, tinted bg), white bold title, meta line (MapPin + location · issuer).
- Signal pills: rounded-full, `bg-green-50 text-green-700`, Check icon, 11px.
- CollapsibleSection rows: Phosphor icon (13px) + label + count; content as `bg-gray-50 px-3 py-2` key-value sub-rows; mono ONLY for symbols.
- Action row: bordered secondary + solid blue primary button, ArrowUpRight.

**Flow-map principles (Jenny et al., verbatim findings):**
- Curved flows > straight; arrows at destination > tapered width; node-to-node > area-to-area.
- Overlaps minimized; longer flows curved more; acute crossing angles avoided; flows never pass under unconnected nodes; flows radially distributed around nodes; width scaled with quantity.

**Flowmap.blue idiom:** animated dash conveys direction/liveness; opacity+width by volume; nodes sized by throughput.

## 4. Design Brief

### A. Lot detail page (`/lots/:lotId`)
- **Layout:** keep the host's two-column (detail panel left, map right). Panel adopts the AssetBioregionCard anatomy exactly.
- **Header:** lot image hero + gradient; badges = commodity (Coffee) + process/variety; title = `title_redacted`; meta = origin · producer initials. Provenance chip (LIVE/SNAPSHOT·date) next to fetched time.
- **Signal pills row:** SCA score, weight/format, EUDR readiness (OK/PARTIAL pill), lending matched.
- **Sections (CollapsibleSection, in this order):**
  1. Price & commodity floor — FOB prominent; context line: "floor = ICE C + origin differential; specialty prices above it on grade." NEVER "fair price," never implies the lot is overpriced.
  2. Origin & production — key-value grid (origin, altitude, variety, process, drying, harvest, weight/state, format, custody).
  3. Sensory profile — aroma/taste/body/acidity.
  4. EUDR readiness — checklist with per-item status pills; real gaps shown PARTIAL (credibility, keep).
  5. Lending & onchain — EthicHub join (join_confidence tag), projects, Celo credit line.
  6. Identity & provenance — content-addressed ID (mono, copy button), recompute note, source link.
- **Typography:** DM Sans everywhere; mono ONLY for hash/IDs/prices (tabular).

### B. Networked map language
- **Nodes (typed glyph grammar, all with white ring + soft shadow — host marker idiom):**
  - Lot = filled circle, sienna `#b45309`; radius ∝ lot weight/value; LIVE = second solid ring.
  - Coop/exporter = rounded square, sienna outline.
  - Venue = square, purple `#9333ea`; TO-BUILD = dashed outline, 50% opacity.
  - Solver = diamond, purple; buyer/demand hub = circle, indigo `#4f46e5`.
  - Vault = square badge with count (light surface, gray border, DM Sans).
- **Edges:** quadratic-bezier curved arcs (longer = more curved), node-to-node; width ∝ quantity; direction = arrowhead at destination (small triangle marker) — not taper; radial fan-out where a node has several edges; control points offset to avoid unconnected nodes.
- **Edge color = intent type:** sell/route = indigo `#4f46e5`; finance = emerald `#059669`; settle (testnet-real) = Atlas primary blue `rgb(23,127,224)`. Active flow = animated dash; historical = static 40% opacity.
- **Implementation:** native Mapbox GL line layers + Markers (no deck.gl dependency; SwarmMapLayer already computes bezier arcs — generalize it). Cluster/simplify at low zoom.

### Anti-patterns (DO NOT)
- Dark panels, amber-on-black, all-mono walls of text (the deleted identity).
- Tapered flows for direction (measurably worse than arrowheads — Jenny et al.).
- Uniform dots for different entity types; unlabeled sim elements; "fair price" framing.

## 5. Icon Language

**Library:** Phosphor (host standard), regular weight; 13px section headers, 14-16px cards.

| Concept | Icon | Color |
|---|---|---|
| Lot (coffee) | Coffee | #b45309 |
| Lot (cacao/other) | Plant / Grains | #b45309 |
| Intent / route | ArrowsLeftRight | #4f46e5 |
| Solver | Cpu | #9333ea |
| Venue / marketplace | Storefront | #9333ea |
| Vault / infrastructure | Bank | #9333ea |
| Buyer / demand | Buildings | #4f46e5 |
| Coop / exporter | Users | #b45309 |
| Price / floor | Coin | gray-700 |
| EUDR / compliance | ShieldCheck | status colors |
| Lending | HandCoins | gray-700 |
| Identity / hash | Fingerprint | gray-700 |
| Origin / production | MapPin / Mountains | gray-700 |
| Sensory | Drop | gray-700 |
