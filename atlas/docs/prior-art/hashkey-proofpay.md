# ProofPay — Extracted Patterns (HashKey Chain Hackathon, Apr 2026)

Oracle-conditioned payment middleware. Top 7 finalist, no prize. Archived.

## Reusable Patterns

### 1. Parallel Oracle Fan-Out

Four independent oracle feeds evaluated in parallel, results merged by a rule engine:
- Gas oracle (block.basefee)
- Reputation oracle (prior payment count / loyalty)
- Time oracle (client local hour)
- Jurisdiction oracle (geofence)

**Pattern:** Each oracle is a pure function `(context) → { value, metadata }`. Rule engine applies merchant-defined conditions (`operator + threshold`) against oracle values. Best-discount or stack-all strategy selectable per merchant.

**Applicable to Ecospatial:** Valuation engine could fan-out to multiple pricing sources (SCC-EPA, TEEB, market) in parallel, then merge via configurable strategy.

### 2. TEE Location Verification (Astral Protocol)

GPS coordinates → signed location stamp → TEE verification → EAS attestation.

- Astral Protocol provides TEE-based location proofs
- Honest about TEE limitations in docs (not bulletproof, but verifiable)
- Demo mode fallback for GPS-less environments (dropdown selector)

**Applicable to Ecospatial:** Bioregional vaults need geo-verification for asset provenance. Astral is a ready-made solution — no need to build custom location proofs.

### 3. Onchain Attestation (EAS Pattern)

Every computed result attested onchain with full computation trail:
- Input coordinates + TEE hash
- All oracle conditions evaluated (operator, threshold, actual value, pass/fail)
- Final price + discount breakdown
- Timestamp + merchant identity

**Contract pattern:** `createProof(bytes32 paymentId, ProofData data)` stores struct, `getProof(bytes32)` returns decoded fields for explorer/UI consumption.

**Applicable to Ecospatial:** Filecoin provenance layer already stores asset metadata. Adding EAS attestations for valuation computations (which inputs → which model → which output) gives the same "every price is provable" property.

## Technical Gotchas

- HSP (HashKey Settlement Protocol) rejects redirect URLs over ~1000 chars — don't encode payload data in redirect params
- Jurisdiction threshold `0` must be treated as wildcard "match any", not equality check
- Blockscout shows raw hex for storage — need a dedicated view function + frontend decoder for human-readable proofs
- `localStorage` is unreliable across HSP payment redirects (cross-tab); URL params survive

## References

- Astral Protocol: TEE location proofs + EAS attestations
- ERC-8004: Agent identity (used for merchant registration)
- x402: HTTP 402 payment protocol (HSP uses under the hood)
- ERC-8194 (Draft): Payment Gated Transaction Relay
- ERC-8195 (Draft): Task Market Protocol
