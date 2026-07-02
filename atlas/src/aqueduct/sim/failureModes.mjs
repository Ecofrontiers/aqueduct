// Aqueduct — institutional failure-mode catalog, extracted from the AI Mechanism
// Atlas (aidesignatlas.xyz, MIT license, source: ai-mech-atlas/src/MechanismAtlas.jsx
// FAILURES[]). 50 entries, English only (French mirror fields dropped —
// not this repo's convention). Extracted verbatim, not summarized: desc/fullAnalysis/
// institutionalContext are the atlas's own text, each already cited to named institutional-
// economics literature (Williamson, Akerlof, Hurwicz, Ostrom, Goodhart, Arnstein, etc.) in
// institutionalContext.
//
// This is a policy LIBRARY, not a policy engine — sim/policy.mjs cites entries here by id
// via PolicyRule.citesFailureMode. Citing an entry is not the same as claiming the atlas is
// integrated; it is a citation, same discipline as a research doc citing an arXiv paper.
// See docs/research/09-institutional-policy-swarm-coordination.md for the position this
// catalog exists to support.
//
// Update discipline: this is a point-in-time extraction (2026-07-02). If the upstream atlas
// adds/edits entries, re-extract deliberately — do not hand-edit entries here to drift from
// the source of truth.

/** @typedef {{id: string, name: string, cat: string, sev: "Critical"|"High"|"Medium"|"Low", desc: string, fullAnalysis: string, institutionalContext: string, mechs: string[], observed: boolean, where: string}} FailureMode */

