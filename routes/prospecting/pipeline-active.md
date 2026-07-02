# SlabClaw Routes — Active Pipeline

> Intents layer for cross-chain settlement of tokenized physical assets (graded Pokemon card slabs).
> Stack: LI.FI SDK, x402, Base MCP, ERC-7683. Assets on Polygon/Base.

---

## SC-P01: LI.FI Builders Program — QUALIFY (21/25)

- **Type:** Accelerator (rolling)
- **Value:** $5K/quarter cash + mentorship + investor intros + higher rate limits + co-marketing + path to acquisition
- **URL:** https://lifi-builders.vercel.app/
- **Deadline:** Rolling — next showcase applications close soon
- **Status:** ACTIVE — ready to apply
- **Source:** T1_direct (verified page)
- **Triangulation:** Found by 3/3 agents

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 5/5 | FOUND — we already use @lifi/sdk@3.16.3. Past winner Router402 used x402+LI.FI MCP server — nearly identical stack |
| Stage Match | 4/5 | FOUND — program accepts pre-launch projects with working LI.FI integration |
| Buildability | 5/5 | FOUND — SDK installed, x402 installed, cross-chain route logic designed |
| Value/Effort | 4/5 | FOUND — $5K/quarter is modest but mentorship + investor intros + co-marketing have high strategic value. Low application effort |
| Strategic | 3/5 | INFERRED — LI.FI ecosystem alignment, but not Ethereum-core credibility |
| **Total** | **21/25** | Multiplicative: 5×4×5 = 100/125 ✓ |

**Components reusable:** LI.FI SDK integration, x402 payment layer, marketplace scrapers (10 platforms), price oracle engine, tokenized asset liveness verifiers
**New build needed:** ERC-7683 intent contracts, solver logic, demo UI
**Build time:** 2-3 weeks for MVP demo

**Next action:** Apply immediately. Showcase the physical-asset NFT use case as novel LI.FI usage.

---

## SC-P02: Anoma Intents Initiates — QUALIFY (20/25)

- **Type:** Grant/Accelerator (rolling cohorts)
- **Value:** Share of 25M XAN grant pool + fundraising intros to backer network (Polychain, etc.) + mentorship + Demo Day
- **URL:** https://anoma.net/blog/introducing-intents-initiates
- **Deadline:** Rolling — cohort-based evaluation
- **Status:** ACTIVE — continuously open
- **Source:** T1_direct (verified page)
- **Triangulation:** Found by 3/3 agents

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 5/5 | FOUND — Anoma IS the intent protocol. 4 tracks (Novel Apps, Infrastructure, Intent Solver, Open) all fit physical-asset intents |
| Stage Match | 4/5 | FOUND — accepts early-stage projects, cohort model |
| Buildability | 4/5 | INFERRED — would need Anoma-specific integration (not just EVM), but resource lock architecture translates |
| Value/Effort | 4/5 | FOUND — 25M XAN pool is substantial. Fundraising intros to Polychain etc. have high leverage |
| Strategic | 3/5 | CONCERNS — Anoma is its own L1, not purely Ethereum-aligned. "Intent interface for Ethereum" positioning helps |
| **Total** | **20/25** | Multiplicative: 5×4×4 = 80/125 ✓ |

**Components reusable:** Resource lock architecture, logistics graph, route solver framework, price oracle
**New build needed:** Anoma-native intent specification, solver integration with Anoma's architecture
**Build time:** 3-4 weeks

**Next action:** Apply for Infrastructure or Intent Solver track. Pitch: "First physical-asset intent solver — extending intents beyond DeFi to real-world goods."

---

## SC-P03: CoW DAO Grants Program (CIP-80) — QUALIFY (19/25)

- **Type:** Grant (rolling via forum)
- **Value:** From 500K xDAI + 6.55M COW 2026 budget. Individual grants vary.
- **URL:** https://forum.cow.fi/c/cow-grants-program/10
- **Deadline:** Rolling — post Grant Application Template on forum
- **Status:** ACTIVE — renewed Dec 2025 via CIP-80
- **Source:** T1_direct (verified — read full CIP-80 proposal)
- **Triangulation:** Found by 3/3 agents

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 4/5 | FOUND — "Solver ecosystem" and "Innovation" are explicit 2026 priorities. Physical-asset solver is novel |
| Stage Match | 4/5 | FOUND — accepts proposals from concept to integration stage |
| Buildability | 4/5 | FOUND — CoW solver architecture maps well to route solver pattern |
| Value/Effort | 3/5 | INFERRED — individual grant amounts unclear, but 500K xDAI budget is real. Forum-based application is low friction |
| Strategic | 4/5 | FOUND — CoW is pure Ethereum mainnet, high credibility. Batch auction model is novel for NFTs |
| **Total** | **19/25** | Multiplicative: 4×4×4 = 64/125 ✓ |

