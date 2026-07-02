# Hedera Mirror Node Token Analysis: GCR, TYMLEZ, Atma.io, iREC

Deep dive into metadata patterns for parser construction.
Mirror Node API: `https://mainnet-public.mirrornode.hedera.com/api/v1`

---

## 1. GCR (Gold Standard Carbon Registry)

**Treasury:** `0.0.3843565`
**Platform:** Guardian-based policy engine for Gold Standard TPDDTEC methodology

### Token Inventory (5 tokens, excluding USDC)

| token_id | name | symbol | type | total_supply | memo | created |
|----------|------|--------|------|-------------|------|---------|
| 0.0.4546233 | GCR - GS TPDDTEC v3.1 | GCR-GSTPDDTEC | NON_FUNGIBLE_UNIQUE | 10 | 0.0.4546232 | 2024-01-24 |
| 0.0.5488525 | GCR - GS TPDDTEC | GCR-GSTPDDTEC | NON_FUNGIBLE_UNIQUE | 6 | 0.0.5488522 | 2024-04-17 |
| 0.0.5745425 | GCR - GS TPDDTEC v3.1.0 - Westcom POC | GCR-GSTPDDTECv3.1.0(WestcomPOC) | NON_FUNGIBLE_UNIQUE | 0 | 0.0.5745422 | 2024-05-07 |
| 0.0.5945737 | GCR - GS TPDDTEC v3.1.0 - Safe Water Project(Rwanda) | GCR-GSTPDDTECv3.1.0 (SafeWaterProject-Rwanda) | NON_FUNGIBLE_UNIQUE | 100 | 0.0.5945736 | 2024-05-17 |
| 0.0.6260121 | GCR - GS TPDDTEC v3.1.0 | GCR-GSTPDDTECv3.1.0 | NON_FUNGIBLE_UNIQUE | 2 | 0.0.6260119 | 2024-06-24 |

### Token Detail: 0.0.4546233 (full key set)

```json
{
  "admin_key": "ED25519:6f0816c08337d97ba2f45e58049912c826a9285be993897e1507be8b411a80ed",
  "freeze_key": "ED25519:76428e6ec3d711e6aa3bf877e11302dd82b64a3c643124951b01eeed2a321438",
  "supply_key": "ED25519:f764b9c019814d8f507dc78e18d0b02c4098ea6dfe7c0935031cae0d799395bf",
  "wipe_key": "ED25519:4e090e066cbe866c13882d36506fad3aed3606f88db1473d90ee5cf3aa2c6bd2",
  "kyc_key": null,
  "fee_schedule_key": null,
  "pause_key": null,
  "metadata_key": null,
  "supply_type": "INFINITE",
  "max_supply": "0",
  "freeze_default": false,
  "custom_fees": { "fixed_fees": [], "royalty_fees": [] }
}
```

### GCR Key Pattern
- All tokens: admin_key, freeze_key, supply_key, wipe_key present (all ED25519, all DIFFERENT keys per token)
- No kyc_key, no pause_key, no fee_schedule_key, no metadata_key
- All NFTs (NON_FUNGIBLE_UNIQUE), decimals=0
- supply_type=INFINITE, max_supply=0
- metadata field on token: empty string ""

### GCR Memo Pattern
**CRITICAL:** The `memo` field contains a Hedera account/topic ID that is exactly `token_id - 1` (or close):
- Token 0.0.4546233 → memo "0.0.4546232"
- Token 0.0.5488525 → memo "0.0.5488522"
- Token 0.0.5745425 → memo "0.0.5745422"
- Token 0.0.5945737 → memo "0.0.5945736"
- Token 0.0.6260121 → memo "0.0.6260119"

These memo IDs reference **Guardian policy topic parent IDs**. The actual VP/VC message topics are at memo_id + 2 (approximately):
- Token 0.0.5945737 (memo 0.0.5945736) → policy messages on topic 0.0.5945738

### GCR NFT Serial Metadata (base64-decoded)

All NFT serial metadata decode to **Hedera consensus timestamps**:

