# Aqueduct → Sentient Foundation Grant — Source Materials

> Captured 2026-07-02. Raw inputs for the Sentient Open-Source-AGI grant bid.
> The workflow `aqueduct-sentient-grant` writes `FUSION-CONCEPT.md` + `APPLICATION-DRAFT.md` here.

## The funder — Sentient Foundation
Open-Source AGI Grants & Investment Program. "Funding for builders working to keep AGI open."
Screens on three questions: **(1) is this good for the people the market forgot, (2) does it compound in the open, (3) is openness the point.** "We're screening for conviction, real building, and genuine value, not polish."
- Site: https://sentient.foundation/product-requests
- Form: https://form.typeform.com/to/IRj7WaKH

## The flagship product request — "The AI Supply Chain for Smallholder Farmers"
> A farmer carries her harvest to the one buyer she can reach and takes the price she is given, because she has no way to prove it is worth more. Smallholders grow over 33% of the world's food, yet routinely lose 30-60% of a crop's worth to intermediaries, often without ever knowing the price their buyer gets.
>
> The middlemen are not villains; they do real work she cannot: grading quality, vouching for it, knowing the buyers and the price. That work is finally automatable. An AI app can run the trust layer she could never reach. From a photo it **grades the produce, generates an origin record a distant buyer can believe, matches the lot to buyers, prices it against the live market, and tracks it from farm to sale.** Every function the middleman provided is a judgment task these models can now do.
>
> We want to back teams who build this **open**, because the obvious failure mode is the tool becoming the new middleman, extracting the same rent. Open is the only version where the value and the data stay with the farmers. Agriculture is one of the largest markets on earth, and the people losing the most in it are among the poorest.

**The five middleman functions (our checklist):** grade-from-photo · origin record · buyer match · live-market pricing · farm-to-sale tracking.

## The application form (every field)
- **Q3 — Track:** Grant (no equity, no strings, smaller amount) OR Investment (larger check, milestone-gated before funds release).
- **Q2 — What are you building:**
  - (a) What problem are you solving, and why now?
  - (b) Who does this help?
  - (c) In one line, what are you building?
  - (d) Who is building this, and why is your team the right one to do it?
  - (e) What's open about it, and what would get worse if it closed tomorrow, and for whom?
  - (f) **Demo or trial link (REQUIRED, https://).**
- **Q4 — Amount:** 10k / 25k / 50k / >50k (USD).
- **Q5 — What would the grant unlock:** "Be concrete. What gets built/shipped/reached in the next few months that cannot happen without it."
- **Q6 — Supporting docs:** upload deck / video demo / research materials (≤10MB).

## Our two assets to fuse
1. **SlabClaw / Aqueduct** (shipped) — the READ-WRITE-STRATEGIZE agent-legibility rails, proven on vintage graded Pokémon cards. Grade-from-photo + 7-tier price oracle (READ), USDC/Stripe→marketplace buy-rail (WRITE, Hermes hackathon), tokenized whole-asset custody (STRATEGIZE). Node labels retarget per vertical while the orchestrator never changes. Thesis: `slabclaw-raise/aqueduct/AQUEDUCT-THESIS.md`; engine: `slabclaw-app/backend` (api.slabclaw.com).
2. **Regen Atlas / Ecospatial** (built) — geospatial discovery + visualization + MRV layer for green/nature assets. Hedera/Base, ERC-8004 agent identity, iNaturalist biodiversity oracle, satellite/geospatial data. Supplies the **origin record / geospatial provenance / regen-MRV** layer. Files: `1_projects/regen-atlas/ecospatial{,-private}/`.

3. **The Green Crypto Handbook** (Rawson & Borreani, Taylor & Francis, ISBN 9781041258933) — Pat + Louise's published book. Core framework: the **Environmental Finance Stack** (UMR → Data → Institution → Protocol → Asset → Market). Three roles in the bid: (a) analytical **spine** to structure the farmer supply chain layer-by-layer, (b) **values grounding** making Sentient's open + anti-rent-extraction requirement rigorous (commons / anti-enclosure principles), (c) hard **team credibility** — the applicants wrote the book on green crypto. Archive: `3_archives/green-crypto-handbook.tar.gz`; 7 chapters extracted to text for analysis.

**Supporting resources folded in:** `2_resources/Ecology/regenerative-supply-chains-polycentrism-2026.pdf` + `Encyclopedia_of_Regeneration_(GaiaAI).pdf`; `2_resources/Maps and GIS/ecospatial-competitor-landscape-2026-05.md`; `2_resources/Crypto/Green Crypto-Asset Mapping`.

## The fusion thesis (to pressure-test, not assume)
Point Aqueduct's grade→origin→oracle→match→track engine at **smallholder produce**, with Regen Atlas supplying the geospatial origin-record + regen/MRV provenance, delivered **open** so value + data stay with farmers. Sentient's five middleman functions map 1:1 to shipped primitives. Credibility edge: we didn't propose the trust layer, we **shipped** it for a $5k Charizard and are retargeting it to a $5 crop lot.

## Local raw files
- 3 form-capture PDFs on `~/Desktop/` (Sentient … _What are you building_ / grant-track).
- 3 screenshots (Q4 amount, Q5 unlock, Q6 upload) on `~/Desktop/`.
