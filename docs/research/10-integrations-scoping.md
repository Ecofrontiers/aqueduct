# 10 — Integrations scoping: x402, Base MCP, Robinhood Chain, and what else fits

Backlog items #13-16. Four separate asks that turn out to be one coherent finding: they're
not four unrelated integrations, they're three layers of the same stack — a payment
protocol (x402), the surface it monetizes (MCP / the `/api/v1/*` roadmap surface from
docs/research/09), and a settlement venue for what the tokenizer-solver concept (§9 of this
same doc series) would eventually produce (Robinhood Chain). Research only — nothing here
is built. All facts below verified via direct search 2026-07-03, not training-data recall.

## x402 (#13)

**What it actually is, confirmed:** an open protocol, launched by Coinbase + Cloudflare
(September 2025), that puts the long-dormant HTTP `402 Payment Required` status to work. A
server responds `402` with a price, accepted tokens, and payment terms; the client (often an
AI agent) pays in stablecoin and retries the request with a payment proof attached. No
account, API key, or subscription relationship between caller and server — payment IS the
auth. An x402 Foundation now exists (Coinbase + Cloudflare as founding members); adoption
claims from mid-2026 sources include Google, Stripe, AWS, and Visa evaluating or integrating
it (source: blockeden.xyz forum post, "Is x402 the Most Important Protocol of 2026?" — a
claim, flagged as such, not independently verified here).

**Where it fits Aqueduct, concretely:** the declared-but-unbuilt `/api/v1/*` surface
(docs/research/09, the "common API for green investment" pivot) is close to the textbook
x402 use case. Today that surface has no monetization story — it's scoped as "documented,
versioned, public read-only, no auth." x402 is the mechanism that turns "public read-only"
into "public, metered, pay-per-call" without building a login system, API-key issuance, or a
billing relationship — exactly the kind of infrastructure a small team building an open
aggregator (not a platform anyone has to sign up for) should prefer, matching the "nobody
owns it" architecture that this project's own research already validated over Komgo/Marco
Polo/Contour/we.trade's closed-consortium failure mode (docs/research/09).

**Concretely, what would be gated:** not the map or the marketing pages — the compute-heavy,
genuinely valuable reads: a policy verdict for a specific lot (`sim/policy.mjs`'s
`evaluatePolicy`), a capital-formations match for a buyer's specific criteria, a tokenizer
race for a specific instrument. Free/public: the map, the ledger, the About page — same
tiering most x402-gated APIs already use (free tier discovers, paid tier does real work per
caller).

**Not yet built, and shouldn't be started without Pat:** any real x402 server-side gating
requires deciding on a receiving wallet address and a price schedule — both are Pat's calls
per the project's own standing rule (keys/broadcasts/deployments are always Pat's, never
hunted for or assumed).

## Base MCP (#14)

**What it actually is, confirmed:** launched by Coinbase (Fortune, 2026-05-26) — an MCP
server that lets an AI agent (Claude, ChatGPT, Cursor) conduct real crypto operations
(wallet transfers, token swaps, DeFi lending) through natural-language tool calls instead of
a bespoke SDK integration. It's already installed in this environment per the tool-stack
memory record (`claude mcp add --transport http --scope user base-mcp ...`).