| token_id | serial | metadata (decoded) | meaning |
|----------|--------|-------------------|---------|
| 0.0.4546233 | 9,10 | 1706080285.239603003 | References CONSENSUSSUBMITMESSAGE tx |
| 0.0.5488525 | 5 | 1713539781.794602003 | Same pattern |
| 0.0.5488525 | 6 | 1719059716.776171003 | Same pattern |
| 0.0.5945737 | 99,100 | 1715910478.254160003 | Same pattern (batch-minted, same timestamp for all serials in batch) |
| 0.0.6260121 | 1,2 | 1719219726.005265003 | Same pattern |

**All metadata timestamps reference "VP creation message" transactions** (CONSENSUSSUBMITMESSAGE with memo "VP creation message").
The entity_id in those transactions points to the topic where the VP document was published.

### GCR Guardian Message Flow (topic 0.0.5945738 example)

```
Seq 1: type=Topic, action=create-topic
       name="GCR - GS TPDDTEC v3.1.0 - Safe Water Project"
       description="This is the policy for GS TPDDTEC v3.1 on GCR"
       messageType=INSTANCE_POLICY_TOPIC
       parentId="0.0.5945614"
       owner=did:hedera:mainnet:2nR22VyUm3JmX5ik2Xt7iSfPDchgPEKh86SfGpUze4NP_0.0.5484219

Seq 2: type=Role-Document, action=create-vc-document
       role=PROJECT_DEVELOPER, group=PROJECT_DEVELOPER
       cid=bafkreialyhxduaxe7fcndtsiaodyapqvncbbhmzo6cwzb5rqbjusuutzp4
       issuer=did:hedera:mainnet:7mPmqS7VZwNNZY3FDu6DVhL2nsx2HHpCrS96xbHgkHwy_0.0.5484219

Seq 3: type=VC-Document, action=create-vc-document
       documentStatus=NEW
       cid=bafkreid64gd2ldmfyx44kswbv5w46h4fzcwmymcjd373vmvgcjwuvkcyh4
       relationships=[seq2_timestamp]

Seq 4: type=Role-Document, role=VVB, group=VVB
       cid=bafkreifstyjauk3uijkzkep4ib6jqct6bizwlorzn7u2la7td2wgm2pgsi

Seq 5: type=VC-Document, documentStatus=NEW
       relationships=[seq4_timestamp]

Seq 6: type=VC-Document, documentStatus=NEW (project details)
       relationships=[seq3_timestamp, seq2_timestamp]

Seq 7: type=VC-Document, documentStatus=NEW (credit issuance)
       relationships=[seq6_timestamp, seq2_timestamp]
```

### GCR IPFS VC Example (bafkreid64gd2ldmfyx44kswbv5w46h4fzcwmymcjd373vmvgcjwuvkcyh4)

```json
{
  "id": "urn:uuid:34e1026e-52d5-4f72-87d0-cfe7a8dba37f",
  "type": ["VerifiableCredential"],
  "issuer": "did:hedera:mainnet:7mPmqS7VZwNNZY3FDu6DVhL2nsx2HHpCrS96xbHgkHwy_0.0.5484219",
  "issuanceDate": "2024-05-17T00:46:46.707Z",
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "ipfs://bafkreictbw6w4snymvr24jvjfu7s2rgciamijcyxmppq3ooq7bvbs6mjgu"
  ],
  "credentialSubject": [
    {
      "name": "Guangzhou Iceberg Environmental Consulting Services Co., Ltd",
      "contactPerson": "Ji Bao",
      "email": "baoji@icebergchina.com",
      "country": "China",
      "website": "http://icebergchina.com/en/index.html",
      "address": "No.106 Fengze East Road, Nansha District, Guangzhou, China",
      "title": "General Manager",
      "account": "0.0.5742517",
      "policyId": "66469848310374f31fa73c69",
      "type": "6b7ba3f8-3b56-406b-a2bf-ae0b41fc04eb&1.0.0"
    }
  ],
  "proof": {
    "type": "Ed25519Signature2018",
    "verificationMethod": "did:hedera:mainnet:...#did-root-key",
    "proofPurpose": "assertionMethod",
    "jws": "eyJhbGciOiJFZERTQSIs..."
  }
}
```

