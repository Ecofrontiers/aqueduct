# Sentient Foundation — Funding Pattern Reverse-Engineering

> Research captured 2026-07-02 for the Aqueduct grant bid. All claims cited to primary or
> named secondary sources. Companion to `SOURCE-MATERIALS.md` and `DEMO-SPEC.md`.

## 0. The single most important fact

**The $42M Open Source AGI Grant and Investment Program is 8 days old** (announced June 24,
2026). There are **no public grantees yet**, no announced council members, and no visible
prior applicants for any RFP including the farmers one. Applications are rolling ("no
cohorts, no deadlines") and reviewed by "a named technical panel." Applying now means
applying into the first wave, where the Foundation is actively looking for exemplar
grantees to showcase—and where the reviewers are the people who wrote the RFP prose, not
a bureaucratic committee.

- Announcement: https://markets.businessinsider.com/news/currencies/sentient-foundation-commits-42-million-to-advance-open-source-agi-1036272541 (FinanceWire PR, 2026-06-24)
- Grants page: https://sentient.foundation/grants
- Forbes follow-up: https://www.forbes.com/sites/boazsobrado/2026/07/01/agi-should-be-open-source-peter-thiel-backed-sentient-bets-42m/ (2026-07-01)

---

## 1. What Sentient has actually funded/backed to date

Because the grant program is new, their **track record is what they built and platformed,
not what they granted**. That record tells you what they respect:

### Built in-house (Sentient Labs, $85M seed July 2024 — Founders Fund, Pantera, Framework, Ethereal, Robot, Symbolic, Delphi, Hack VC, Arrington, HashKey, Canonical, Foresight)
- **ROMA** — Recursive Open Meta-Agent framework, ~5,082 GitHub stars, their flagship. (github.com/sentient-agi/ROMA)
- **Open Deep Search (ODS)** — "SOTA coding-based agent for reasoning over complex multi-hop search tasks, following the CodeAct agentic architecture." (sentient.xyz/grid)
- **OML 1.0 Fingerprinting** — model watermarking via fine-tuned secret fingerprints; the "Open, Monetizable, Loyal" thesis. (github.com/sentient-agi/OML-1.0-Fingerprinting)
- **Dobby** (Dobby-Unhinged-Llama-3.3-70B) — "the world's first Loyal AI model," fractionally owned by ~650,000–700,000 people via a record NFT fingerprint mint (Feb 2025). (huggingface.co/SentientAGI/Dobby-Unhinged-Llama-3.3-70B; tradingview.com/news/cointelegraph:8118611db094b; fireworks.ai/models/sentientfoundation/dobby-unhinged-llama-3-3-70b-new)
- **EvoSkill** — synthesizes reusable agent skills from failed trajectories (989 stars); **GEPA+** prompt optimizer; **Sentient Enclaves Framework** (confidential AI, Rust); **SERA** crypto research agent; **CryptoAnalystBench**; a fork of **harbor** (agent evals/RL environments); **agentic-payments-bot** ("Agentic Payment Service for Open Agent Skills Ecosystem"). (github.com/sentient-agi)
- **Sentient Chat** — consumer gateway, 1M+ users at launch (Feb 2025), "over two million users within months" per the Sparks post; 15 natively integrated agents at launch. (sentient.foundation/news/be-the-sparks; yourstory.com/2025/02/sentient-debuts-ai-chatbot-with-15-agents-to-rival-perplexity)
- 4 research papers accepted to NeurIPS 2025. (sentient.foundation/news/be-the-sparks)

### Backed/platformed (the GRID, launched Aug 2025)
- **The GRID** — "network of intelligence": 40+ specialized agents, 50 data sources, 10+ models at launch; now "110+ ecosystem partners and 15,000+ developers." Named launch partners: **Napkin** (generative graphics), **Exa** (search), plus ecosystem agents on **Base, BNB, Polygon, Arbitrum, Celo, Near**. Monetization via usage payments + token staking on agents. Tyagi: "app store for AI technology"; agents must "perform real tasks, not just wrap prompts." (siliconangle.com/2025/08/15/sentient-launches-grid-connect-monetize-open-ai-agents/; sentient.xyz/grid; reports.tiger-research.com/p/sentient-agi-eng)
- **Sentient Sparks** (Jan 2026) — monthly rotating cohort of 10 content/community contributors (6 global + 4 regional), leaderboard-assessed. Rewards: affiliate badge, merch, VIP events, amplification—not cash. Shows they platform *narrative* contributors separately from *builder* funding. (sentient.foundation/news/be-the-sparks)
- **Events**: Open AGI Summit (next: 02.19.2026 per homepage), Open AGI Symposiums at Korea, Tsinghua, Jiaotong—heavy Asia expansion. **SENT token + airdrop** live ("SENT is the coordination layer... powers the chain, the GRID, and the incentive systems"). (sentient.foundation/news)
- **Program-launch ecosystem participants**: Alibaba Cloud, Franklin Templeton, Princeton University, Indian Institute of Science. (FinanceWire PR)

**Pattern**: everything they back is (a) genuinely open-source with a repo, (b) benchmarked or
usage-proven with numbers they can quote, (c) composable into their ecosystem, and (d)
comfortable with crypto rails as native infrastructure, not an add-on.

---

## 2. The stack, in their own language — what lands vs. what name-drops

### ROMA (the vocabulary that matters most)
ROMA's loop is **Atomizer → Planner → Executor → Aggregator → Verifier** (five modules, not
four—the Atomizer decides atomic-vs-plan; the Verifier "inspects the aggregate output
against the original goal before delivering"). Recursive: planner subtasks re-enter the
atomizer. Built on DSPy (`roma_dspy`); supports CoT/ReAct/CodeAct executors; "Executors can
be LLMs, APIs, or even other agents." Benchmark they quote everywhere: **ROMA Search 45.6%
on SEAL-0 vs Gemini 2.5 Pro's 19.8%**—their proof that "a collaborative structure alone can
surpass high-performance single models." (github.com/sentient-agi/ROMA; sentient.foundation homepage code sample; reports.tiger-research.com/p/sentient-agi-eng)

**Aqueduct's swarm maps onto this cleanly and honestly**: scouts/aggregators = Executors
with tools; diligence/verifier agents = the Verifier role (independent re-verification
against the goal—exactly ROMA's framing); oracle/pricing = Executors; the intent pipeline =
Planner/Aggregator. This is *structural congruence*, arguable without lying. Claiming "built
on ROMA" without actually running roma_dspy is a name-drop that dies in review—**the grant
includes "hands-on engineering support from the team behind... ROMA, Open Deep Search, and
EvoSkill"** (sentient.foundation/grants), i.e., the ROMA authors read the applications.

### What genuinely lands as an integration offer
1. **Publish Aqueduct agents on the GRID** (scout, oracle, diligence agents as callable GRID
   agents). The GRID's explicit bar—agents that "perform real tasks, not just wrap
   prompts"—is one Aqueduct's scrapers/oracles actually clear. This is ecosystem
   reciprocity, their stated evaluation axis ("ecosystem impact").
2. **Celo**: a GRID launch chain (siliconangle) AND already Aqueduct's stated migration
   roadmap (DEMO-SPEC §5). Saying "our roadmap chain is already in your ecosystem" is a
   receipt, not a name-drop.
3. **ROMA as the orchestration migration path**—offered as a *funded milestone* ("grant
   unlocks: port the swarm orchestrator to ROMA and publish the ag-toolkit executors
   upstream"), not as a claimed present-tense integration.
4. **ODS for the scout layer** is plausible (search-augmented aggregation is ODS's exact
   shape) but only if actually wired; otherwise list as roadmap.

### What reads as a name-drop / turn-off
- **Dobby**: a crypto-native personality model ("aligned with community values like
  personal freedom and pro-crypto principles"—siliconangle). Zero relevance to ag supply
  chains; invoking it reads as pandering.
- **OML fingerprinting**: only relevant if Aqueduct ships a *model* whose provenance needs
  protecting. It doesn't (yet). Mention only if proposing a future fingerprinted ag-grading
  model—thin; better omitted.
- Generic "we align with the GRID vision" prose without a concrete published-agent
  deliverable.

### The Loyal AI / OML ownership thesis (their why)
OML solves "the existential question for open source"—monetization (Kamiya, Forbes).
Open models can't enforce policy or earn; closed models are black boxes. OML fingerprints
model weights so origin/ownership is provable post-copy; blockchain records ownership "like
IP licenses"; OML 2.0 aims at pre-hoc enforcement. "Loyal AI" = "models that are community
built, aligned and controlled" (HuggingFace Dobby card). The deep belief underneath, per
Kamiya in Forbes: **"blockchain is the transaction layer for AI agents"**—bank rails are too
slow/permissioned for software. This funder is one of the very few for whom Aqueduct's
onchain intent settlement is a *credential*, not a liability.

---

## 3. The people

- **Founders**: **Sandeep Nailwal** (Polygon co-founder, exec chairman Polygon Labs),
  **Pramod Viswanath** (Princeton professor), **Himanshu Tyagi** (IISc professor), founded
  Jan 2024; Sensys involved per Moneycontrol. ~70% of the team are open-source AGI
  researchers (Harvard/Stanford/Princeton/IISc/IIT + Google/Meta/Microsoft/Amazon/BCG
  alumni). (wamda.com; theblock.co/post/305182; moneycontrol.com; reports.tiger-research.com)
- **The grant program's face and likely gatekeeper**: **Sachi Kamiya, Director of Venture
  and Growth**—quoted in the PR, is the PR's press contact, gave Forbes the written
  answers. Ex-Polygon Ventures (led the $100M ecosystem fund), Caltech EE, hosts the "Open
  Commons" podcast (episode 1 guest: Viswanath). She is a *venture ecosystem operator*, not
  an academic: expect evaluation instincts tuned to traction, distribution, and ecosystem
  compounding. (sachikamiya.com; rootdata.com/member/Sachi%20Kamiya; Forbes; FinanceWire PR)
- **Review structure**: "A named technical panel reviews every application on merit,
  reaching deliberately into multilingual and underserved markets." An advisory "Open Source
  AGI Grants Council" is still being assembled (open call: "Apply to Join the Council").
  (sentient.foundation/grants) — nobody named publicly yet as of 2026-07-02.
- **India/Global-South gravity**: Tyagi at IISc (a program-launch academic partner), heavy
  Asia expansion (Korea, Tsinghua, Jiaotong symposiums). The farmers RFP reads like it was
  written with the Indian/Global-South smallholder in mind ("a snakebite in rural India is
  not a heart attack in Ohio" appears in the sibling emergency-guide RFP). The
  "multilingual and underserved markets" review commitment is explicit.

### Their evaluation language (verbatim, the words to echo)
- **Formal axes**: "technical merit, ecosystem impact, openness, and long-term potential." (FinanceWire PR)
- **Screening posture**: "We're screening for conviction, real building, and genuine value, not polish" (SOURCE-MATERIALS capture of their form); "**Real builders with real repos move fast. So will we.**" (sentient.foundation/grants)
- **The six things "every product we fund has to earn"** (sentient.foundation/grants):
  1. **Open** — "Anyone can run it, inspect it, and build on it, and that is why it works."
  2. **Yours to keep** — "A tool you can be cut off from was never yours."
  3. **Accessible** — "runs on the hardware people actually own... the cheapest phone."
  4. **Good for humanity** — "measurably better, especially for those the market overlooked."
  5. **Private by default** — "the most sensitive data never leaves the person's own device."
  6. **Empowering, not extractive** — "hands people a capability, instead of harvesting them for one."
- **Openness bar**: "At least one essential part of a project—its model, weights, code, data, or evals—is something anyone can run, inspect, and build on, **and that openness is why the product is better**." (sentient.foundation/product-requests; echoed in PR: "contributes meaningfully to the project's value and adoption")
- **Kamiya's registers**: "A few companies are trying to become the OPEC of intelligence—meter it, price it, decide who gets it. We're making it air." / "the people building on them should win, not pay rent on intelligence forever." / "We want to become the Linux Foundation of AI." / open counterparts "only 3-6 months behind." (PR; Forbes)
- **The window urgency**: "It is open now, and it does not stay open. We are funding the people who move through it." (sentient.foundation/grants)
- **Beyond money**: distribution, compute credits, engineering from the ROMA/ODS/EvoSkill team, community. (sentient.foundation/grants)

---

## 4. The farmers RFP specifically

Full text captured in SOURCE-MATERIALS.md and verified live at
sentient.foundation/product-requests (fetched 2026-07-02). It is **one of 21 RFPs**, in
"Part One: for the people the market forgot" (the other half is trust infrastructure:
agent identity, sandboxing, verifiable inference, model provenance—note how many Part Two
themes Aqueduct's diligence/attestation layer touches).

- **No public commentary, no visible prior applicants, no related threads found**—searches
  for Sentient + smallholder farmers surface only the RFP page itself. Expected: the
  program is 8 days old.
- **The RFP's emotional core is the failure-mode paragraph**: "the obvious failure mode is
  the tool becoming the new middleman, extracting the same rent. Open is the only version
  where the value and the data stay with the farmers." An application that answers *this*
  structurally (neutral open layer, MIT, forkable, no take-rate enclosure) is answering
  the sentence they cared enough to write.
- **The five functions** (grade-from-photo · origin record · buyer match · live-market
  pricing · farm-to-sale tracking) are framed as "an AI app... from a photo"—i.e., the RFP
  imagines a farmer-facing app. **Aqueduct's DEMO-SPEC deliberately builds the layer, not
  the app, and drops grade-from-photo and cheap-Android from the demo.** This is the
  central tension of the bid (see §5). It is arguable—the *app* framing without an open
  market/trust layer beneath it recreates the platform-middleman they fear—but it must be
  argued explicitly, not papered over.
- **Two of the six beliefs are partial misses for Aqueduct as demoed**: "Accessible
  (cheapest phone)" and "Private by default (on-device)." The other four (Open, Yours to
  keep, Good for humanity, Empowering not extractive) are direct hits. Honest scoring
  against all six, with roadmap for the misses, matches their "not polish" posture better
  than pretending.

---

## 5. Honest read: what wins with these specific people

**What wins**: a working repo at a URL, with real reads of real smallholder platforms, an
onchain settle they can click, MIT license, an explicit answer to "what would get worse if
it closed tomorrow" written in anti-enclosure language, a concrete GRID/ROMA reciprocity
deliverable, and a team slide that says "we wrote the book on green crypto and shipped this
exact trust layer for collectible cards, now pointed at the largest market on earth." The
reviewers are crypto-native venture operators + agent-framework authors: the Base Sepolia
settlement, the agent swarm, and the intent/solver economy are *features* to this panel
in a way they would be liabilities almost anywhere else. The real-vs-sim ledger page is
precisely their register—they are a foundation whose whole thesis is inspectability.

**What turns them off**: promissory language where the demo should be ("will build" vs "is
running"); claiming ROMA/ODS/GRID integration that isn't wired (the ROMA authors provide
the engineering support—they will check); Dobby/OML name-drops with no functional role;
any revenue mechanic that reads as a take-rate on farmers (fails "Empowering, not
extractive"); a polished consultancy deck (their stated screen is "conviction, real
building, and genuine value, **not polish**"); ignoring the on-device/cheapest-phone
beliefs instead of addressing them; and pitching the grants track while smelling like a
token launch—the grant track is for public goods ("No equity. No lockups. No claim on your
work. Just build."), and while they love crypto *rails*, a speculative-token framing
belongs in their investment track, not the grant.

**Timing**: first-wave applications land while the Foundation needs showcase grantees and
before any backlog. "Real builders with real repos move fast. So will we" is an invitation
to be fast and concrete.

---

## Application implications

### Five do's

1. **Answer the failure-mode paragraph structurally, as the spine of Q2(e).** The RFP's
   core sentence is "the obvious failure mode is the tool becoming the new middleman,
   extracting the same rent." Frame Aqueduct as the *anti-enclosure layer*: MIT, forkable,
   neutral, no take-rate—"what gets worse if it closed" = the farmgate gets re-enclosed by
   whoever owns the closed layer. (Evidence: sentient.foundation/product-requests farmers
   RFP; grants-page belief #6 "Empowering, not extractive"; Kamiya's "pay rent on
   intelligence forever," Forbes 2026-07-01.)
2. **Make the demo the application—present tense only, ledger included.** Their screen is
   "conviction, real building, and genuine value, not polish" and "Real builders with real
   repos move fast"; Q2(f) requires a live https demo. The DEMO-SPEC's real-vs-sim ledger
   and LIVE/SIM/TESTNET badges are exactly this funder's inspectability register—keep them
   front and center, and make the repo build from a fresh clone (their openness bar is
   "anyone can *run* it"). (Evidence: sentient.foundation/grants; product-requests "What We
   Mean by Open"; FinanceWire PR evaluation axes.)
3. **Offer concrete ecosystem reciprocity as grant deliverables: GRID agents + ROMA
   migration + Celo.** Commit to publishing Aqueduct's scout/oracle/diligence agents on the
   GRID (their bar: agents that "perform real tasks, not just wrap prompts") and to porting
   the swarm orchestrator to ROMA as a funded milestone—describe the swarm in ROMA's own
   five-role vocabulary (Atomizer/Planner/Executor/Aggregator/Verifier; the diligence
   agents ARE their Verifier concept). Note Celo is both a GRID launch chain and Aqueduct's
   stated migration roadmap. This hits their "ecosystem impact" axis with receipts.
   (Evidence: siliconangle.com GRID launch; github.com/sentient-agi/ROMA; DEMO-SPEC §5;
   FinanceWire PR.)
4. **Keep the onchain rails loud.** Uniquely among grant funders, Sentient believes
   "blockchain is the transaction layer for AI agents" (Kamiya, Forbes) and runs its own
   chain/token/GRID staking economy; their GitHub even has an agentic-payments bot. The
   Base Sepolia intent settlement, the USDC buy-rail lineage (Hermes), and agent-driven
   settlement are differentiators to this panel—write them as core architecture, not an
   appendix. (Evidence: Forbes 2026-07-01; sentient.foundation/news SENT tokenomics;
   github.com/sentient-agi/agentic-payments-bot.)
5. **Score Aqueduct against their six beliefs explicitly—including the two partial
   misses—and answer all four formal axes.** Address Open/Yours-to-keep/Good-for-humanity/
   Empowering as hits with evidence; address Accessible (cheapest phone) and Private-by-
   default (on-device) honestly as roadmap, arguing the open layer is the precondition that
   makes a farmer-facing on-device app non-extractive (and that grade-from-photo is a
   shipped SlabClaw primitive awaiting retarget). Structure Q5 ("what the grant unlocks")
   around technical merit / ecosystem impact / openness / long-term potential. Their panel
   "reaches deliberately into multilingual and underserved markets"—the Chiapas/EthicHub
   anchor and Global-South framing fit; say so. (Evidence: sentient.foundation/grants six
   beliefs + panel language; FinanceWire PR axes; DEMO-SPEC §2, §8.)

### Three don'ts

1. **Don't claim stack integrations that aren't wired, and don't name-drop Dobby/OML.**
   Grantees get "hands-on engineering support from the team behind... ROMA, Open Deep
   Search, and EvoSkill"—the framework authors read the application. A present-tense "built
   on ROMA" that isn't, or a Dobby/OML mention with no functional role (Dobby is a
   crypto-personality model; OML fingerprints model weights Aqueduct doesn't ship), reads
   as pandering and dies at the named technical panel. Offer ROMA/GRID as funded
   milestones instead. (Evidence: sentient.foundation/grants "Engineering"; siliconangle
   Dobby description; github.com/sentient-agi/OML-1.0-Fingerprinting; Pat's standing
   no-unwired-capability rule.)
2. **Don't let any mechanic smell extractive or token-speculative on the grant track.** No
   take-rate on farmer value, no "we'll launch a token" framing—the grant track is "No
   equity. No lockups... Just build" for public goods, and belief #6 screens for "hands
   people a capability, instead of harvesting them for one." The tool-becomes-middleman
   paragraph means any rent-shaped revenue line contradicts the RFP's core fear. (Evidence:
   sentient.foundation/grants tracks + beliefs; product-requests farmers RFP.)
3. **Don't polish over substance or write promissory prose.** Their screen is explicitly
   "not polish"; the winning register is repo links, benchmark-style numbers (their own
   habit: "45.6% vs 19.8%", "650,000 owners", "2M users"), fetch timestamps, and tx hashes.
   Q2(f) must describe exactly what exists at the URL—no "will," no vision-deck filler, no
   capability shown in UI before it runs. (Evidence: SOURCE-MATERIALS screening quote;
   sentient.foundation/grants "Real builders with real repos"; reports.tiger-research.com
   benchmark framing; DEMO-SPEC §10.)

---

## Source index

| Source | What it evidences |
|---|---|
| https://sentient.foundation/product-requests | All 21 RFPs incl. farmers; "What We Mean by Open" |
| https://sentient.foundation/grants | Six beliefs, two tracks, named technical panel, council call, beyond-the-grant support, "the window" |
| https://sentient.foundation (homepage) | ROMA/OML/ODS positioning; roma_dspy five-module code sample; $42M + Sparks + Asia news |
| https://sentient.foundation/news + /news/be-the-sparks | Program history: Sparks, symposiums, SENT tokenomics, airdrop, 2M users, NeurIPS 2025 |
| FinanceWire PR via markets.businessinsider.com (2026-06-24) | $42M program mechanics, evaluation axes, Kamiya quotes, ecosystem participants (Alibaba Cloud, Franklin Templeton, Princeton, IISc) |
| Forbes, Boaz Sobrado (2026-07-01) | Kamiya written answers: Linux Foundation of AI, 3-6 months behind, blockchain as agent transaction layer, OML as monetization answer, 5-year parity goal |
| https://github.com/sentient-agi (+ ROMA README) | 17 repos; ROMA Atomizer/Planner/Executor/Aggregator/Verifier; EvoSkill, GEPA+, Enclaves, SERA, CryptoAnalystBench, agentic-payments-bot |
| https://www.sentient.xyz/grid | GRID self-description, 110+ partners, 15k+ developers, repo blurbs |
| siliconangle.com (2025-08-15) | GRID launch: 40 agents/50 data sources/10 models; Napkin, Exa; Base/BNB/Polygon/Arbitrum/Celo/Near; Tyagi quotes; investor list |
| reports.tiger-research.com/p/sentient-agi-eng (2025-11-06, part-funded by Sentient) | GRID/ROMA/OML deep-dive; SEAL-0 45.6% vs 19.8%; OML 1.0 mechanics + 2.0 direction; team composition |
| huggingface.co/SentientAGI/Dobby-Unhinged-Llama-3.3-70B; cointelegraph via tradingview; fireworks.ai | Dobby Loyal AI definition; 650-700k NFT ownership mint |
| wamda.com; theblock.co/post/305182; moneycontrol.com | Founders (Nailwal, Viswanath, Tyagi), $85M seed, Founders Fund/Pantera/Framework |
| sachikamiya.com; rootdata.com | Kamiya: Director of Venture & Growth, ex-Polygon Ventures $100M fund, Caltech EE, Open Commons host |
