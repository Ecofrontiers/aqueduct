# Hedera Mirror Node Token Metadata Research

**Date:** 2025-03-13
**Source:** `https://mainnet-public.mirrornode.hedera.com/api/v1`

---

## 1. CAPTURIANT

### Treasury Accounts & Token Counts

| Account | Project | Tokens |
|---------|---------|--------|
| `0.0.4640644` | Miller Mountain | 20 fungible tokens |
| `0.0.5054978` | Warrior | 10 fungible tokens |

### Name Pattern

```
Forward-{PROJECT_NAME} Project-Capturiant standard-{VINTAGE_YEAR}
```

Examples:
- `Forward-Miller Mountain Project-Capturiant standard-2026`
- `Forward-Warrior Project-Capturiant standard-2029`

### Symbol Pattern

```
F{PROJECT_INITIAL}{CREDIT_TYPE}C{VINTAGE_YEAR}
```

- Miller Mountain: `FM` prefix -> `FMOtherC2024` through `FMOtherC2043`
- Warrior: `FW` prefix -> `FWOtherC2024` through `FWOtherC2033`

The `Other` in the symbol corresponds to `projectType: "Other"` in the IPFS metadata. `C` likely = "Capturiant".

### Memo Field

Plain text IPFS CID (CIDv1, base32, bafkrei prefix):

```
bafkreid3qkjtqhr2peleasbutngrvcnpmfkn2kb3uzhqoj3hhnoqttlv4u
bafkreica36jhk3d5kjo2n3uz5o7ghfsnt4aq527ebekpkqkiaalwzs4xoy
bafkreid27iets5wlitqxtrpoigrnu7pukmlbusk6hue6ltmxvqlouqwy7m
```

Resolvable at: `https://{CID}.ipfs.w3s.link/`

### IPFS Metadata Schema (Resolved)

**Miller Mountain 2026:**
```json
{
  "projectName": "Miller Mountain Project",
  "projectType": "Other",
  "country": "United States of America",
  "vintage": "2026",
  "validationDate": "2023-10-13T21:07:49.522Z",
  "registrationDate": null,
  "standard": "Capturiant standard",
  "sdgs": [13, 9]
}
```

**Miller Mountain 2024:** Same schema, vintage=2024, same SDGs (13, 9).

**Warrior 2029:**
```json
{
  "projectName": "Warrior Project",
  "projectType": "Other, Energy",
  "country": "United States of America",
  "vintage": "2029",
  "validationDate": "2024-01-26",
  "registrationDate": null,
  "standard": "Capturiant standard",
  "sdgs": [13, 15, 12]
}
```

Note: Warrior has `projectType: "Other, Energy"` (multi-type) and different SDGs.

### Full Token Detail (Representative: 0.0.4695628)

```json
{
  "admin_key": {"_type": "ED25519", "key": "7f3661bbc57ca78750d8e00574897e59492afff4ce8b93507d3b8f79f4c807a8"},
  "auto_renew_account": "0.0.4640644",
  "auto_renew_period": 7776000,
  "created_timestamp": "1708019346.763449003",
  "custom_fees": {"fixed_fees": [], "fractional_fees": []},
  "decimals": "0",
  "deleted": false,
  "fee_schedule_key": null,
  "freeze_default": false,
  "freeze_key": null,
  "initial_supply": "1666123",
  "kyc_key": null,
  "max_supply": "0",
  "memo": "bafkreid3qkjtqhr2peleasbutngrvcnpmfkn2kb3uzhqoj3hhnoqttlv4u",
  "metadata": "",
  "metadata_key": null,
  "name": "Forward-Miller Mountain Project-Capturiant standard-2026",
  "pause_key": null,
  "pause_status": "NOT_APPLICABLE",
  "supply_key": {"_type": "ED25519", "key": "7f3661bbc57ca78750d8e00574897e59492afff4ce8b93507d3b8f79f4c807a8"},
  "supply_type": "INFINITE",
  "symbol": "FMOtherC2026",
  "token_id": "0.0.4695628",
  "total_supply": "1666123",
  "treasury_account_id": "0.0.4640644",
  "type": "FUNGIBLE_COMMON",
  "wipe_key": {"_type": "ED25519", "key": "7f3661bbc57ca78750d8e00574897e59492afff4ce8b93507d3b8f79f4c807a8"}
}
```