**Components reusable:** Price oracle (batch-compatible), marketplace scrapers, grade parser
**New build needed:** CoW solver implementation, batch auction adapter for non-fungible assets
**Build time:** 3-4 weeks

**Next action:** Post Grant Application on forum.cow.fi. Frame as "physical-asset solver for batch auctions."

---

## SC-P04: Uniswap Foundation Ecosystem Grants — QUALIFY (20/25)

- **Type:** Grant (rolling)
- **Value:** $5K–$500K. $115M committed for 2025-2026.
- **URL:** https://www.uniswapfoundation.org/grants
- **Deadline:** Rolling
- **Status:** ACTIVE
- **Source:** T1_direct (verified)
- **Triangulation:** Found by 3/3 agents

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 5/5 | FOUND — Uniswap co-authored ERC-7683. Extending it to non-fungible physical assets is genuinely novel and directly aligned |
| Stage Match | 3/5 | INFERRED — large grants typically go to more mature projects. Small-medium grant more realistic |
| Buildability | 4/5 | FOUND — ERC-7683 contracts are open source. LI.FI already implements OIF. Direct integration path |
| Value/Effort | 4/5 | FOUND — up to $500K. Even $25K-$50K would be significant. Application effort moderate |
| Strategic | 4/5 | FOUND — Uniswap Foundation credibility is tier-1 Ethereum. ERC-7683 alignment makes this a reference implementation |
| **Total** | **20/25** | Multiplicative: 5×3×4 = 60/125 ✓ (stage match is the weak axis) |

**Components reusable:** LI.FI SDK (already OIF-compatible), x402, resource lock architecture
**New build needed:** ERC-7683 CrossChainOrder contract for non-fungible assets, filler/solver implementation
**Build time:** 4-5 weeks for grant-worthy scope

**Next action:** Apply via uniswapfoundation.org/grants. Pitch: "ERC-7683 for Physical Assets — extending the cross-chain intents standard beyond fungible tokens."

---

## SC-P05: Encode UXmaxx Hackathon — QUALIFY (18/25)

- **Type:** Hackathon (6 weeks, online)
- **Value:** $15K+ (Particle Network $6K, General $4K, Arbitrum $2K, Magic Labs $500, ZeroDev $500, Openfort $100)
- **URL:** https://www.encodeclub.com/programmes/uxmaxx-hackathon
- **Deadline:** Starts June 22, 2026. Final submissions ~July 30.
- **Status:** UPCOMING — register now
- **Source:** T1_direct (verified)
- **Triangulation:** Found by 2/3 agents

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 4/5 | FOUND — chain abstraction theme. Cross-chain NFT operations UX fits |
| Stage Match | 4/5 | FOUND — hackathon accepts any stage, rewards working demos |
| Buildability | 4/5 | FOUND — 6 weeks is generous. LI.FI + x402 stack ready. Demo buildable |
| Value/Effort | 3/5 | FOUND — $15K total is modest. But Particle Network incubation potential adds value |
| Strategic | 3/5 | INFERRED — Encode Club network access, Arbitrum ecosystem visibility |
| **Total** | **18/25** | Multiplicative: 4×4×4 = 64/125 ✓ |

**Next action:** Register. 6-week online format allows parallel work with other applications. Arbitrum bounty targets "cross-chain apps" directly.

---

## SC-P06: ETHGlobal Lisbon 2026 — DROPPED (IRL travel, 36h format too constrained)

- **Type:** Hackathon (IRL, 36 hours)
- **URL:** https://ethglobal.com/events/lisbon2026/apply
- **Deadline:** July 24-26, 2026
- **Status:** DROPPED

---

## SC-P07: Ethereum Foundation ESP — QUALIFY (18/25)

- **Type:** Grant (Wishlist/RFP model)
- **Value:** $10K–$500K (no fixed range; $9.85M in Q1 2026)
- **URL:** https://esp.ethereum.foundation/applicants/wishlist
- **Deadline:** Rolling — monitor for relevant Wishlist/RFP items
- **Status:** ACTIVE — shifted from open apps to proactive Wishlist/RFP model
- **Source:** T1_direct (verified)
- **Triangulation:** Found by 3/3 agents

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 4/5 | FOUND — ESP funds "Application Infrastructure." OIF-compatible intents for physical assets fits |
| Stage Match | 3/5 | CONCERNS — ESP paused open applications. Must wait for relevant Wishlist/RFP item |
| Buildability | 4/5 | FOUND — ERC-7683/OIF alignment. Must be open-source and non-commercial |
| Value/Effort | 4/5 | FOUND — up to $500K. Most prestigious Ethereum grant |
| Strategic | 3/5 | FOUND — highest credibility tier. But non-commercial requirement constrains SlabClaw's revenue model |
| **Total** | **18/25** | Multiplicative: 4×3×4 = 48/125 ⚠ (stage match drags multiplicative) |

**Constraint:** Grant work must be open-source and non-commercial. Would need to scope the ERC-7683 physical-asset extension as public goods, separate from SlabClaw's commercial product.