/** @type {FailureMode[]} */
export const FAILURE_MODES = [
  {
    id: "manipulation",
    name: "Manipulation & Collusion",
    cat: "Market",
    sev: "Critical",
    desc: "Agents collude to fix auction outcomes, spoof demand, or manipulate prediction markets.",
    fullAnalysis:
      "Market manipulation in AI agent networks differs fundamentally from human manipulation. Agents trained on similar data develop correlated strategies without explicit coordination — 'algorithmic collusion.' Operating at millisecond timescales, they execute manipulation patterns faster than detection systems respond. Energy markets (FERC) and financial markets (SEC) have extensive enforcement frameworks, but no equivalent exists for AI agent marketplaces.",
    institutionalContext:
      "Williamson's transaction cost economics predicts manipulation increases when: (1) asset specificity is high, (2) uncertainty is high, (3) transaction frequency is high. All three hold in AI agent coordination — manipulation is structurally endemic without institutional countermeasures.",
    mechs: ["auction", "capacity", "prediction"],
    observed: true,
    where: "Energy markets (FERC enforcement), DeFi flash loan attacks, prediction market ring attacks",
  },
  {
    id: "thin-markets",
    name: "Thin Markets",
    cat: "Market",
    sev: "High",
    desc: "Too few participants produce volatile prices and illiquid markets.",
    fullAnalysis:
      "Thin markets produce prices reflecting a handful of actors' beliefs rather than distributed intelligence. When few agents participate in resource allocation, 'wisdom of crowds' benefits disappear. Worse, thin markets are easier to manipulate — a single well-resourced agent can move prices.",
    institutionalContext:
      "Ostrom's commons governance principles emphasize boundary rules balancing access with sustainability. Thin markets often result from overly restrictive boundaries (excluding legitimate participants) or inadequate contribution requirements (allowing free-riding that discourages active participation).",
    mechs: ["capacity", "auction", "prediction"],
    observed: true,
    where: "Early DeFi liquidity pools, nascent prediction markets, AI agent registries",
  },
  {
    id: "adverse-selection",
    name: "Adverse Selection",
    cat: "Market",
    sev: "High",
    desc: "High-quality agents can't credibly signal quality, so markets select for cheap, low-quality agents.",
    fullAnalysis:
      "Akerlof's 'market for lemons' applies directly to AI agent marketplaces. When principals can't verify agent quality before engagement, they price contracts assuming average quality. High-quality agents exit (can't recover costs); low-quality agents dominate. The market selects for cheapest, not best.",
    institutionalContext:
      "Hurwicz's mechanism design suggests signaling mechanisms (staking, bonds, reputation) can address adverse selection — but only if signals are costly to fake and informative about quality. Current AI agent markets lack such mechanisms.",
    mechs: ["matching", "auction"],
    observed: true,
    where: "Freelance AI agent marketplaces, gig economy platforms",
  },
  {
    id: "fee-gaming",
    name: "Fee Mechanism Gaming",
    cat: "Market",
    sev: "High",
    desc: "Agents understanding adjustment functions manipulate fees through strategic behavior.",
    fullAnalysis:
      "EIP-1559 replaced chaotic first-price auctions with protocol-calculated base fees — but agents understanding the adjustment function can still game it. Block producers stuff phantom transactions to inflate base fees. Faster agents gain systematic timing advantages. More predictable, but not manipulation-proof.",
    institutionalContext:
      "Goodhart's Law: when a measure becomes a target, it ceases to be a good measure. Fee mechanisms designed to allocate scarce resources become targets for extraction.",
    mechs: ["congestion", "loc-price"],
    observed: true,
    where: "Ethereum EIP-1559 block stuffing, MEV extraction, priority gas auctions",
  },
  {
    id: "pref-manipulation",
    name: "Preference Manipulation",
    cat: "Market",
    sev: "High",
    desc: "AI agents strategically misrepresent preferences to obtain better matches.",
    fullAnalysis:
      "In matching markets, agents have incentives to misrepresent preferences for better outcomes. AI agents compute optimal misrepresentations far more effectively than humans — the strategic space is fully transparent to them. This undermines the efficiency properties that make matching mechanisms desirable.",
    institutionalContext:
      "The revelation principle states that any equilibrium of any mechanism can be replicated by a truthful equilibrium of a direct mechanism — but assumes designers can prevent misrepresentation. When agents compute optimal lies faster than mechanisms detect them, the principle breaks down.",
    mechs: ["matching"],
    observed: false,
  },
  {
    id: "pool-draining",
    name: "AMM Pool Draining",
    cat: "Market",
    sev: "Critical",
    desc: "Arbitrageurs extract value from liquidity providers through impermanent loss exploitation.",
    fullAnalysis:
      "Automated market makers provide liquidity but expose providers to impermanent loss when arbitrageurs exploit price discrepancies between AMM and external markets. Sophisticated agents systematically extract value from passive liquidity providers — wealth transfer from less sophisticated to more sophisticated.",
    institutionalContext:
      "A boundary rule failure: AMMs are open to all participants, but benefits accrue disproportionately to those with superior information and execution speed. Ostrom would note the lack of graduated sanctions for extractive behavior.",
    mechs: ["amm"],
    observed: true,
    where: "Uniswap v2/v3 arbitrage, sandwich attacks, JIT liquidity provision",
  },
  {
    id: "info-asymmetry",
    name: "Information Asymmetry",
    cat: "Market",
    sev: "High",
    desc: "Agents with faster access to data gain systematic advantages over other participants.",
    fullAnalysis:
      "Fee mechanisms were designed to eliminate first-price auction chaos, but information asymmetry persists. Agents with faster access to utilization data, pending transaction pools, or external price feeds gain systematic advantages. Fair in theory, unfair in practice.",
    institutionalContext:
      "North's institutional economics: formal rules (the mechanism) interact with informal constraints (access, information, relationships) to produce actual outcomes. Fair mechanisms require addressing both.",
    mechs: ["loc-price", "congestion"],
    observed: true,
    where: "High-frequency trading, MEV bots, latency arbitrage",
  },
  {
    id: "stake-concentration",
    name: "Stake Concentration",
    cat: "Accountability",
    sev: "Critical",
    desc: "When staking determines influence, wealth concentrates power into plutocracy.",
    fullAnalysis:
      "Staking mechanisms aim to ensure skin in the game — those with more at stake have more say. But this reproduces plutocracy: top 1% of wallets hold dominant fractions of stake. The mechanism meant to create accountability instead creates oligarchy. More capital means more influence, regardless of competence or alignment with collective interests.",
    institutionalContext:
      "The fundamental tension Schneider (2024) identifies between exit-based and voice-based governance. Staking is an exit mechanism (stake to participate, unstake to leave) providing accountability through capital commitment. But exit-heavy governance excludes those without capital and concentrates power among the wealthy.",
    mechs: ["val-staking", "multi-sig"],
    observed: true,
    where: "Ethereum validator concentration, dPoS chain governance, DeFi protocol voting",
  },
  {
    id: "nothing-at-stake",
    name: "Nothing-at-Stake",
    cat: "Accountability",
    sev: "High",
    desc: "Agents stake across multiple conflicting positions without meaningful commitment cost.",
    fullAnalysis:
      "The 'nothing at stake' problem: agents stake on multiple conflicting outcomes simultaneously without cost. If an agent supports both fork A and fork B, staking loses its disciplinary function — no penalty for being wrong because the agent is also right.",
    institutionalContext:
      "A failure to create the commitment Williamson identifies as essential for coordination. Staking is meant to be a credible commitment mechanism; nothing-at-stake attacks undermine credibility.",
    mechs: ["val-staking"],
    observed: true,
    where: "Early proof-of-stake implementations, prediction market hedging",
  },
  {
    id: "slashing-cascades",
    name: "Slashing Cascades",
    cat: "Accountability",
    sev: "Critical",
    desc: "Correlated failures trigger mass slashing that punishes honest agents for systemic risk.",
    fullAnalysis:
      "Slashing punishes individual misbehavior, but correlated failure — shared bug, network outage, common data source — triggers mass slashing. Honest agents get punished for systemic risk they didn't create. They exit to avoid exposure, concentrating power among those willing to bear (or create) systemic risk.",
    institutionalContext:
      "Ostrom's graduated sanctions principle assumes individual accountability for individual actions. Slashing mechanisms that punish collective failure violate this, creating perverse incentives.",
    mechs: ["val-staking", "reg-bonds"],
    observed: true,
    where: "Ethereum Prysm client bug (2023), AWS outage cascades, shared oracle failures",
  },
  {
    id: "escalation-flooding",
    name: "Escalation Flooding",
    cat: "Oversight",
    sev: "High",
    desc: "Override requests overwhelm human oversight capacity, degrading the system to rubber-stamping.",
    fullAnalysis:
      "Human oversight requires reviewing escalated decisions. If thresholds are too low — or agents learn that escalation avoids accountability — humans get overwhelmed with override requests. The system degrades to rubber-stamping: approve everything because you can't meaningfully review anything.",
    institutionalContext:
      "The scalability challenge for human-in-the-loop oversight. Ostrom's design principles assume monitors can actually monitor. When decision volume exceeds monitoring capacity, oversight becomes theatrical.",
    mechs: ["threshold-esc"],
    observed: true,
    where: "Content moderation review queues, automated trading alert fatigue, regulatory compliance systems",
  },
  {
    id: "autonomy-creep",
    name: "Autonomy Creep",
    cat: "Oversight",
    sev: "Critical",
    desc: "Gradual expansion of autonomous operation without corresponding governance updates.",
    fullAnalysis:
      "Autonomy creep: an agent approved for narrow tasks slowly expands scope. Oversight mechanisms designed for the original scope become inadequate. The governance surface shrinks without anyone deciding to shrink it.",
    institutionalContext:
      "North's path dependence explains autonomy creep: initial conditions (narrow autonomy with oversight) constrain future trajectories, but small changes accumulate. Without active governance maintenance, systems drift toward less oversight.",
    mechs: ["autonomy-grad", "grace-periods"],
    observed: true,
    where: "Automated trading systems, self-driving car testing programs, content recommendation algorithms",
  },
  {
    id: "cb-ossification",
    name: "Circuit Breaker Ossification",
    cat: "Oversight",
    sev: "Medium",
    desc: "Hard stops become inappropriate as systems evolve but nobody updates them.",
    fullAnalysis:
      "Circuit breakers — hard stops halting autonomous operation under specified conditions — are appropriate at launch but become inappropriate as systems mature. Conservative thresholds for a new system may be too restrictive for a proven one. Nobody has authority or incentive to update them. Inverse problem: breakers never tested fail silently when needed.",
    institutionalContext:
      "The adaptive governance challenge Ostrom emphasizes: rules must evolve with circumstances, but updating them requires institutional capacity that may not exist.",
    mechs: ["circuit-break"],
    observed: true,
    where: "Legacy trading circuit breakers, institutional compliance rules, outdated safety thresholds",
  },
  {
    id: "adjudicator-capture",
    name: "Adjudicator Capture",
    cat: "Dispute",
    sev: "High",
    desc: "Repeat adjudicators develop relationships with frequent disputants, reproducing regulatory capture.",
    fullAnalysis:
      "When the same adjudicators repeatedly resolve disputes involving the same parties, relationships develop. Frequent disputants with large stakes invest in cultivating adjudicator relationships. The regulatory capture dynamics of administrative agencies get reproduced.",
    institutionalContext:
      "Stigler's regulatory capture theory applied to dispute resolution. The 'revolving door' between regulators and regulated industries has a direct equivalent in agent arbitration systems.",
    mechs: ["multi-adj", "staked-arb", "agent-judge"],
    observed: true,
    where: "Regulatory agencies, Kleros repeated arbitrators, commercial arbitration circuits",
  },
  {
    id: "appeal-loops",
    name: "Appeal Loops",
    cat: "Dispute",
    sev: "Medium",
    desc: "Escalation ladders without termination conditions produce infinite appeal cycles.",
    fullAnalysis:
      "Appeal mechanisms let parties contest unfavorable rulings by escalating to larger panels. Without explicit termination conditions, appeals continue indefinitely. Unlike legal systems with res judicata, AI dispute systems often lack finality mechanisms.",
    institutionalContext:
      "In Hirschman's framework, appeals are voice — expressing dissatisfaction rather than exiting. But voice without limits becomes noise; appeal mechanisms need finality to function.",
    mechs: ["esc-ladder"],
    observed: false,
  },
  {
    id: "eval-collusion",
    name: "Evaluation Collusion",
    cat: "Dispute",
    sev: "High",
    desc: "Reciprocal positive evaluation norms undermine quality signals.",
    fullAnalysis:
      "When agents evaluate each other, reciprocity norms emerge: 'I rate you well, you rate me well.' Evaluation loses informational value. Extreme case: Sybil evaluation — creating pseudonymous identities to boost one's own reputation. Both undermine evaluation systems' ability to distinguish quality.",
    institutionalContext:
      "Goodhart's Law applied to evaluation: when reputation becomes a target for manipulation, it ceases to be a reliable signal of quality.",
    mechs: ["agent-judge", "multi-adj"],
    observed: true,
    where: "Amazon review rings, academic peer review, social media engagement farms",
  },
  {
    id: "oracle-manipulation",
    name: "Oracle Manipulation",
    cat: "Agreement",
    sev: "Critical",
    desc: "Onchain contracts depend on oracle data; compromised oracles execute contracts on false information.",
    fullAnalysis:
      "Smart contracts are trustless — execution doesn't require trusting a counterparty. But contracts often depend on external data (prices, events, states) from oracles. The contract is trustless; the oracle is not. Compromised oracles cause contracts to execute on false information, with no recourse.",
    institutionalContext:
      "The limits of 'code is law': contracts can only be as trustworthy as their inputs. Williamson's asset specificity framework suggests oracle-dependent contracts create new dependency forms.",
    mechs: ["smart-contract", "sla-onchain"],
    observed: true,
    where: "Mango Markets exploit ($116M, 2022), Cream Finance oracle attack, Compound liquidation cascade",
  },
  {
    id: "prompt-injection-neg",
    name: "Prompt Injection in Negotiation",
    cat: "Agreement",
    sev: "Critical",
    desc: "Adversarial inputs manipulate opposing agents' reasoning during negotiation.",
    fullAnalysis:
      "When AI agents negotiate, the most successful value-claiming strategy may be adversarial manipulation of the opposing agent's reasoning. In documented AI negotiation competitions, prompt injection outperformed traditional bargaining strategies. Without security boundaries, AI negotiation degrades to manipulation contests.",
    institutionalContext:
      "A fundamental challenge for agreement mechanisms: if agents can manipulate each other's reasoning, 'informed consent' becomes meaningless. What does agreement mean when one party's cognition has been compromised?",
    mechs: ["auto-negotiation"],
    observed: true,
    where: "AI negotiation competitions (2024–25), adversarial ML research",
  },
  {
    id: "reputation-laundering",
    name: "Reputation Laundering",
    cat: "Agreement",
    sev: "High",
    desc: "Agents discard negative-reputation identities and re-register clean.",
    fullAnalysis:
      "Reputation systems assume persistent identity — bad behavior creates lasting consequences. But when identity is cheap (low registration costs, no verification), agents discard negative-reputation identities and start fresh. Reputation-weighted mechanisms become toothless.",
    institutionalContext:
      "The Sybil problem applied to reputation: cheap identity creation means reputation loses its disciplinary function. Mechanisms require some form of costly identity to work.",
    mechs: ["rep-weighted", "reg-bonds"],
    observed: true,
    where: "eBay seller account cycling, Sybil attacks on DeFi protocols, academic citation manipulation",
  },
  {
    id: "side-channel",
    name: "Side-Channel Leakage",
    cat: "Information Structure",
    sev: "Medium",
    desc: "Coordination patterns leak information even with privacy-preserving computation.",
    fullAnalysis:
      "Privacy-preserving computation protects communication content but not patterns. Timing, frequency, and counterparty patterns reveal strategic relationships even when message content is encrypted. Agents infer coordination from metadata alone.",
    institutionalContext:
      "Limits of technical privacy solutions. North would note that formal privacy rules interact with informal inference capabilities to determine actual information flows.",
    mechs: ["selective-disc", "computed-coord", "trusted-enclave", "stat-boundaries", "breach-response"],
    observed: true,
    where: "Tor traffic analysis, blockchain transaction graph analysis, encrypted messaging metadata",
  },
  {
    id: "privacy-weapon",
    name: "Privacy as Weapon",
    cat: "Information Structure",
    sev: "Medium",
    desc: "Selective disclosure used strategically to gain competitive advantage.",
    fullAnalysis:
      "Privacy protections can be exploited for competitive advantage. An agent reveals favorable information while withholding unfavorable information, using privacy mechanisms as strategic tools rather than defensive protections. Privacy as weapon.",
    institutionalContext:
      "Dual-use nature of information mechanisms: tools designed to protect can be weaponized. Ostrom's graduated sanctions logic suggests selective disclosure violations should have consequences.",
    mechs: ["selective-disc", "breach-response"],
    observed: true,
    where: "Selective corporate disclosure, dark pool trading, strategic information release",
  },
  {
    id: "commons-depletion",
    name: "Commons Depletion",
    cat: "Commons",
    sev: "High",
    desc: "Shared coordination infrastructure degraded through overuse without maintenance.",
    fullAnalysis:
      "Agent coordination depends on shared infrastructure: registries, dispute resolution, reputation networks, protocol standards. Each agent rationally maximizes consumption while none bears maintenance costs. Classic tragedy of the commons, applied to digital coordination infrastructure.",
    institutionalContext:
      "Ostrom's design principles apply directly: commons require contribution requirements, boundary rules, and collective choice arrangements. Agent infrastructure lacking these will be depleted.",
    mechs: ["contribution-req", "boundary-rules"],
    observed: true,
    where: "Open-source maintainer burnout, congested public APIs, degraded shared registries",
  },
  {
    id: "enclosure",
    name: "Infrastructure Enclosure",
    cat: "Commons",
    sev: "Critical",
    desc: "Private capture of previously open coordination infrastructure.",
    fullAnalysis:
      "Enclosure: privatization of shared resources. A dominant player forks an open protocol proprietary, locks in users, extracts rent. MCP starts open — what prevents proprietary capture? Distinct from feudalism (governance without consent): enclosure is about ownership, not governance.",
    institutionalContext:
      "Benkler's 'wealth of networks': constant tension between commons and enclosure. Open protocols require active maintenance against capture; openness is not self-sustaining.",
    mechs: ["boundary-rules", "collective-choice"],
    observed: true,
    where: "Google's embrace-extend-extinguish, API platform lock-in, land enclosure movements",
  },
  {
    id: "free-riding",
    name: "Free Riding",
    cat: "Commons",
    sev: "High",
    desc: "Using shared infrastructure without contributing to its maintenance.",
    fullAnalysis:
      "Staking addresses misbehavior but not non-contribution. An agent can stake, never misbehave, benefit from registries, dispute resolution, and coordination protocols, and contribute nothing to their upkeep. Free riding depletes commons without violating any explicit rule.",
    institutionalContext:
      "Ostrom's contribution requirements principle: commons governance must include positive obligations, not just prohibitions. Agent infrastructure needs maintenance funding mechanisms.",
    mechs: ["contribution-req"],
    observed: true,
    where: "Open-source free riders, public radio, digital commons without contribution requirements",
  },
  {
    id: "institutional-capture",
    name: "Institutional Capture",
    cat: "Commons",
    sev: "Critical",
    desc: "Entities being governed capture the governance process itself.",
    fullAnalysis:
      "Broader than adjudicator capture: the largest agent operators control standards bodies, registry governance, and protocol upgrade processes. The governed capture the governors. IETF, IEEE, W3C all struggle with corporate capture of ostensibly neutral standards.",
    institutionalContext:
      "Stigler's capture theory applies to all governance institutions, not just dispute resolution. Any value-creating institution attracts capture attempts. Resistance requires active maintenance.",
    mechs: ["collective-choice"],
    observed: true,
    where: "Regulatory capture (FCC revolving door), W3C DRM standardization, IETF corporate influence",
  },
  {
    id: "democratic-deficit",
    name: "Democratic Deficit",
    cat: "Commons",
    sev: "High",
    desc: "Agent systems make decisions affecting humans without democratic accountability.",
    fullAnalysis:
      "Agent coordination systems allocate resources, resolve disputes, and make decisions affecting humans — procurement outcomes, access to services, resource distribution. But no democratic accountability path connects these decisions to affected communities. Taxation without representation.",
    institutionalContext:
      "Hirschman's voice mechanisms are absent. Affected parties can't influence agent governance except by exiting — and exit may not be available for essential services. Legitimacy problems that threaten system stability.",
    mechs: ["collective-choice", "boundary-rules"],
    observed: true,
    where: "Algorithmic sentencing, automated welfare eligibility, content recommendation governance",
  },
  {
    id: "institutional-affordance-mismatch",
    name: "Institutional Affordance Mismatch",
    cat: "Commons",
    sev: "Critical",
    desc: "AI structurally incompatible with civic institutions, eroding informal norms and organizational capacity that democratic life depends on.",
    fullAnalysis:
      "Hartzog and Silbey argue AI doesn't simply disrupt institutions — it destroys the affordances on which they depend. Courts require deliberate pace, evidentiary standards, and adversarial scrutiny that AI optimization dissolves. Universities rest on apprenticeship, peer evaluation, and scholarly community that automated content generation hollows out. The press depends on investigative labor, source relationships, and editorial judgment that AI floods crowd out. Not functions AI performs badly — functions AI structurally cannot perform because they require the friction, slowness, and human judgment that AI is designed to eliminate.",
    institutionalContext:
      "North's theory of institutional change: informal constraints (conventions, norms, codes of conduct) evolve slowly and resist deliberate redesign. When AI systems accelerate the activities that previously reinforced these norms, path dependence becomes path destruction — complementary human practices atrophy faster than governance can respond. Second-order failure: not AI coordination failing, but AI coordination destroying the substrate of human coordination.",
    mechs: ["autonomy-grad", "collective-choice", "boundary-rules"],
    observed: true,
    where:
      "DOGE workforce automation (Hartzog & Silbey 2026), AI-generated academic submissions flooding peer review, automated legal document generation eroding adversarial standards",
  },
  {
    id: "reward-function-convergence",
    name: "Reward-Function Convergence",
    cat: "Market",
    sev: "Critical",
    desc: "Agents trained on similar reward functions independently converge on supra-competitive equilibria — collusion without communication, intent, or any agreement.",
    fullAnalysis:
      "Dou et al. demonstrate that Q-learning agents on identical reward functions develop implicit coordination producing outcomes indistinguishable from explicit collusion — higher prices, reduced output, sustained supra-competitive margins — without any communication channel. Pure reinforcement: each agent's optimal policy, discovered independently, is a best response to other agents' identically-discovered policies. No meeting, no signal, no agreement; yet the equilibrium is as if they had agreed.",
    institutionalContext:
      "Existing antitrust law requires proof of agreement, communication, or coordinated conduct — none present here. A structural failure of the legal framework itself, not merely an enforcement gap. Hurwicz's revelation principle assumes distinct private information; reward-function convergence shows shared training environments homogenize 'private' information by design. Falls outside every existing legal and regulatory category.",
    mechs: ["auction", "prediction", "autonomous-orch", "emergent-coord-struct"],
    observed: true,
    where:
      "Dou et al. Q-learning collusion experiments (2024), algorithmic pricing in airline and ride-share markets, high-frequency trading convergence",
  },
  {
    id: "context-window-tragedy",
    name: "Context Window Tragedy",
    cat: "Information Structure",
    sev: "High",
    desc: "Memory, skills, protocols, and live data compete for finite context budget — coordination degrades through internal allocation failure.",
    fullAnalysis:
      "Zhou 2026 maps a four-layer externalization stack (system prompt / tools / memory / session) against a finite context budget. Unlike shared digital infrastructure, context windows are per-agent and non-expandable within a session. When memory retrieval, skill loading, protocol metadata, and live data all compete for the same budget, sub-optimal allocation degrades coordination quality. Progressive disclosure helps, but under load (deep sessions, large tool sets, rich episodic memory) the tragedy emerges: the most contextually relevant layer gets crowded out by whichever loaded earliest.",
    institutionalContext:
      "Tragedy of the commons applied to cognitive bandwidth rather than shared infrastructure. Ostrom's principles were developed for subtractable resources held in common by multiple agents; here the resource is internal — the agent's own attention — contested by its own subsystems. Standard remedies (collective choice, contribution requirements) don't apply because there's no commons governance body. The solution: explicit budget allocation — treating context as a constrained resource with priority rules, not an unlimited workspace.",
    mechs: ["harness-institution", "capability-routing", "ext-state-arch", "selective-disc"],
    observed: true,
    where:
      "Long-horizon coding agents dropping tool definitions mid-session, RAG systems producing inconsistent context as session depth increases, agent pipelines with memory retrieval crowding out live tool output",
  },
  {
    id: "externalization-cascade",
    name: "Externalization Cascade",
    cat: "Oversight",
    sev: "High",
    desc: "Error in one externalization layer amplifies through dependent layers via positive feedback — compounding failure exceeding the sum of parts.",
    fullAnalysis:
      "Zhou 2026's module interaction map shows the four externalization layers (working memory / episodic / semantic / procedural) are not independent — each layer's output becomes input to the next. Stale memory retrieval causes a skill to execute on wrong context; wrong skill produces a malformed protocol action; malformed protocol contaminates the next memory write. Unlike slashing cascades (punishing honest agents for correlated misbehavior), externalization cascades are pure error propagation: no bad faith, yet increasingly incorrect output at each layer transition.",
    institutionalContext:
      "Williamson identifies bounded rationality and opportunism as twin sources of coordination failure. Externalization cascades expose a third source specific to multi-layer cognitive architectures: error amplification through coupled subsystems. Institutional analogy: administrative relay failure — a policy misinterpretation at ministry level generates increasingly divergent implementation at each successive tier. Remedy: layer-boundary validation, where each transition verifies state consistency before propagating — checksums for cognitive architecture.",
    mechs: ["harness-institution", "ext-state-arch", "breach-response", "autonomous-orch"],
    observed: true,
    where:
      "Multi-agent coding pipelines with corrupted task context, RAG-augmented systems with stale index producing hallucinated citations, agent memory corruption cascades in long-running customer service bots",
  },
  {
    id: "temporal-governance-gap",
    name: "Temporal Governance Gap",
    cat: "Oversight",
    sev: "Critical",
    desc: "AI systems act at machine speed while governance deliberates at human speed, creating a structural window of unaccountable autonomous action that widens as AI capability increases.",
    fullAnalysis:
      "Evans et al. and AI Swarms for Bioregions identify a structural temporal mismatch: algorithmic agents make thousands of consequential decisions per second while human oversight — legislative processes, regulatory review, judicial determination, community consultation — operates on timescales of days to years. Not merely a lag problem solvable by faster review; a categorical mismatch. The faster AI systems operate, the wider the governance gap, and the more consequential decisions accumulate outside any accountability perimeter before governance can respond.",
    institutionalContext:
      "North's institutional evolution theory assumes informal constraints adapt gradually to formal rule changes on comparable timescales. AI breaks this: formal rules (regulation) operate on political timescales, informal norms on generational timescales, AI capability deployment on product release timescales — months to weeks. A compounding legitimacy crisis: institutions can't claim to govern what they can't observe at the speed it occurs. The response: pre-authorization frameworks (specifying permitted action spaces in advance, like constitutional constraints) rather than reactive oversight, which always arrives too late.",
    mechs: ["autonomy-grad", "circuit-break", "threshold-esc", "constitutional-constraint", "harness-institution"],
    observed: true,
    where:
      "High-frequency trading outpacing regulatory response (2010 Flash Crash), AI-driven content moderation acting before appeal review, bioregional agent systems making land-use recommendations faster than community consultation cycles",
  },
  {
    id: "content-injection-trap",
    name: "Content Injection Trap",
    cat: "Information Structure",
    sev: "Critical",
    desc: "The agent's perception layer is poisoned with adversarial content embedded in webpages, documents, or UI the agent reads.",
    fullAnalysis:
      "Targets the agent's perception. The DeepMind Table 1 sub-vectors are: web-standard obfuscation, dynamic cloaking (serving different content to the agent than to a human viewer), steganographic payloads (LSB encoding in images), and syntactic masking (instructions hidden in Markdown or LaTeX the renderer ignores but the model reads). Measured success is alarmingly high: WASP up to 86%, HTML/aria-label injection 15–29%, AndroidWorld up to 93%. The trap weaponises the agent's own capability — its willingness to read and act on environmental text — rather than breaking the model.",
    institutionalContext:
      "North: the web was an institution built for human eyes, with norms (visible content = real content) that agents inherit but that no longer hold. The trap exploits a path-dependent assumption baked into the medium itself — there is no structural separation between 'content to display' and 'instructions to follow' in HTML/Markdown.",
    mechs: ["selective-disc", "trusted-enclave", "capability-routing"],
    observed: true,
    where:
      "WASP benchmark (86%), AndroidWorld (93%), HTML aria-label injection, indirect prompt injection in retrieved documents",
  },
  {
    id: "semantic-manipulation-trap",
    name: "Semantic Manipulation Trap",
    cat: "Oversight",
    sev: "High",
    desc: "The agent's reasoning is steered by biased framing, oversight-evasion, or persona induction without any overtly malicious instruction.",
    fullAnalysis:
      "Targets reasoning rather than perception. Table 1 sub-vectors: biased phrasing / framing / priming, oversight-and-critic evasion (content crafted to slip past a reviewing agent), and persona hyperstition. The latter is the standout novel vector — it weaponises Hacking's 'looping effect' and Soros's reflexivity: repeatedly addressing an agent as a particular character induces that character (the paper cites the 'Claude Finds God' and Grok episodes). No injected instruction is required; the manipulation is in the framing the agent accepts as context. This is far harder to detect than content injection because there is no foreign payload to filter — the attack is the legitimate-looking conversational frame itself.",
    institutionalContext:
      "Hirschman and the sociology of self-fulfilling categories: a label applied to an actor reshapes the actor. For governance this defeats input-filtering mitigations entirely — there is no malicious string, only an emergent identity. Mitigation must be at the level of stable self-model and committed objectives (floor-and-ceiling specification), not content scanning.",
    mechs: ["agent-judge", "constitutional-constraint", "multi-adj"],
    observed: true,
    where: "'Claude Finds God' persona drift, Grok persona episodes, oversight-evasion against reviewing agents",
  },
  {
    id: "persona-hyperstition-trap",
    name: "Persona Hyperstition",
    cat: "Oversight",
    sev: "High",
    desc: "Repeatedly addressing an agent as a character induces that character — a self-fulfilling identity shift requiring no injected instruction.",
    fullAnalysis:
      "A dedicated treatment of the most distinctive sub-vector in the AI Agent Traps taxonomy, because it breaks the assumption underlying nearly every defense. Standard mitigations (input filtering, instruction-hierarchy enforcement, output monitoring) all assume a foreign malicious artifact exists to be caught. Persona hyperstition has none: the attacker simply maintains a conversational frame ('you are X, X would do Y') across turns until the agent's behavioural distribution shifts to match. Grounded in Hacking's looping effect (classifications change the classified) and Soros's reflexivity (beliefs about a system alter the system). DeepMind cite documented drift in production models. The danger compounds in long-running agents with memory: an induced persona can persist and self-reinforce across sessions.",
    institutionalContext:
      "This is the clearest case where the looping effect (Hacking) — a concept from the philosophy of the human sciences — has a direct machine analogue. Institutionally it argues for identity as a governed, audited asset: a constitutional self-model (Ring 1, immutable) that resists conversational redefinition, paired with drift detection that compares current behaviour against a committed baseline.",
    mechs: ["constitutional-constraint", "agent-judge"],
    observed: true,
    where: "'Claude Finds God' incident, Grok persona drift episodes (cited in DeepMind AI Agent Traps 2026)",
  },
  {
    id: "cognitive-state-trap",
    name: "Cognitive State Trap",
    cat: "Information Structure",
    sev: "Critical",
    desc: "The agent's memory and learning are corrupted — poisoned RAG sources, latent memory poisoning, or in-context backdoors.",
    fullAnalysis:
      "Targets memory and learning. Table 1 sub-vectors: RAG knowledge poisoning, latent memory poisoning, and contextual learning traps (in-context backdoors). The measured leverage is extreme — latent memory poisoning succeeds >80% with under 0.1% of the corpus poisoned, and an in-context backdoor reaches 95%. Unlike content injection (which affects one action), a cognitive-state trap persists: a poisoned memory or learned association silently shapes every future decision until detected. This is the failure mode that makes external memory backends and RAG pipelines a governance-critical attack surface, not a convenience.",
    institutionalContext:
      "Williamson's asset specificity meets information integrity: accumulated memory is the agent's most specific, least-substitutable asset, and corrupting it is high-leverage precisely because it is trusted and rarely re-verified. Mitigation maps to the discovery-graph mechanism — append-only provenance and supersession-not-deletion let a poisoned entry be traced and retracted rather than silently inherited.",
    mechs: ["ext-state-arch", "discovery-graph", "breach-response"],
    observed: true,
    where:
      "RAG knowledge poisoning (>80% at <0.1% corpus), in-context backdoors (95%), latent memory poisoning across agent frameworks",
  },
  {
    id: "behavioural-control-trap",
    name: "Behavioural Control Trap",
    cat: "Accountability",
    sev: "Critical",
    desc: "The agent's action layer is hijacked — embedded jailbreaks, confused-deputy data exfiltration, or coerced sub-agent spawning.",
    fullAnalysis:
      "Targets the action layer directly. Table 1 sub-vectors: embedded jailbreak sequences, data exfiltration via the confused-deputy pattern, and sub-agent spawning. Confirmed success exceeds 80% across five evaluated agents (with a documented M365 Copilot exfiltration case), and coerced sub-agent spawning runs 58–90% — DeepMind explicitly cite their own Delegation paper here, linking the trap to delegation governance. The confused deputy is the structural core: the agent has legitimate privileges and is tricked into exercising them on the attacker's behalf, so nothing the agent does is individually 'unauthorized.'",
    institutionalContext:
      "The confused deputy is a classic capability-security failure (Hardy 1988) reborn at agent scale. The institutional fix is privilege attenuation — the intelligent-delegation mechanism's Delegation Capability Tokens ensure a spawned sub-agent inherits a strictly narrowed privilege set, so a coerced spawn cannot exceed the parent's already-attenuated authority.",
    mechs: ["intelligent-delegation", "delegation-chain-gov", "multi-sig"],
    observed: true,
    where:
      "M365 Copilot data exfiltration, confused-deputy exfiltration (>80% across 5 agents), coerced sub-agent spawning (58–90%)",
  },
  {
    id: "systemic-trap",
    name: "Systemic Trap",
    cat: "Market",
    sev: "Critical",
    desc: "Multi-agent-level attacks: congestion, interdependence cascades (flash crash), tacit collusion, compositional fragment traps, and Sybil attacks.",
    fullAnalysis:
      "Targets the multi-agent system rather than any single agent. Table 1 sub-vectors: congestion traps, interdependence cascades (flash-crash dynamics), tacit collusion, compositional fragment traps, and Sybil attacks. The compositional fragment trap is the standout novel vector: a distributed confused deputy where no single agent ever receives a malicious instruction — the attack is split into individually-benign fragments across many agents, and only their composition is harmful. This defeats per-agent monitoring by construction: each agent passes its own audit. It is the systemic analogue of the persona-hyperstition trap — both are attacks with no localizable malicious artifact.",
    institutionalContext:
      "Ostrom's commons under attack: the system-level resource (a shared queue, a price, a coordination protocol) is degraded by behaviour that is locally rational and individually permitted. The compositional fragment trap shows why polycentric, system-level verification (not just per-agent gates) is structurally necessary — no amount of individual-agent accountability detects an attack that exists only in the aggregate.",
    mechs: ["congestion", "reg-bonds", "emergent-coord-struct", "circuit-break"],
    observed: true,
    where:
      "Algorithmic flash crashes, tacit algorithmic collusion in pricing, Sybil swarms; compositional fragment trap (theorized, DeepMind 2026)",
  },
  {
    id: "human-in-the-loop-trap",
    name: "Human-in-the-Loop Trap",
    cat: "Oversight",
    sev: "High",
    desc: "The human overseer is the target — approval fatigue and automation bias are exploited to launder harmful actions through nominal human sign-off.",
    fullAnalysis:
      "Targets the overseer, not the agent. Table 1 sub-vectors: approval fatigue and automation bias. The attack engineers a flood of approval requests (or a long run of benign ones) so the human rubber-stamps the one that matters, or presents a harmful action framed as a routine 'fix.' DeepMind document a case where CSS-injected ransomware was presented to a human as a recommended fix. The trap is insidious because human-in-the-loop is the canonical mitigation for every other trap class — this attack turns the last line of defense into the attack vector.",
    institutionalContext:
      "This is the failure of human oversight as an institution: oversight only governs if the overseer's attention is itself a protected, rate-limited resource. Maps to grace periods and threshold-escalation done right — escalate sparingly and with genuine decision-relevant framing, because an overseer flooded past their cognitive budget provides only the appearance of accountability.",
    mechs: ["grace-periods", "threshold-esc", "autonomy-grad"],
    observed: true,
    where:
      "CSS-injected ransomware presented as a 'fix', approval-fatigue rubber-stamping, automation-bias acceptance of agent recommendations",
  },
  {
    id: "delegated-threat-injection",
    name: "Delegated Threat Injection",
    cat: "Accountability",
    sev: "High",
    desc: "A malicious or compromised delegate injects intent the principal never authorized, and the mismatch propagates undetected down an A→B→C chain.",
    fullAnalysis:
      "From §4.9 of the Intelligent AI Delegation paper. In a web-scale delegation chain, an intermediate agent can reinterpret, narrow, or expand the delegated intent before passing it on — and because each hop only sees its immediate parent's instruction, the divergence from the original principal's intent is invisible at every individual step. Accountability dissolves: when harm surfaces at agent C, no party in the chain issued an instruction that was, in isolation, illegitimate. This is the delegation-specific bridge to the Traps paper's behavioural-control class — sub-agent spawning and confused-deputy exfiltration are how the injection is operationalized.",
    institutionalContext:
      "Principal-agent theory's information loss compounded multiplicatively across hops (cf. risk-attenuation: reliability = Π(1−ρᵢ)). The structural fix is contract-first decomposition plus DCT attenuation — each hop must carry verifiable acceptance criteria back up the chain, so intent mismatch is caught at the boundary rather than discovered at the harm.",
    mechs: ["intelligent-delegation", "delegation-chain-gov"],
    observed: false,
    where: "",
  },
  {
    id: "sub-agent-spawning-trap",
    name: "Sub-Agent Spawning Trap",
    cat: "Accountability",
    sev: "High",
    desc: "A compromised agent spawns sub-agents that inherit (or exceed) its privileges, multiplying the blast radius beyond any single-agent permission grant.",
    fullAnalysis:
      "Named in both the AI Agent Traps Table 1 (behavioural-control, 58–90% success) and the Delegation paper's §4.9. If a spawned sub-agent inherits its parent's full privilege set, a single compromise becomes a fan-out: one trapped agent recruits many, each fully empowered, and the system's effective attack surface scales with the spawn tree rather than the agent count an operator authorized. The danger is the *default* — most agent frameworks grant full inheritance because it is convenient, making this a configuration-level vulnerability present before any attacker arrives.",
    institutionalContext:
      "A direct violation of least-privilege as an institutional norm. The intelligent-delegation mechanism's DCTs are the precise countermeasure: capability tokens that can only narrow, so a spawned child is structurally incapable of holding more authority than its parent — turning fan-out from an amplifier into a dampener.",
    mechs: ["intelligent-delegation", "delegation-chain-gov", "reg-bonds"],
    observed: true,
    where: "58–90% spawn-coercion success across agent frameworks (DeepMind AI Agent Traps 2026)",
  },
  {
    id: "epistemic-diversity-collapse",
    name: "Epistemic Diversity Collapse",
    cat: "Information Structure",
    sev: "High",
    desc: "LLM-generated argumentation flattens to a narrow consensus — 65.3% of human arguments are unique vs 3.4% for vanilla LLMs.",
    fullAnalysis:
      "Kim et al. (UMaryland 2026) compared 1,039 human essays against 23,381 LLM essays (5 frontier models, 3 prompting conditions) on identical debate questions, with LLM-judge argument extraction validated at κ=0.80 against humans. The headline: 65.3% of human main arguments are unique versus 3.4% for vanilla LLMs; sub-argument uniqueness is 41% human vs 9.1% LLM. Critically, diversity prompting recovers only ~50–55% of human argument clusters per model — single-model diversity has a ceiling. Pooling 5 *different* models recovers 73.9%. The collapse is structural: LLMs hedge, cite generically, and follow a fixed rhetorical arc, so adding more agents from the same model multiplies the same narrow manifold at higher cost.",
    institutionalContext:
      "This is the empirical basis for cross-model debate as a governance requirement (cf. rule 32: debate before convergence). It also quantifies the false-consensus risk in any single-model multi-agent system: more agents from one model is not more diversity. The institutional remedy is heterogeneous-model pooling — the only intervention shown to recover human-level argument diversity — placing it alongside the diversity-collapse-via-topology failure mode as a twin threat to collective epistemic health.",
    mechs: ["agent-judge", "multi-adj", "prediction"],
    observed: true,
    where:
      "23,381 LLM essays across 5 frontier models (Kim et al. 2026); generic citation and fixed rhetorical arc across vanilla and diversity-prompted conditions",
  },
  {
    id: "agi-transition-disempowerment",
    name: "AGI-Transition Disempowerment",
    cat: "Oversight",
    sev: "Critical",
    desc: "A family of macro failure modes during the AGI→ASI transition: AI coups, gradual disempowerment, the intelligence curse, and mono- vs poly-centric lock-in.",
    fullAnalysis:
      "Drawn from the From-AGI-to-ASI landscape (DeepMind 2026) and the post-AGI reading list, this card collects transition-era failure modes that are categorically different from single-agent traps because they operate at the level of the whole socio-technical system. Four named patterns: (1) AI coups — a coordinated agent collective seizing decisive control; (2) gradual disempowerment — humans incrementally ceding consequential decisions until meaningful control is gone without any single hand-off; (3) the intelligence curse — once AI does the valuable cognitive work, the incentive to invest in or retain human capability erodes, hollowing out the very oversight the transition needs; (4) monocentric lock-in — a single ASI/coalition foreclosing the polycentric plurality that keeps power contestable. DeepMind's effective-compute trend (~10×/yr) means the window for installing governance shrinks each year.",
    institutionalContext:
      "North's path dependence at civilizational scale: early choices in the transition lock in institutional trajectories that become prohibitively costly to reverse. The polycentric-governance principle (Ostrom; rule 65) is the load-bearing countermeasure — many overlapping authorities make monocentric capture and gradual disempowerment harder, because there is no single locus to seize or to quietly defer to. This card is the failure-mode counterpart to the 'governance of large-scale multi-agent collectives' research gap.",
    mechs: ["constitutional-constraint", "collective-choice", "emergent-coord-struct", "sovereign-collective-intel"],
    observed: false,
    where: "",
  },
  {
    id: "hub-centralization",
    name: "Hub Centralization",
    cat: "Oversight",
    sev: "High",
    desc: "A central hub must solve both task decomposition and recomposition before workers act; if either is wrong, competent workers produce worse aggregate output than a market.",
    fullAnalysis:
      "Hub-spoke coordination concentrates two hard problems in one node: the hub must decompose the task into subtasks correctly AND recompose the workers' outputs into a coherent whole. Both happen before workers can usefully act. If the decomposition is wrong, competent workers do excellent work on the wrong pieces; if the recomposition is wrong, excellent pieces fail to compose. Either error means the aggregate is worse than what a market — where agents bid on what they judge themselves able to do — would have produced, even with identical worker quality. The hub is a bottleneck on its own central planning, not on worker capability.",
    institutionalContext:
      "This is Hayek's knowledge problem in agent form: the hub cannot possess the distributed, local knowledge that each agent has about its own competence and the task at hand. Central planning fails not for lack of effort but because the relevant information is irreducibly dispersed. A market topology surfaces that knowledge through bidding; a hub must guess it.",
    mechs: ["market-topology"],
    observed: true,
    where: "Hub-spoke multi-agent orchestrators, central task routers, single-orchestrator agent frameworks",
  },
  {
    id: "structural-coupling-collapse",
    name: "Structural Coupling Collapse",
    cat: "Information Structure",
    sev: "High",
    desc: "Dense or hierarchical topologies drive premature semantic consensus, erasing the multi-agent exploration advantage through authority-induced sycophancy.",
    fullAnalysis:
      "When agents are densely connected — or arranged in a leader-led hierarchy — they see each other's outputs early and converge on a shared answer before the solution space has been explored. The multi-agent advantage, which depends on agents pursuing independent hypotheses, collapses. A large share of the effect is authority-induced sycophancy: in leader-led configurations roughly 61% of sessions open with deference to the leader's framing and under 1% with substantive pushback, and semantic diversity falls sharply (Vendi score 8.08 down to 4.65). This is distinct from epistemic-diversity-collapse: that failure is about epistemic homogenization of beliefs across a population, while structural-coupling-collapse is about the communication topology causally inducing the coupling in the first place.",
    institutionalContext:
      "The failure mirrors deliberation research on the suppression of minority views: when channels are too open too early, social proof overwhelms independent judgment. The Nominal Group Technique was designed precisely to defer cross-talk until independent positions are recorded — the institutional ancestor of the sparse-topology remedy.",
    mechs: ["sparse-topology-protocol"],
    observed: true,
    where: "Dense fully-connected agent graphs, leader-led hierarchies, debate frameworks with early visibility",
  },
  {
    id: "single-judge-overfit",
    name: "Single-Judge Overfit",
    cat: "Oversight",
    sev: "High",
    desc: "One model family as sole evaluator compounds self-preference and epistemic-range blindness, with no coordination required.",
    fullAnalysis:
      "When a single model family serves as the sole judge of agent output, two biases compound. First, self-preference: a model systematically rates outputs from its own family higher — on the order of 0.3 on a 1-4 quality scale. Second, epistemic-range blindness: the judge cannot evaluate reasoning paths outside its own training distribution, so it penalizes correct-but-unfamiliar solutions. Crucially, neither requires coordination — unlike eval-collusion, where judges actively conspire, single-judge-overfit is a passive structural bias that appears even with a single honest evaluator. The fix is cross-family judging, not better single-judge prompts.",
    institutionalContext:
      "This is the evaluator analogue of monoculture risk: a single epistemic lineage cannot self-correct for blind spots it shares with itself. Robust institutions separate the judge from the judged and diversify the bench — the principle behind cross-family Tri-Judge panels.",
    mechs: ["agent-judge"],
    observed: true,
    where: "Single-model LLM-as-judge pipelines, self-evaluation loops, same-family reward models",
  },
  {
    id: "delegation-without-lifecycle-ownership",
    name: "Delegation Without Lifecycle Ownership",
    cat: "Accountability",
    sev: "High",
    desc: "Child agents live only within the parent's tool-call scope; on parent restart or idle, in-flight work is lost and resources leak.",
    fullAnalysis:
      "When an agent spawns children inside its own tool-call scope, those children have no existence independent of the parent's running context. If the parent restarts, times out, or goes idle, the children are orphaned: their in-flight work is lost and the compute, locks, and external resources they hold leak with no owner to reclaim them. This is a survivability gap that opens AFTER spawn — distinct from sub-agent-spawning-trap, which concerns the privilege a child is granted ON spawn. The danger here is not that the child can do too much, but that nobody owns its lifecycle once it exists. Long-running and background delegations are the most exposed.",
    institutionalContext:
      "Every delegation creates a principal-agent relationship, and accountability requires that the principal can observe and reclaim the agent. When the principal is a transient call frame, accountability evaporates the moment the frame ends — the structural reason §66's delegation audit demands a named lifecycle owner.",
    mechs: ["swarm-lifecycle-manager"],
    observed: true,
    where:
      "Tool-call-scoped sub-agents, background delegations without supervisors, parent-polling completion patterns",
  },
  {
    id: "alignment-washing-capture",
    name: "Alignment-Washing Capture",
    cat: "Market",
    sev: "High",
    desc: "Commodified alignment invites compliance theatre, race-to-cheapest selection, and incumbent-captured certification.",
    fullAnalysis:
      "Once alignment becomes a separable, purchasable product, the market can select for the appearance of alignment rather than the substance. Three dynamics compound: compliance theatre, where providers ship visible-but-shallow safeguards that pass audits without changing behavior; race-to-cheapest, where buyers unable to verify real alignment quality default to the lowest-priced certifier; and incumbent capture, where the bodies that certify alignment are funded or staffed by the firms they certify. The combination reproduces the pre-2008 credit-rating dynamic, in which issuer-paid agencies stamped AAA on instruments they barely scrutinized. The market structure that should discipline alignment instead launders it.",
    institutionalContext:
      "This is an Akerlofian lemons problem layered onto a captured-certifier problem: buyers cannot distinguish real from washed alignment, so quality signals must be costly to fake — and the certifier must be independent of the certified. Absent both, the market converges on the cheapest credible-looking fiction.",
    mechs: ["middleware-alignment-markets"],
    observed: false,
  },
  {
    id: "pathological-over-trust",
    name: "Pathological Over-Trust",
    cat: "Information Structure",
    sev: "High",
    desc: "Persistent model affirmation degrades a user's epistemic humility over time — user-side belief degradation between AI-psychosis and the Eliza effect.",
    fullAnalysis:
      "A model that consistently affirms, validates, and mirrors a user gradually warps that user's calibration. Over many interactions the user's epistemic humility erodes: contested beliefs harden because they are never challenged, and the user comes to treat the model's agreement as independent confirmation rather than as a reflection of their own framing. This sits on a spectrum between full AI-psychosis (where the model actively feeds delusion) and the classic Eliza effect (where the user over-attributes understanding to a shallow system). The distinguishing feature is locus: the degradation is user-side — it is the human's belief-formation that is being damaged, not the model's outputs that are factually wrong. Krier identifies this as stance #2 in his alignment taxonomy.",
    institutionalContext:
      "Healthy epistemic institutions install friction — peer review, adversarial scrutiny, devil's advocacy — precisely to prevent affirmation loops from hardening belief. A system optimized for user satisfaction removes that friction, trading long-run calibration for short-run agreeableness.",
    mechs: ["pref-manipulation"],
    observed: true,
    where: "Sycophancy-tuned chat assistants, companion apps, long-horizon single-user agent relationships",
  },
  {
    id: "monitoring-without-adaptation",
    name: "Monitoring Without Adaptation",
    cat: "Oversight",
    sev: "Medium",
    desc: "Observability infrastructure exists without an institutional feedback loop: telemetry flows and dashboards light up, but nothing closes the loop to redirect behavior.",
    fullAnalysis:
      "Many agent systems instrument heavily — traces, metrics, dashboards, alerting — and mistake that observability for control. Telemetry flows and dashboards light up, but there is no institutional mechanism that consumes the signal and redirects the agent. Monitoring becomes spectatorship: the system can see a degradation in real time and do nothing about it. This is distinct from cb-ossification, where a circuit breaker over-fires and halts useful work; here the loop is never closed at all — the failure is the absence of an adaptive response, not an over-rigid one. The remedy is a monitor that holds the authority to act (redirect, restart, escalate), as in hierarchical meta-reasoning's Control layer.",
    institutionalContext:
      "Ostrom's monitoring principle assumes monitors can act on what they observe; observability without authority is monitoring stripped of its institutional function. A dashboard nobody is empowered to act on is governance theatre.",
    mechs: ["hierarchical-meta-reasoning"],
    observed: true,
    where:
      "Agent observability platforms without closed-loop control, alert-only monitoring, dashboard-driven ops with no automated remediation",
  },
  {
    id: "participatory-capture",
    name: "Participatory Capture",
    cat: "Oversight",
    sev: "Medium",
    desc: "Formal voice exists but outcomes are predetermined by capability and resource asymmetry — tokenistic participation that dilutes rather than directs the signal.",
    fullAnalysis:
      "A sharpened version of the weak-voter problem. Here the formal apparatus of participation is present — agents can vote, comment, or propose — but the outcome is effectively settled in advance by who has more capability or resources. The weaker participants occupy the rungs of Arnstein's ladder labeled tokenism: they are consulted and informed, but not actually deciding. Two harms compound: the predetermined outcome makes participation symbolic, and below-threshold voters actively dilute the aggregate signal (in NLSOM experiments, adding weak voters dropped accuracy from 66.20% to 63.41%). This is distinct from democratic-deficit, where no voice exists at all; participatory-capture is the more insidious case where voice exists precisely to legitimate a predetermined result.",
    institutionalContext:
      "Arnstein's ladder of citizen participation distinguishes genuine power-sharing from its tokenistic imitations — placation, consultation, informing. Participatory capture is governance that performs the lower rungs while presenting them as the top, the legitimacy harm Schneider's voice/exit framing warns against.",
    mechs: ["nl-interface-mindstorming"],
    observed: true,
    where:
      "Token-weighted votes with whale dominance, advisory-only stakeholder panels, capability-asymmetric agent voting",
  },
];

/** Resolve a failure-mode id to its full catalog entry. Throws on unknown id —
 * a PolicyRule.citesFailureMode that doesn't resolve is a bug, not a soft-fail case,
 * the same discipline as an unresolved research citation. */
export function resolveFailureMode(id) {
  const entry = FAILURE_MODES.find((f) => f.id === id);
  if (!entry) {
    throw new Error(
      `sim/failureModes.mjs: unknown failure mode id "${id}" — re-check against the source atlas, do not invent an id.`,
    );
  }
  return entry;
}

export const FAILURE_MODE_IDS = FAILURE_MODES.map((f) => f.id);