### All Miller Mountain Tokens (0.0.4640644)

| token_id | name | symbol | initial_supply |
|----------|------|--------|----------------|
| 0.0.4695628 | Forward-Miller Mountain Project-Capturiant standard-2026 | FMOtherC2026 | 1,666,123 |
| 0.0.4695629 | Forward-Miller Mountain Project-Capturiant standard-2027 | FMOtherC2027 | - |
| 0.0.4695630 | Forward-Miller Mountain Project-Capturiant standard-2028 | FMOtherC2028 | - |
| 0.0.4695631 | Forward-Miller Mountain Project-Capturiant standard-2029 | FMOtherC2029 | - |
| 0.0.4695632 | Forward-Miller Mountain Project-Capturiant standard-2030 | FMOtherC2030 | - |
| 0.0.4695633 | Forward-Miller Mountain Project-Capturiant standard-2031 | FMOtherC2031 | - |
| 0.0.4695637 | Forward-Miller Mountain Project-Capturiant standard-2032 | FMOtherC2032 | - |
| 0.0.4695639 | Forward-Miller Mountain Project-Capturiant standard-2033 | FMOtherC2033 | - |
| 0.0.4695640 | Forward-Miller Mountain Project-Capturiant standard-2034 | FMOtherC2034 | - |
| 0.0.4695641 | Forward-Miller Mountain Project-Capturiant standard-2035 | FMOtherC2035 | - |
| 0.0.4695643 | Forward-Miller Mountain Project-Capturiant standard-2036 | FMOtherC2036 | - |
| 0.0.4695644 | Forward-Miller Mountain Project-Capturiant standard-2037 | FMOtherC2037 | - |
| 0.0.4695649 | Forward-Miller Mountain Project-Capturiant standard-2038 | FMOtherC2038 | - |
| 0.0.4695650 | Forward-Miller Mountain Project-Capturiant standard-2039 | FMOtherC2039 | - |
| 0.0.4695651 | Forward-Miller Mountain Project-Capturiant standard-2040 | FMOtherC2040 | - |
| 0.0.4695654 | Forward-Miller Mountain Project-Capturiant standard-2041 | FMOtherC2041 | - |
| 0.0.4695658 | Forward-Miller Mountain Project-Capturiant standard-2042 | FMOtherC2042 | - |
| 0.0.4695689 | Forward-Miller Mountain Project-Capturiant standard-2043 | FMOtherC2043 | - |
| 0.0.4695696 | Forward-Miller Mountain Project-Capturiant standard-2024 | FMOtherC2024 | 410,324 |
| 0.0.4695698 | Forward-Miller Mountain Project-Capturiant standard-2025 | FMOtherC2025 | - |

Vintage range: 2024-2043 (20 years). Created Feb 15, 2024.

### All Warrior Tokens (0.0.5054978)

| token_id | symbol | vintage |
|----------|--------|---------|
| 0.0.5116287 | FWOtherC2029 | 2029 |
| 0.0.5116292 | FWOtherC2030 | 2030 |
| 0.0.5116354 | FWOtherC2024 | 2024 |
| 0.0.5116355 | FWOtherC2025 | 2025 |
| 0.0.5116356 | FWOtherC2033 | 2033 |
| 0.0.5116358 | FWOtherC2031 | 2031 |
| 0.0.5116362 | FWOtherC2026 | 2026 |
| 0.0.5116363 | FWOtherC2027 | 2027 |
| 0.0.5116367 | FWOtherC2032 | 2032 |
| 0.0.5116368 | FWOtherC2028 | 2028 |

Vintage range: 2024-2033 (10 years). Created Mar 26, 2024.

### Capturiant Key Configuration