### GCR Name/Symbol Parsing Pattern

```
name format: "GCR - GS TPDDTEC [version] [- Project Name]"
  prefix: "GCR"
  methodology: "GS TPDDTEC" (Gold Standard Technologies and Practices to Displace Decentralized Thermal Energy Consumption)
  version: "v3.1" or "v3.1.0"
  project: optional suffix after " - " (e.g., "Westcom POC", "Safe Water Project(Rwanda)")

symbol format: "GCR-GSTPDDTEC[version][ (ProjectName)]"
  compressed, parenthetical project names
```

---

## 2. TYMLEZ (Carbon Emissions Measurement)

**Treasury:** `0.0.1810743`
**Platform:** Custom Guardian implementation for GHG Protocol Corporate Standard

### Token Inventory (4 tokens)

| token_id | name | symbol | type | total_supply | decimals | memo | created |
|----------|------|--------|------|-------------|----------|------|---------|
| 0.0.1810776 | TYMLEZ - Carbon Emissions Measurement - GHG Corporate Standard (CET) | TYM_CET | FUNGIBLE_COMMON | 3700 | 2 | "" | 2023-02-03 |
| 0.0.1810779 | TYMLEZ - Carbon Reduction Measurement - GHG Corporate Standard (CRU) | TYM_CRU | NON_FUNGIBLE_UNIQUE | 0 | 0 | "" | 2023-02-03 |
| 0.0.1810781 | TYMLEZ - Guarantee Of Origin | TYM_GOO | NON_FUNGIBLE_UNIQUE | 0 | 0 | "" | 2023-02-03 |
| 0.0.1810795 | TYMLEZ - Renewable Energy Certificate | TYM_REC | NON_FUNGIBLE_UNIQUE | 0 | 0 | "" | 2023-02-03 |

### Token Detail: 0.0.1810776 (CET - the only token with supply)

```json
{
  "admin_key": "ED25519:2811be8074c8defc99dc39eb59bf21d01b3059ecd5901321ec49f5d6cb51e0bf",
  "freeze_key": "ED25519:fee57299e7eb6972ef0bf9f5b1f78056170ec73ac48c72e22e218d4eb6799a76",
  "kyc_key": "ED25519:769b3a7f89070e7cc35cffbc43dd7cf8885e4418db61949dd471472d51c2f12d",
  "supply_key": "ED25519:602025cbc979d8f5126c3077c40e82e3a901f4080a911bde456ba1e9e6c09126",
  "wipe_key": "ED25519:6327172bc2a5e8daeccf3e3ae330d407314f4d6b9d8328f189aca183a9c1f8b5",
  "fee_schedule_key": null,
  "pause_key": null,
  "metadata_key": null,
  "supply_type": "INFINITE",
  "max_supply": "0",
  "freeze_default": false,
  "custom_fees": { "fixed_fees": [], "fractional_fees": [] }
}
```

### TYMLEZ Key Pattern
- ALL tokens have: admin_key, freeze_key, kyc_key, supply_key, wipe_key (all ED25519, all DIFFERENT keys per token, DIFFERENT keys between tokens)
- **kyc_key is PRESENT** (unlike GCR) — KYC enforcement on all TYMLEZ tokens
- No pause_key, no fee_schedule_key, no metadata_key

### TYMLEZ Supply Analysis

**CET (0.0.1810776): total_supply=3700, decimals=2**
- This means 37.00 units displayed. The "37 tCO2e" figure is literally `total_supply / 10^decimals = 3700/100 = 37.00 tCO2e`
- **Carbon quantity is encoded in the fungible token supply with 2 decimal places**

**CRU, GOO, REC: total_supply=0** — tokens were created but never minted to. Likely placeholder/demo.

