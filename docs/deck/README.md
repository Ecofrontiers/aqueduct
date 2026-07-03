# AqueductX — funder deck

`aqueductx-deck.html` — a self-contained, 13-slide funder brief for the Sentient
Foundation Open-Source AGI grant. One file, no external assets (system font stack,
inline CSS, HTML/CSS diagrams, two base64-embedded JPEG screenshots — no web fonts,
no scripts, nothing fetched over the network). 16:9 slides at
1280×720, styled in the app's quiet technical language (white ground, gray-900 text,
the account palette as the only accents: sienna goods / indigo capital / purple
venue / emerald endogenous).

## Slide inventory (headlines verbatim)

1. **AQUEDUCTX** — the north-star sentence · `aqueductx.trade` · Sentient's three
   screening questions answered
2. **Judgment doesn't scale down.**
3. **Two clocks just aligned: a legal deadline, and a collapse in the cost of judgment.**
4. **A swarm decision-support system for agricultural trade finance.** — includes the
   five-middleman-functions checklist mapped to layer components with honest status
   badges (grade-from-photo = TO-BUILD)
5. **One open layer, a swarm of small agents — with provenance on every element.**
   (architecture diagram)
6. **The data model is REA — and the Claim is the whole point.** (REA mapping table)
7. **Coffee — the loop, running on real EthicHub reads.**
8. **Solar — the same loop, one settled over wires.** (two-vertical loop diagram)
9. **Legibility is what makes a lot financeable.** (unlock ladder with conditionality)
10. **Compliance without exposure — the open version must not be a surveillance layer.**
11. **What you need to believe.** (five falsifiable assumptions + evidence)
12. **Built before, in pieces — and one negative precedent we learn from.**
13. **Open, composable, crypto-native. Fund the hardening.** (the $50k ask + dated Q5
    deliverables)

Slides 4 and 7 now carry the real WP7 QA screenshots, embedded as two base64 JPEG
`<img>` data URIs (map world-view on slide 4, lot detail on slide 7) — the dashed
placeholders are gone. They are intentionally small proof insets, not heroes — the
drawn HTML/CSS diagrams still carry the deck.

## Render / view

**On screen:** open the file in any browser — slides stack vertically on a neutral
gutter.

```
open docs/deck/aqueductx-deck.html          # macOS default browser
```

**Print to PDF (one slide per page):** use the browser's Print dialog → Save as PDF,
with **background graphics ON** and margins **None**. The `@page { size: 1280px 720px }`
+ `break-after: page` rules give exactly one slide per landscape page.

**Headless (reproducible PDF), via Chrome:**

```
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf=aqueductx-deck.pdf \
  "file://$(pwd)/docs/deck/aqueductx-deck.html"
```

Produces a 13-page PDF (~1.2 MB), well under the grant form's 10 MB upload limit.
The source HTML is ~174 KB (the two embedded raster screenshots dominate the size).

## Notes

- Provenance discipline is preserved throughout: every element carries a chip
  (LIVE / SNAPSHOT / SIM / TESTNET / TO-BUILD). Nothing is claimed live that isn't.
- Numbers and claims trace to `docs/APPLICATION-V2.md`, `docs/DEMO-SPEC.md`, and
  `docs/research/02, 06, 08, 12, 13`. Where the plan's message spine and the docs
  differ, the spine wins (e.g. 1,253 coffee/sim lots — the rail total is 1,263
  including 10 Glow solar farms).
- To re-theme, edit the `:root` custom properties at the top of the `<style>` block —
  the account palette matches the app's `ACCOUNT_COLORS`.
</content>