| Key | Miller Mountain | Warrior |
|-----|----------------|---------|
| admin_key | `7f3661bb...c807a8` | `c889e245...bd9505` |
| supply_key | Same as admin | Same as admin |
| wipe_key | Same as admin | Same as admin |
| freeze_key | null | null |
| kyc_key | null | null |
| fee_schedule_key | null | null |
| pause_key | null | null |
| metadata_key | null | null |

**Different admin keys per project.** All three active keys (admin, supply, wipe) share the same ED25519 key within a project. `decimals: 0` (whole units). `supply_type: INFINITE`, `max_supply: 0`.

---

## 2. ORBEX / OrbexCO2

### Treasury Account

`0.0.4576278` -- single treasury, 100+ tokens across 5+ paginated pages.

### Token Categories

OrbexCO2 operates a **dual-token model**: commodity tokens paired with CO2 credit tokens.

#### Category A: Commodity Tokens (Scrap Metal / Material)

**Name patterns (truncated to ~20 chars on Hedera):**

| Full Commodity Name | Truncated Name | Symbol Prefix | Material Category |
|---------------------|---------------|---------------|-------------------|
| Aluminum/Copper Radiators | `4701- ALUM/COPPER` or `AluminumCopperRadi` or `Alum/copperRadsIro` | `Mix-` or `MIX-` | Mixed |
| Mixed Low Copper Aluminum | `4500- MLC ALUM` or `MixedLowCopperAlum` | `dAlum-` or `dAluminiu` | Aluminum |
| #1 Copper Wire | `2100- #1 COPPER` or `No.1CopperWire` | `dCopp-` | Copper |
| 6063 Aluminum Clean | `4300- 6063 ALUM CL` or `AluminumExtrusions` | `dAlum-` or `dAluminiu` | Aluminum |
| Busheling | `1280- BUSHELING` or `No.1Busheling` or `FoundryBusheling` | `dFerr-` or `dFerrous` | Ferrous |
| #1 HMS | `1040- #1 HMS` or `No.1HeavyMeltingSt` | `dFerr-` or `dFerrous` | Ferrous |
| P&S | `1020- P&S` or `PlateAndStructural` | `dFerr-` or `dFerrous` | Ferrous |
| Shredded Ferrous | `1510- SHREDDED FER` or `ShreddedScrap` | `dFerr-` or `dFerrous` | Ferrous |
| Aluminum Cans | `4580- ALUM CANS (N` or `AluminiumCans(nonC` | `dAlum-` or `dAluminiu` | Aluminum |
| 18-8/304 SS | `5910- 18-8/304 SS` or `StainlessSteelScra` | `dSS-` | Stainless Steel |
| 316 SS Solids | `316SsSolids` | `dSS-` | Stainless Steel |
| Aluminum Auto Wheels | `AluminiumAutoWheel` | `dAlum-` | Aluminum |
| #1 Heavy Copper Solids | `No.1HeavyCopperSol` | `dCopp-` | Copper |
| #2 Copper Wire | `No.2CopperWire` | `dCopp-` | Copper |
| Thermal Coal | `ThermalCoal-Carbon` | `dTher-` | Thermal |
| TPO Injection Plastic | `TpoInj15-25mi15-25` | `dPlas-` | Plastic |

**Symbol pattern:** `d{Category}-{MMYY}` where:
- Category: `Alum`, `Ferr`, `Copp`, `SS`, `Ther`, `Plas`
- MMYY: month+year of the batch/shipment (e.g., `0123` = Jan 2023, `1223` = Dec 2023)
- Exception: `Mix-{MMYY}` or `MIX-{MMYY}` for mixed metal batches

Early tokens used ISRI codes as names (e.g., `4701-`, `4500-`, `2100-`, `1280-`) and symbols like `dAluminiu`, `dFerrous`, `dCopper`. Later tokens use descriptive CamelCase names and `d{Category}-{MMYY}` symbols.

#### Category B: OrbexCO2 Credit Tokens

**Name patterns (evolution over time):**