### TYMLEZ Memo Pattern
**All memos are empty strings.** No topic references. TYMLEZ does not use the Guardian topic-based VC chain for its tokens (or it uses a separate discovery mechanism).

### TYMLEZ Name/Symbol Parsing Pattern

```
name format: "TYMLEZ - [Category] [- Standard] ([Abbreviation])"
  prefix: "TYMLEZ"
  categories: "Carbon Emissions Measurement", "Carbon Reduction Measurement", "Guarantee Of Origin", "Renewable Energy Certificate"
  standard: "GHG Corporate Standard" (when applicable)
  abbreviation: in parentheses — CET, CRU

symbol format: "TYM_[ABBREV]"
  TYM_CET = Carbon Emission Token
  TYM_CRU = Carbon Reduction Unit
  TYM_GOO = Guarantee Of Origin
  TYM_REC = Renewable Energy Certificate
```

### TYMLEZ Distinguishing Features
- Mix of FUNGIBLE_COMMON (CET) and NON_FUNGIBLE_UNIQUE (CRU, GOO, REC)
- Carbon quantity stored in fungible supply field (decimals=2)
- KYC enforcement on all tokens
- Empty memos (no Guardian topic backreference)
- All 4 tokens created in same second (batch deployment)

---

## 3. Atma.io (Supply Chain Carbon Tracking)

**Treasury:** `0.0.1682833`
**Platform:** Guardian-based GHGP (Greenhouse Gas Protocol) implementation

### Token Inventory (6 tokens = 3 pairs)

| token_id | name | symbol | type | total_supply | decimals | memo | created |
|----------|------|--------|------|-------------|----------|------|---------|
| 0.0.1689169 | ProductToken | P | NON_FUNGIBLE_UNIQUE | 1 | 0 | "" | 2023-01-12 |
| 0.0.1689170 | AtmaCarbonEmissionToken | c | FUNGIBLE_COMMON | 162417786 | 2 | "" | 2023-01-12 |
| 0.0.1690197 | ProductToken | P | NON_FUNGIBLE_UNIQUE | 1 | 0 | "" | 2023-01-12 |
| 0.0.1690198 | AtmaCarbonEmissionToken | c | FUNGIBLE_COMMON | 0 | 2 | "" | 2023-01-12 |
| 0.0.1690398 | ProductToken | P | NON_FUNGIBLE_UNIQUE | 1 | 0 | "" | 2023-01-12 |
| 0.0.1690399 | AtmaCarbonEmissionToken | c | FUNGIBLE_COMMON | 0 | 2 | "" | 2023-01-12 |

### Token Detail: 0.0.1689170 (AtmaCarbonEmissionToken with 162M supply)

```json
{
  "admin_key": "ED25519:eec388aca2d26c5c9ad98be479e99aef74adac28315bc57effdec41cb26c5ad8",
  "freeze_key": "ED25519:eec388aca2d26c5c9ad98be479e99aef74adac28315bc57effdec41cb26c5ad8",
  "kyc_key": "ED25519:eec388aca2d26c5c9ad98be479e99aef74adac28315bc57effdec41cb26c5ad8",
  "supply_key": "ED25519:eec388aca2d26c5c9ad98be479e99aef74adac28315bc57effdec41cb26c5ad8",
  "wipe_key": "ED25519:eec388aca2d26c5c9ad98be479e99aef74adac28315bc57effdec41cb26c5ad8",
  "fee_schedule_key": null,
  "pause_key": null,
  "metadata_key": null,
  "supply_type": "INFINITE",
  "max_supply": "0",
  "freeze_default": false,
  "custom_fees": { "fixed_fees": [], "fractional_fees": [] }
}
```

### Atma.io Key Pattern
- **ALL keys are the SAME ED25519 key** (`eec388aca2d26c5c9ad98be479e99aef74adac28315bc57effdec41cb26c5ad8`)
- This single key is reused for admin, freeze, kyc (on fungible only), supply, wipe across ALL 6 tokens
- KYC key present on fungible tokens (AtmaCarbonEmissionToken) but NOT on NFTs (ProductToken)