**The finding that ties this to x402:** x402 isn't a separate payment rail from MCP, it's
specifically positioned (Coinbase's own docs: "MCP Server with x402") as the monetization
layer *for* MCP servers themselves — "adding x402 turns each tool call into a paid API
request settled in stablecoins, with no account, API key, or session token between agent and
server" (eco.com). That means Aqueduct's own future `/api/v1/*` surface doesn't have to
choose between "a REST API" and "an MCP server other agents can call" — it can be both, with
x402 as the shared payment layer underneath either transport.

**Optimization scope, concretely:** today Base MCP is used ad hoc (per its skill file,
pre-built prompts for wallet/token/DeFi workflows). The optimization opportunity specific to
Aqueduct is narrow and real: when Pat's settle broadcast eventually unblocks (currently
gated on `AQUEDUCT_SETTLE_PRIVATE_KEY`, Pat's to provide), Base MCP is a plausible path for
*Pat* to inspect/execute that broadcast conversationally rather than via a bespoke script —
not something to build proactively, since it's Pat's key and Pat's action per the project's
own standing rule.

## Robinhood Chain (#16)

**What it actually is, confirmed:** a permissionless, Ethereum-compatible Layer 2 built on
Arbitrum, purpose-built for tokenized real-world assets. Public testnet launched
2026-02-10; public mainnet has since launched (pymnts.com, coindesk.com). Current focus is
tokenized equities — "Stock Tokens tied to NVIDIA, Google, Apple," plus private equity and
ETFs (robinhood.com/chain) — not commodities, not agriculture. Context: tokenized RWAs
overall reached ~$24B by February 2026, +266% in 2025 (investax.io) — consistent with this
project's earlier finding that RWA tokenization is a large, real, fast-growing sector that
nonetheless has a gap exactly where Aqueduct sits (docs/research/09: Centrifuge/Maple/
Goldfinch don't touch agricultural commodities either).

**Where it fits Aqueduct, concretely:** Robinhood Chain is a *settlement venue* candidate,
not a data source or a policy engine — the natural pairing is with the tokenizer-solver
concept (docs/research/09 §Tokenizer solvers, `sim/tokenizerRoster.mjs`): once a smallholder
lot or coop's receivable is structured into a tradable instrument by one of the tokenizer
archetypes, it needs somewhere liquid to actually trade. A permissionless, financial-grade L2
purpose-built for tokenized RWAs is a plausible destination for that instrument — more so
than a generic smart-contract chain, since Robinhood Chain's whole design brief is investor-
facing tokenized assets, not general DeFi. It is NOT a fit today: its current asset roster
(public equities, private equity, ETFs) has no agricultural-commodity precedent, mirroring
the exact gap the tokenizer-race roster already names honestly (`estimate` confidence, "not
Centrifuge's/Maple's/Goldfinch's actual quoted terms" — the same caveat would apply here).

**Scope decision:** research-only for this pass. Do not add a fifth tokenizer archetype
named after Robinhood Chain without a specific reason to — it would be inventing a fictional
partnership/support claim (FABLE-KICKOFF's "never a capability shown live that isn't," and by
extension never a named-partner claim that isn't real) rather than an honest architectural
archetype the way the existing four are labeled (all explicitly "archetype only, not
[Platform]'s actual quoted terms").

## What other integrations make sense (#15)

Given the three findings above, the honest synthesis is narrower than "look for more
integrations" — it's: **the real gap in Aqueduct's current stack is a payment/monetization
layer for the API surface it has already decided to build, not a new blockchain or a new
data source.** Concretely, in priority order if/when Pat wants to build any of this:

1. **x402-gate the (not-yet-built) `/api/v1/*` surface** — the highest-leverage move, because
   it's the one piece of infrastructure genuinely missing from an otherwise-scoped roadmap
   item, and it's a natural fit for "open aggregator, pay-per-use, no account" positioning.
2. **Expose the same surface as an MCP server** — a second transport over the same
   functions (`lots`, `policy/evaluate`, `capital/formations`), x402-gated the same way,
   letting other agents (not just humans hitting a REST endpoint) consume Aqueduct
   programmatically. Genuinely differentiating given the "for AI agents" framing of both
   x402 and Base MCP.
3. **Robinhood Chain as a future tokenizer-solver settlement destination** — not now, but
   worth revisiting once/if the tokenizer race moves from illustrative SIM mechanism to
   anything resembling a real structuring conversation, since it's a real, live,
   permissionless RWA-focused L2 rather than a closed consortium chain.

Not recommended, and not researched further here: a bespoke Aqueduct-specific chain or
token — every closed/proprietary rail in this exact space (Komgo, Marco Polo, Contour,
we.trade) already failed for the reason this project's own architecture is built to avoid
(docs/research/09) — adding a new one would repeat that mistake, not fix a gap.