| Period | Name Pattern | Examples |
|--------|-------------|----------|
| Early (Jun 2024) | `OrbexCO2-Credit` | 0.0.6276539, 0.0.6276653 |
| Mid (Aug 2024) | `OrbexCO2-Mix` | 0.0.6896659 |
| Later (Aug 2024+) | `OrbexCO2-d{MaterialCategory}` | `OrbexCO2-dAluminium`, `OrbexCO2-dFerrous`, `OrbexCO2-dCopper`, `OrbexCO2-dThermalCoal`, `OrbexCO2-dPlastic` |

All CO2 tokens: `symbol: "CO2e"`, `decimals: 3`.

#### Category C: Test Tokens

- `test31012024-01` (0.0.4587016) - symbol `test`, supply 1
- `test31012024-02` (0.0.4587042) - symbol `test02`
- `StatusTest` (0.0.9878411) - symbol `TEST`

### Memo Field JSON Schema

OrbexCO2 memos are JSON strings. **Three distinct schemas observed:**

#### Schema 1: Early Commodity (Jan-Feb 2024)

```json
{"memoDescriptions": "{UUID}", "uom": "uom"}
```

Example (0.0.4589462 - `4701- ALUM/COPPER`):
```json
{"memoDescriptions":"9b38c34f-7579-4cbf-9d9b-38e72f0abb34","uom":"uom"}
```

- `memoDescriptions`: UUID (likely Orbex internal commodity ID)
- `uom`: literal string `"uom"` (placeholder, not a real unit)

#### Schema 2: Commodity with Origin (Feb 2024+)

```json
{"OrbexMarket": "{UUID},Origin-{COUNTRY}-{STATE}", "uom": "MT"}
```

Example (0.0.4751534 - `No.1HeavyMeltingSt`):
```json
{"OrbexMarket":"9b496856-06ba-4ab2-840b-1450105138b9,Origin-US-TN","uom":"MT"}
```

Example (0.0.4801245 - `AluminiumAutoWheel`):
```json
{"OrbexMarket":"9b49682b-e1e1-4bbc-80c2-c7c2218b4f26,Origin-US-KY","uom":"MT"}
```

Example (0.0.9122157 - `ThermalCoal-Carbon`):
```json
{"OrbexMarket":"9ebd5ec4-d26f-4614-b726-14d48659774a,Origin-US-IL","uom":"MT"}
```

Example (0.0.10042614 - `TpoInj15-25mi15-25`):
```json
{"OrbexMarket":"9e589ce6-6d58-4003-86cf-da3bf12a6aaf,Origin-US-IN","uom":"MT"}
```

- `OrbexMarket`: `{UUID},{Origin}` -- UUID is market/facility ID, comma-separated from origin
- Origin format: `Origin-{ISO2}-{STATE_CODE}` (US states: TN, KY, AL, CA, IL, IN)
- `uom`: `"MT"` (metric tons)

#### Schema 3: CO2 Credit with tokenLink (Jun 2024+)

```json
{"OrbexMarket": "{UUID}", "uom": "tCO2e/MT", "tokenLink": "{TOKEN_ID}"}
```

Example (0.0.6276539 - `OrbexCO2-Credit`):
```json
{"OrbexMarket":"9c6492ff-3558-4186-9884-4df82aa4ad1e","uom":"tCO2e/MT","tokenLink":"0.0.6276431"}
```

Example (0.0.9122158 - `OrbexCO2-dThermalCoal`):
```json
{"OrbexMarket":"9ebd5ec4-d26f-4614-b726-14d48659774a","uom":"tCO2e","tokenLink":"0.0.9122157"}
```

Example (0.0.10042615 - `OrbexCO2-dPlastic`):
```json
{"OrbexMarket":"9e589ce6-6d58-4003-86cf-da3bf12a6aaf","uom":"tCO2e","tokenLink":"0.0.10042614"}
```

- `OrbexMarket`: UUID only (no origin -- origin is on the linked commodity token)
- `uom`: `"tCO2e/MT"` (early) or `"tCO2e"` (later) -- tonnes CO2 equivalent
- `tokenLink`: Hedera token_id of the paired COMMODITY token

**CRITICAL: The OrbexMarket UUID in the CO2 token matches the UUID prefix of the commodity token it links to.** This is the pairing mechanism.