### Atma.io Supply Analysis

**AtmaCarbonEmissionToken 0.0.1689170: total_supply=162,417,786, decimals=2**
- This is `162,417,786 / 100 = 1,624,177.86 tCO2e` — approximately **1.6M tCO2e**
- **The "1.6M tCO2e" figure comes from `total_supply / 10^decimals` on the primary fungible token**

**Other pairs: total_supply=0** — The second and third ProductToken/CarbonEmission pairs have no supply. Only the first pair (0.0.1689169/0.0.1689170) was actively used.

### Atma.io Token Pair Pattern
**Each deployment creates a PAIR of tokens:**
1. **ProductToken** (NFT, symbol "P") — represents the supply chain product being tracked
2. **AtmaCarbonEmissionToken** (Fungible, symbol "c", decimals=2) — quantifies carbon emissions for that product

The pairs are created ~10 seconds apart with consecutive token_ids:
- Pair 1: 0.0.1689169 (P) + 0.0.1689170 (c) — ACTIVE
- Pair 2: 0.0.1690197 (P) + 0.0.1690198 (c) — empty
- Pair 3: 0.0.1690398 (P) + 0.0.1690399 (c) — empty

### Atma.io NFT Metadata

ProductToken serial metadata is also a consensus timestamp:
- 0.0.1689169 serial 1: `1673514341.829298003` → VP creation message transaction

### Atma.io Guardian Message Flow (topic 0.0.1689289)

```
Seq 1: type=Topic, action=create-topic
       name="GHGP"
       owner=did:hedera:mainnet:4nuW7JFitt1h6TQXcTiRsoxjfCwa6VNaYaSsJNJvkKRF_0.0.1689144
       messageType=DYNAMIC_TOPIC (different from GCR's INSTANCE_POLICY_TOPIC)
       parentId="0.0.1689203"

Seq 2: type=VC-Document, documentStatus=NEW
       cid=bafkreihnc6fp7vwzqqp2bkcecnbxt5b34jmhm5yp6a6ghd5xkc4dcsyile

Seq 4: type=VC-Document, documentStatus=NEW (project submission)
       cid=bafkreifuy5w442jxhyhgdixj6losjfzyefekkcbvemaofq77keg3lidgzm

Seq 5: type=VC-Document (approval/verification)
       cid=bafkreiaq3egonbztusoyumg6dhe2bs4gdsrezrdnytfd3jogshzt73xbhq

Seq 6: type=VP-Document, action=create-vp-document  ← MINT EVENT
       issuer=null
       relationships=["1673514316.163150442", "1673514332.442917716"]
       cid=bafkreic5na7lq3ltgq6pwu3xsd6s7lhwinnccsexyehdgvjns5vsrhmz5y
       → This VP triggers NFT mint + fungible supply mint
```

### Atma.io Memo Pattern
**All memos empty.** Topic discovery requires knowing the parent topic ID from the account's Guardian setup.

---

## 4. iREC (International Renewable Energy Certificates)

**No single treasury.** Multiple Guardian instances mint iREC tokens.

### Token Discovery

Search `?name=iREC` returns 3 actual iRec tokens (others are unrelated):

| token_id | name | symbol | type | total_supply | memo | treasury | created |
|----------|------|--------|------|-------------|------|----------|---------|
| 0.0.1302948 | iRec Token | iRec | NON_FUNGIBLE_UNIQUE | 30 | "" | 0.0.1285914 | 2022-09-28 |
| 0.0.2126678 | iRec Token | iRec | NON_FUNGIBLE_UNIQUE | 0 | "" | 0.0.1740410 | 2023-04-03 |
| 0.0.3951579 | iRec Token | iRec | NON_FUNGIBLE_UNIQUE | 10 | 0.0.3951578 | 0.0.3951572 | 2023-11-10 |

### Token Detail: 0.0.1302948 (first iREC instance, 30 NFTs)

