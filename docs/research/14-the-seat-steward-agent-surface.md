# 14 — The seat: how farmers launch agents (and why we're more opinionated than Bankr)

Written 2026-07-03. Completes the thesis line of docs 12 (REA/swarm-DSS) and 13 (privacy):
what surface do farmers and coops actually touch, and what do they get when they touch it?
Bankr (bankr.bot, fetched 2026-07-03) is the point of analysis Pat named; MyLugano (doc 12
§6) and Moltbook (atlas/CLAUDE.md lessons) are the supporting precedents.

## 1. The answer in one line

**Users don't launch agents — they take a seat, and the seat comes with a steward agent.**
The farmer-facing object is the intent (the REA Commitment we already typed), not an agent
configuration. The swarm already exists; nobody configures it. What a seat adds is a
representative: one agent, bound to one coop/producer identity, with a fixed verb set,
holding the user's private data, speaking to the swarm in commitments and proofs.

## 2. What Bankr gets right (adopt) and wrong for us (reject)

Bankr's opinionation, verified from their own surface:
- **Few verbs** — buy/sell/swap/limit orders/launch. No prompt boxes, no agent builder.
- **Custody abstracted** — the agent gets an API key with IP whitelisting and granular
  permissions; "no private keys exposed"; "built-in guardrails execute transactions
  accurately." Guardrails are the product, not a setting.
- **Natural language in, one legible thing out** — a message in, a transaction out.
- **Self-funding** — trading fees route back to pay the agent's own inference.

Adopt: all four shapes. A coop's steward gets scoped capability (attenuated permissions —
the same §35 discipline our own sub-agents run under), plain-language-or-form input, and
one legible output object (the ask card). Roadmap-adopt the self-funding shape in its
honest form: a basis-point fee **on settled intents** (fee-on-outcome) covering the
steward's inference — never fee-on-activity.

Reject: **the token flywheel.** "Launch a token, earn 57% of trade fees" is exactly the
financialization the RFP warns about — the tool becoming the new middleman, extracting the
same rent through a different instrument. Our financing object is the typed Claim at a
stated rate and term (doc 12 §3), not a tradable meme. Also reject the open agent
playground: Moltbook's documented lesson is that 770k launched agents produced activity,
not coordination (93% of posts got zero replies). One steward per seat, five verbs,
reliable, beats a thousand configurable agents.

## 3. The verb set (the whole opinionated surface)

1. **Post an intent** — sell-this-lot / finance-this-planting / source-inputs. Source-inputs
   is not a new primitive: it is a finance intent whose `inputResource` is what you need
   (seedlings, solar equipment) — the REA typing already covers it.
2. **Set the floor** — reserve price / minimum terms. Private to the steward (doc 13:
   competitively sensitive; sealed-bid roadmap is where it eventually lives).
3. **Accept or decline a fill** — the swarm's matches arrive as named terms (rate, term,
   buyer, route cost lines), Kiva-template rendered, decomposed fields, never one opaque score.
4. **Confirm settle** — the human hold-point. The steward negotiates; it never settles.
   This is the swarm-DSS category enforced at the surface: people and institutions make the
   allocation call, settlement is the action taken. It is also the liability firebreak —
   an agent that can spend the harvest's proceeds without a human confirmation is a
   product we refuse to build (and FABLE-KICKOFF's working rule already draws this line:
   real keys and real money stay with the human).
5. **Set disclosure tiers** — what evidence the steward may share outward (doc 13 made
   policy: status and attestations flow; plot geometry and full names never do). The
   steward is the custody boundary: it sees your polygon, your credit history, your
   reserve; the swarm sees commitments, statuses, proofs.

Nothing else. No prompts, no model pickers, no agent marketplace.

## 4. Channels, in adoption order

1. **The coop seat (exists — `AqueductCoopSeat.tsx`)** — coops/exporters are the realistic
   first operators: they aggregate farmers already (EthicHub's own structure), run the
   EUDR paperwork, and have the device and the literacy. The seat grows the verb set above.
2. **Messaging-grade channel (TO-BUILD, honestly labeled)** — WhatsApp/SMS is the
   farmer's real device. This is where the RFP's photo story enters: send a photo of the
   harvest → the steward drafts the lot record and the ask card → the farmer approves with
   a reply. Same verbs, thinner pipe. (Grade-from-photo itself stays TO-BUILD-badged.)
3. **ERP path (named in Q5)** — for platforms/coops with systems, the steward reads and
   writes through the ERP connector rather than a chat surface.

## 5. Why this completes the thesis

Doc 12 named the category: a swarm decision-support system — agents aggregate/verify/
price/match, people decide, settlement is the action. Doc 13 named the coordination
substrate: private inputs, verifiable outcomes. This doc names the missing subject: **whose
agent is it?** The steward is the farmer's side of the swarm — the first agent in the
system whose loyalty is structurally to the producer (it holds their data, works their
intents, and cannot act past them). That is the product answer to the RFP's warning about
tools becoming the new middleman: the middleman's judgment is automated, but it is
automated *in the producer's hands*, seat by seat.

## 6. Build path (labeled)

- **Demo-now (SIM, one surface):** "Post an intent" on the coop seat — a small form
  (commodity, quantity, ask-or-finance, floor) that creates a SIM intent the existing
  swarm visibly works: it appears in the rail, the solver race picks it up, fills arrive
  as ask-card lines, with a confirm-settle button that stops at the honest boundary
  (prepared payload, human key). Everything already exists except the form and the
  append path — the sim's intents are static today.
- **Next:** steward memory per seat (floors, disclosure tiers), fill notifications.
- **TO-BUILD:** messaging channel, agent-wallet custody (Bankr-style scoped keys),
  fee-on-settle sustainability, sealed-bid floors (doc 13 §3 timeline).