**Next action:** MONITOR — watch esp.ethereum.foundation for relevant Wishlist/RFP items. Current RFP "Neutral DeFi Risk Intelligence Aggregator" closes June 15 but doesn't fit.

---

## SC-P08: Polygon Community Grants — QUALIFY (17/25)

- **Type:** Grant (via Questbook/Encode Club)
- **Value:** 10K–50K POL (~$4K–$25K at current prices)
- **URL:** https://www.encodeclub.com/programmes/polygon-grants
- **Deadline:** Rolling
- **Status:** ACTIVE
- **Source:** T1_direct (verified)
- **Triangulation:** Found by 2/3 agents

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 4/5 | FOUND — "AI-Enhanced NFTs" track. Courtyard NFTs are on Polygon |
| Stage Match | 3/5 | INFERRED — Polygon grants prefer deployed products |
| Buildability | 4/5 | FOUND — already have Polygon-integrated tokenized asset scrapers |
| Value/Effort | 3/5 | FOUND — max ~$25K at current POL prices. Moderate application effort |
| Strategic | 3/5 | INFERRED — Polygon ecosystem visibility. Less prestigious than EF/Uniswap |
| **Total** | **17/25** | Multiplicative: 4×3×4 = 48/125 ⚠ |

**Next action:** Apply via Questbook. "AI-Enhanced NFTs" track with cross-chain settlement angle.

---

## SC-P09: Base Onchain Summer Buildathon 2026 — DROPPED (2024 program, never repeated for 2026)

- **Type:** Hackathon (multi-week)
- **URL:** https://onchain-summer.devfolio.co/ (2024 edition only)
- **Status:** DROPPED — program ran in 2024, no 2026 announcement. All search results point to May-Aug 2024. Speculative pipeline entry based on assumed annual cadence that never materialized.

---

## SC-P10: ETHGlobal Tokyo 2026 — DROPPED (IRL travel, 36h format too constrained)

- **Type:** Hackathon (IRL, 36 hours)
- **URL:** https://ethglobal.com/events
- **Deadline:** September 25-27, 2026
- **Status:** DROPPED

---

## SC-P11: Across Protocol Forum Proposal — QUALIFY (16/25)

- **Type:** Treasury proposal (forum governance)
- **Value:** Variable — forum proposals funded by DAO treasury
- **URL:** https://forum.across.to/c/proposals/10
- **Deadline:** Rolling — any time
- **Status:** ACTIVE
- **Source:** T1_direct (verified)

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 5/5 | FOUND — Across co-authored ERC-7683. Forum already has active NFT project funding request |
| Stage Match | 2/5 | INFERRED — treasury proposals typically require community reputation first |
| Buildability | 4/5 | FOUND — ERC-7683 infrastructure available |
| Value/Effort | 2/5 | MISSING — no clear grant amounts. Forum proposals require community engagement |
| Strategic | 3/5 | FOUND — ERC-7683 originator alignment |
| **Total** | **16/25** | Multiplicative: 5×2×4 = 40/125 ⚠ (stage match is weak) |

**Next action:** Build first, then propose. Better as a post-hackathon proposal once working code exists.

---

## SC-P12: Arbitrum DAO Grants — QUALIFY (15/25)

- **Type:** Grant (multiple programs)
- **Value:** Up to 5M ARB (~$2M). Audit program $10M.
- **URL:** https://arbitrum.foundation/grants
- **Deadline:** DAO Grant Program "applications will open soon"
- **Status:** MONITOR — between cycles
- **Source:** T1_direct (verified)

**Scoring:**
| Axis | Score | Evidence |
|------|-------|----------|
| Domain Fit | 3/5 | INFERRED — "Infrastructure & Tools" category fits, but Arbitrum isn't primary chain |
| Stage Match | 3/5 | INFERRED — DAO grants prefer deployed products |
| Buildability | 3/5 | INFERRED — would need Arbitrum deployment |
| Value/Effort | 3/5 | FOUND — large budgets historically ($17.9M via Questbook) |
| Strategic | 3/5 | INFERRED — Arbitrum ecosystem. Lower priority than Base/Polygon |
| **Total** | **15/25** | Multiplicative: 3×3×3 = 27/125 ⚠ (borderline) |

**Next action:** MONITOR — apply when DAO Grant Program reopens. Lower priority than Tier 1 opportunities.

---

## CUT (Below 14/25)

- **Khalani Network** — no grants program yet, seed-stage. Strategic watch only.
- **Essential** — no grants program, pre-product. Strategic watch only.
- **Hyperlane** — no grants program, integration/partnership model. Strategic watch only.
- **1inch Fusion Resolver** — revenue-generating but no grant. Deploy when solver is built.
- **Wormhole xGrant** — message-based, not intent-native. Lower fit.
- **Gitcoin Direct Grants** — quadratic funding, better for public goods framing after open-source work ships.