```json
{
  "admin_key": "ED25519:96dd1f959d1b1f40d77b8c96c01abb5bd328e74bc44249c1cb3f0b16caf6d17c",
  "freeze_key": "ED25519:96dd1f959d1b1f40d77b8c96c01abb5bd328e74bc44249c1cb3f0b16caf6d17c",
  "kyc_key": "ED25519:96dd1f959d1b1f40d77b8c96c01abb5bd328e74bc44249c1cb3f0b16caf6d17c",
  "wipe_key": "ED25519:96dd1f959d1b1f40d77b8c96c01abb5bd328e74bc44249c1cb3f0b16caf6d17c",
  "supply_key": "ED25519:96dd1f959d1b1f40d77b8c96c01abb5bd328e74bc44249c1cb3f0b16caf6d17c",
  "fee_schedule_key": null,
  "pause_key": null,
  "metadata_key": null,
  "supply_type": "INFINITE",
  "max_supply": "0",
  "freeze_default": false
}
```

### Token Detail: 0.0.2126678 (second instance, empty)

```json
{
  "admin_key": "ED25519:34c9141320d9de560fccd2662cd6f452ed4e2596a19771cf2bd6f9cc63e96f31",
  "freeze_key": "ED25519:e38d4a3a9c257fd3a4f9de2a77d803b706610d95ab99fa92d25064751e0c6479",
  "kyc_key": "ED25519:3d681537df7b73bdaf1165debdf3a5a854b6a8874fbffaabde54eab9e1721aae",
  "supply_key": "ED25519:8a25e9bac3e0c509393c4eaffa6be89411e29f5da0624fac95b6c36bd714293a",
  "wipe_key": "ED25519:1fe3481f76188a30aaf77812fd034d52892d63ca730d08c77e5c7e808d4b07e5"
}
```

### Token Detail: 0.0.3951579 (third instance, 10 NFTs)

```json
{
  "admin_key": "ED25519:56e5eb87e035ce2df1923b6c311f38150fcce17dea36786101f3ddb0e74a1ed7",
  "freeze_key": "ED25519:bcc9177538763e319fbea92721ea5b37a6e0d3533a14b3328db284786312b0a0",
  "kyc_key": "ED25519:828dc422e4b8a7290d7005baea3b0ef7c4aa0a95d4836159e0ded4f4cb2aac92",
  "supply_key": "ED25519:f940d4331ed84c48cfd7cd6ad833286f78aebd95d802c204a6c0eabd2a4852a7",
  "wipe_key": "ED25519:392ea0b425681e9688eeebc761278d30cdbdebf92e1519ce77be315c8bc410ec",
  "memo": "0.0.3951578"
}
```

### iREC Key Pattern
- First instance (0.0.1302948): **ALL keys are the SAME** (like Atma.io pattern)
- Second instance (0.0.2126678): **All keys DIFFERENT** (like GCR pattern but with kyc_key)
- Third instance (0.0.3951579): **All keys DIFFERENT** (like GCR pattern but with kyc_key)
- KYC key present on ALL iREC tokens (unlike GCR which has no kyc_key)

### iREC Structure
- **All NFTs** (NON_FUNGIBLE_UNIQUE), no fungible companion token
- Each NFT serial = one iREC certificate
- Energy quantity presumably encoded in the IPFS VC credentialSubject, not in supply

### iREC NFT Metadata

| token_id | serial | metadata (decoded) | meaning |
|----------|--------|-------------------|---------|
| 0.0.1302948 | 29 | 1666883437.543464989 | VP creation timestamp |
| 0.0.1302948 | 30 | 1667229827.878885803 | VP creation timestamp |
| 0.0.3951579 | 9,10 | 1699592258.422974096 | VP creation timestamp (batch) |

### iREC Memo Pattern
- First two instances: memo="" (empty)
- Third instance: memo="0.0.3951578" (Guardian topic reference, same pattern as GCR)
- Evolving pattern — newer deployments use memo for topic backreference

### iREC Guardian Message Flow (topic 0.0.1303350)