#### Schema 4: Early Commodity with truncated nested JSON

```json
{"memoDescriptions":"{\"coo_id\":\"{UUID}\",\"","uom":"MT"}
```

Example (0.0.4675619 - `No.2CopperWire`):
```json
{"memoDescriptions":"{\"coo_id\":\"9b496be1-995d-4bce-891a-9d4cc7f0b63d\",\"","uom":"MT"}
```

This appears to be a transitional format where `memoDescriptions` contained escaped JSON that got truncated (Hedera memo field has a 100-byte limit). Contains a `coo_id` (Certificate of Origin ID).

#### Schema 5: Test token memo

```json
{"memoDescriptions":"token","uom":"0"}
```

### Confirmed Commodity-CO2 Token Pairs

| CO2 Token | CO2 Name | Commodity Token | Commodity Name | Shared UUID | Origin |
|-----------|----------|-----------------|----------------|-------------|--------|
| 0.0.6276539 | OrbexCO2-Credit | 0.0.6276431 | No.1Busheling | `9c6492ff-3558-...` | US-AL |
| 0.0.6276653 | OrbexCO2-Credit | 0.0.5470559 | AluminumExtrusions | `9bb7b918-1da7-...` | US-TN |
| 0.0.6279217 | OrbexCO2-Credit | 0.0.6262743 | AluminumExtrusions | `9bb7b918-1a29-...` | US-TN |
| 0.0.6279240 | OrbexCO2-Credit | 0.0.6279239 | MixedLowCopperAlum | `9c6492ff-2abe-...` | US-TN |
| 0.0.6896659 | OrbexCO2-Mix | 0.0.6896644 | AluminumCopperRadi | `9c6492ff-23aa-...` | - |
| 0.0.6908371 | OrbexCO2-dAluminium | 0.0.6908362 | AluminiumAutoWheel | `9c6492ff-203c-...` | US-CA |
| 0.0.9122158 | OrbexCO2-dThermalCoal | 0.0.9122157 | ThermalCoal-Carbon | `9ebd5ec4-d26f-...` | US-IL |
| 0.0.10042615 | OrbexCO2-dPlastic | 0.0.10042614 | TpoInj15-25mi15-25 | `9e589ce6-6d58-...` | US-IN |

### OrbexCO2 Key Configuration

| Key | Value |
|-----|-------|
| admin_key | `e3d87a0f...e9797c` (single key for ALL tokens) |
| supply_key | **null** (no minting after creation!) |
| wipe_key | Same as admin |
| freeze_key | null |
| kyc_key | null |
| fee_schedule_key | null |
| pause_key | null |
| metadata_key | null |

**Key difference from Capturiant:** OrbexCO2 has `supply_key: null`, meaning tokens cannot be minted/burned after creation. Capturiant has `supply_key = admin_key`, allowing ongoing supply management.

One exception: token `0.0.9472422` (`OrbexCO2-dThermalCoal`) has `admin_key: null` -- fully immutable.

### OrbexCO2 Common Properties

- `type`: FUNGIBLE_COMMON
- `decimals`: 3 (commodity and CO2 tokens; early ISRI-code tokens also 3)
  - Exception: test tokens have `decimals: 0`
- `supply_type`: INFINITE
- `max_supply`: "0"
- `auto_renew_period`: 7776000 (90 days)

### Observed US State Origins

| State Code | State | Materials |
|------------|-------|-----------|
| TN | Tennessee | Ferrous, Aluminum, Mixed |
| KY | Kentucky | Aluminum |
| AL | Alabama | Ferrous |
| CA | California | Aluminum |
| IL | Illinois | Thermal Coal |
| IN | Indiana | Plastic |

---

## 3. PARSER DESIGN IMPLICATIONS

### Capturiant Parser