```
Seq 1: type=Topic, action=create-topic
       name="Project", description="Project"
       messageType=DYNAMIC_TOPIC
       owner=did:hedera:mainnet:A2YYNnAbxguKhfdQossPi51eTdWf4AtNp9Nbs6NrBAF3;hedera:mainnet:tid=0.0.1302686
       parentId="0.0.1302970"

Seq 2: type=VC-Document, action=create-vc-document
       documentStatus="Waiting for approval"
       cid=bafkreih7hvuw63ufwkqks4srmgugyknrg7frt3bi7gzwrtnqn5qshz4ypm
       url=https://ipfs.io/ipfs/bafkreih7hvuw63ufwkqks4srmgugyknrg7frt3bi7gzwrtnqn5qshz4ypm

Seq 3: type=VC-Document, documentStatus="Approved"
       cid=bafkreicwyzup4unymel2da4bai544umzozeutou5q4yggwtcysiv6qpzpq
       relationships=["1664387028.845159003"]  ← points to Seq 2 timestamp

Seq 4-28: Alternating "Waiting for approval" → "Approved" VC-Document pairs
          Each pair represents one iREC issuance cycle
```

### iREC DID Format
Older format: `did:hedera:mainnet:{key};hedera:mainnet:tid={topic_id}`
Newer format: `did:hedera:mainnet:{key}_{account_id}` (same as GCR/Atma.io)

---

## Cross-Platform Comparison

### Token Identification Patterns

| Pattern | GCR | TYMLEZ | Atma.io | iREC |
|---------|-----|--------|---------|------|
| **Name prefix** | "GCR - " | "TYMLEZ - " | "AtmaCarbonEmissionToken" / "ProductToken" | "iRec Token" |
| **Symbol prefix** | "GCR-" | "TYM_" | "c" / "P" | "iRec" |
| **Token type** | NFT only | Mixed (FT + NFT) | Paired (NFT + FT) | NFT only |
| **Memo** | Guardian topic ID | Empty | Empty | Empty or Guardian topic ID |
| **kyc_key** | null | Present | Present (FT only) | Present |
| **Key diversity** | All different | All different | All same | Mixed |
| **Methodology in name** | Yes (GS TPDDTEC) | Yes (GHG Corporate Standard) | No (generic names) | No |

### Carbon Quantity Location

| Platform | Where quantity lives | Format |
|----------|---------------------|--------|
| **GCR** | NFT count (each NFT = 1 credit) | total_supply = number of credits |
| **TYMLEZ** | Fungible supply with decimals=2 | total_supply / 100 = tCO2e |
| **Atma.io** | Fungible supply with decimals=2 | total_supply / 100 = tCO2e |
| **iREC** | NFT count (each NFT = 1 cert) + quantity in IPFS VC | total_supply = number of certificates, MWh in credentialSubject |

### NFT Metadata Pattern (UNIVERSAL)

**ALL platforms use the same NFT metadata encoding:**
- base64-encoded consensus timestamp string
- Timestamp references a CONSENSUSSUBMITMESSAGE transaction
- Transaction memo = "VP creation message"
- Transaction entity_id = topic where VP document (IPFS CID) was published

### Guardian Architecture Pattern

```
Token memo → Parent topic ID (may be empty on older tokens)
NFT metadata → VP creation timestamp → Transaction → entity_id = VP topic
VP topic → VP-Document message → IPFS CID → Verifiable Presentation
VP contains VCs that contain credentialSubject with actual data
```

### Discovery Strategy for Parser

```
1. GET /api/v1/tokens?account.id={treasury}
2. For each token:
   a. Identify platform by name/symbol prefix
   b. If NFT: GET /api/v1/tokens/{id}/nfts?limit=N
   c. Decode metadata (base64 → timestamp)
   d. GET /api/v1/transactions?timestamp={metadata_timestamp}
   e. Follow entity_id to topic → get VP message → get IPFS CID
   f. Fetch IPFS CID for full credentialSubject data
3. For fungible tokens: quantity = total_supply / 10^decimals
```

### IPFS CIDs Collected (for reference/caching)

**GCR:**
- bafkreialyhxduaxe7fcndtsiaodyapqvncbbhmzo6cwzb5rqbjusuutzp4 (PROJECT_DEVELOPER role VC)
- bafkreid64gd2ldmfyx44kswbv5w46h4fzcwmymcjd373vmvgcjwuvkcyh4 (Project developer registration VC — FETCHED)
- bafkreifstyjauk3uijkzkep4ib6jqct6bizwlorzn7u2la7td2wgm2pgsi (VVB role VC)
- bafkreia5vs5beumi4t3htiplpefv437qdyavtkxiixy4yv6sopx2t6xw5a (credit issuance VC)
- bafkreiaiw36g6fobnbirdglt34ikfxze5u6ip453k7c6vdfyohswjf7kje (credit VC)

**iREC:**
- bafkreih7hvuw63ufwkqks4srmgugyknrg7frt3bi7gzwrtnqn5qshz4ypm (project VC - waiting for approval)
- bafkreicwyzup4unymel2da4bai544umzozeutou5q4yggwtcysiv6qpzpq (approved VC)
- bafkreid5viaby73imxob3l4skca2ppumjm2hiyytyd262qwz2f7itcmvhe (approved VC)
- bafkreigoui5ei27keby3fk24vwv7kzpkncsmy5pdqmczgojotq77nrzgzm (iREC cert VC)

**Atma.io:**
- bafkreihnc6fp7vwzqqp2bkcecnbxt5b34jmhm5yp6a6ghd5xkc4dcsyile (GHGP VC)
- bafkreifuy5w442jxhyhgdixj6losjfzyefekkcbvemaofq77keg3lidgzm (project VC)
- bafkreiaq3egonbztusoyumg6dhe2bs4gdsrezrdnytfd3jogshzt73xbhq (approved VC)
- bafkreic5na7lq3ltgq6pwu3xsd6s7lhwinnccsexyehdgvjns5vsrhmz5y (mint VP)

### Non-GCR Tokens in GCR Treasury

The GCR treasury 0.0.3843565 also holds:
- **0.0.456858** — "USD Coin" (USDC), FUNGIBLE_COMMON, decimals=6, ProtobufEncoded admin_key (multi-sig)
- **0.0.5125512** — "API Token (0.0.19)", NON_FUNGIBLE_UNIQUE — Guardian API token
- **0.0.5262064** — "API Token (0.0.19)", NON_FUNGIBLE_UNIQUE — Guardian API token

Parser should filter these out by name/symbol pattern matching.

---

## Parser Detection Rules

```typescript
// Platform detection from token fields
function detectPlatform(token: HederaToken): string {
  if (token.name.startsWith("GCR - ")) return "GCR";
  if (token.name.startsWith("TYMLEZ - ")) return "TYMLEZ";
  if (token.name === "AtmaCarbonEmissionToken" || token.name === "ProductToken") return "ATMA";
  if (token.name === "iRec Token") return "IREC";
  if (token.symbol.startsWith("GCR-")) return "GCR";
  if (token.symbol.startsWith("TYM_")) return "TYMLEZ";
  if (token.symbol === "c" || token.symbol === "P") return "ATMA"; // needs treasury check
  if (token.symbol === "iRec") return "IREC";
  return "UNKNOWN";
}

// Carbon quantity extraction
function extractCarbonQuantity(token: HederaToken): number | null {
  if (token.type === "FUNGIBLE_COMMON" && token.decimals > 0) {
    return Number(token.total_supply) / Math.pow(10, Number(token.decimals));
  }
  if (token.type === "NON_FUNGIBLE_UNIQUE") {
    return Number(token.total_supply); // each NFT = 1 credit/cert
  }
  return null;
}

// Methodology extraction from GCR name
function extractGCRMethodology(name: string): { methodology: string; version: string; project: string } {
  const match = name.match(/^GCR - (GS \w+)\s*(v[\d.]+)?\s*(?:- (.+))?$/);
  return {
    methodology: match?.[1] || "",
    version: match?.[2] || "",
    project: match?.[3] || ""
  };
}
```