```
DETECTION:
  name matches /^Forward-.+-Capturiant standard-\d{4}$/
  OR symbol matches /^F[A-Z][A-Za-z]+C\d{4}$/
  OR memo matches /^bafkrei[a-z2-7]{52}$/  (CIDv1 base32)

EXTRACTION:
  From name: project_name, standard ("Capturiant standard"), vintage_year
  From symbol: project_code, credit_type_code, vintage_year
  From memo: IPFS CID -> fetch -> {projectName, projectType, country, vintage, validationDate, registrationDate, standard, sdgs[]}

SUPPLY:
  total_supply with decimals=0 -> whole units (likely tonnes CO2)
```

### OrbexCO2 Parser

```
DETECTION (Commodity):
  treasury_account_id = "0.0.4576278"
  AND name NOT starts with "OrbexCO2"
  AND name NOT starts with "test" AND name NOT = "StatusTest"
  AND memo contains "OrbexMarket" OR memo contains "memoDescriptions"

DETECTION (CO2 Credit):
  name starts with "OrbexCO2"
  OR (symbol = "CO2e" AND memo contains "tokenLink")

EXTRACTION (Commodity):
  From memo JSON:
    - Parse "OrbexMarket" field: split on comma -> uuid, origin
    - OR parse "memoDescriptions" field: uuid or nested JSON with coo_id
    - "uom": "MT" (metric tons) or "uom" (placeholder)
  From name: material type (may be truncated)
  From symbol: material category prefix + date code (MMYY)

EXTRACTION (CO2 Credit):
  From memo JSON:
    - "OrbexMarket": uuid (matches paired commodity)
    - "uom": "tCO2e/MT" or "tCO2e"
    - "tokenLink": Hedera token_id of paired commodity
  From name: "OrbexCO2-Credit" (generic) or "OrbexCO2-d{Category}" (typed)

PAIRING LOGIC:
  1. CO2 token memo.tokenLink -> commodity token_id
  2. Verify: CO2 token memo.OrbexMarket UUID matches commodity memo.OrbexMarket UUID prefix
  3. Origin/geography comes from COMMODITY token memo, not CO2 token
```

### UUID Patterns

Orbex UUIDs appear to follow a facility/market identifier scheme:
- `9b38c34f-*` : Early batch (Jan 2024)
- `9b49685*-*` : Feb 2024 batch
- `9bb7b918-*` : Later batches
- `9c6492ff-*` : Mar 2024+ batches
- `9e589ce6-*` : Plastic facility
- `9ebd5ec4-*` : Coal facility

The first 8 hex chars may identify the facility/yard, with the remaining UUID portion being batch-specific.

### Token Name Evolution Timeline

| Period | Commodity Naming | CO2 Naming |
|--------|-----------------|------------|
| Jan 2024 | ISRI codes (`4701-`, `1280-`) + material | N/A |
| Feb 2024 | CamelCase (`No.2CopperWire`) | N/A |
| Jun 2024 | CamelCase | `OrbexCO2-Credit` (generic) |
| Aug 2024 | CamelCase | `OrbexCO2-{d}{Category}` (typed) |
| Apr 2025 | CamelCase | `OrbexCO2-d{Category}` |

---

## 4. RAW TOKEN INVENTORY (OrbexCO2 Account 0.0.4576278)

Total tokens observed across 5 pages (pagination still continues): 120+ tokens.

### Material Categories Observed

| Symbol Prefix | Count (approx) | Material |
|---------------|----------------|----------|
| dFerr- | 40+ | Ferrous metals (HMS, busheling, P&S, shredded) |
| dAlum- | 30+ | Aluminum (extrusions, cans, auto wheels, MLC) |
| dCopp- | 8+ | Copper (#1 wire, #2 wire, heavy solids) |
| dSS- | 8+ | Stainless steel (304/316) |
| CO2e | 15+ | Carbon credits |
| Mix- / MIX- | 6+ | Mixed metals (alum/copper radiators) |
| dTher- | 1 | Thermal coal |
| dPlas- | 1 | Plastic |
| test / TEST | 3 | Test tokens |

### Date Range

- Earliest commodity: Jan 2024 (0.0.4587016 test, 0.0.4589462 first real)
- Latest observed: symbol dates up to `0825` (Aug 2025), token IDs up to 0.0.10163202+
- CO2 tokens start: Jun 2024 (0.0.6276539)
