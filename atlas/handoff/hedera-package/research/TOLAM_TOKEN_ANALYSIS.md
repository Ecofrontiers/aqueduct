# Tolam Earth — Hedera Token Metadata Analysis

Raw data extracted 2026-03-13 from Hedera Mainnet Mirror Node.

---

## Treasury Accounts

| Treasury | Account | Role | Token Count |
|----------|---------|------|-------------|
| Assets | `0.0.6144372` | Holds carbon credit NFTs (1 NFT = 1 tCO2e) | 15 tokens |
| Certificates | `0.0.6138881` | Holds tokenization certificates (receipts) | 5 tokens |

---

## ASSETS TREASURY (0.0.6144372) — All 15 Tokens

### Token 1: EcoRegistry Asset (original, empty)
```
token_id:           0.0.6144590
name:               "EcoRegistry Asset"
symbol:             "ERA"
memo:               "0.0.6144588"          ← Hedera account ID (likely a related contract/topic)
type:               NON_FUNGIBLE_UNIQUE
supply_type:        INFINITE
max_supply:         0
total_supply:       0                      ← No NFTs minted
decimals:           0
created_timestamp:  1718300714.464249011    (2024-06-13)
admin_key:          ED25519 a925c65d...     ← HAS admin key (only asset token with one)
freeze_key:         ED25519 e56e2381...
kyc_key:            null
wipe_key:           ED25519 f8bd4bfd...
supply_key:         ED25519 8155a3f9...
pause_key:          null
pause_status:       NOT_APPLICABLE
fee_schedule_key:   null
metadata_key:       null
auto_renew_account: 0.0.6144372
```

### Token 2: Smoke Test — 11309
```
token_id:           0.0.7821560
name:               "TOLAM SMOKE TEST REGISTRY - Smoke_Test-11309.1589414400.1651104000"
symbol:             "Smoke_Test-11309.1589414400.1651104000"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         36756
total_supply:       1000
decimals:           0
created_timestamp:  1733852988.765736000   (2024-12-10)
admin_key:          null
freeze_key:         ED25519 4ab3bb60...
kyc_key:            null
wipe_key:           ED25519 aa906d01...
supply_key:         ED25519 2bb4ae3b...
pause_key:          ED25519 200e822a...
pause_status:       UNPAUSED
auto_renew_account: null
```
Symbol decoded: `Smoke_Test-{projectId}.{startUnix}.{endUnix}` → Project 11309, 2020-05-14 to 2022-04-28

### Token 3: EcoRegistry CDC — 109 (Colombia)
```
token_id:           0.0.7851603
name:               "ERA - CDC_109_7_14_327_1_R6_XX_CO_1_1_2021"
symbol:             "CDC_109_7_14_327_1_R6_XX_CO_1_1_2021"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         26873
total_supply:       0                      ← No NFTs minted yet
decimals:           0
created_timestamp:  1734119720.348861000   (2024-12-13)
admin_key:          null
freeze_key:         ED25519 9ed0a420...
wipe_key:           ED25519 ccc0920f...
supply_key:         ED25519 2e4cd0eb...
pause_key:          ED25519 77eba2dd...
pause_status:       UNPAUSED
```

### Token 4: Verra VCU — 576 (Mexico)
```
token_id:           0.0.8112020
name:               "VRA - VCS-VCU-576-VER-MX-1-1041-01012020-31122020-0"
symbol:             "VCS-VCU-576-VER-MX-1-1041-01012020-31122020-0"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         230496
total_supply:       1
decimals:           0
created_timestamp:  1737127161.885331000   (2025-01-17)
admin_key:          null
freeze_key:         ED25519 fff65ca6...
wipe_key:           ED25519 c18ccbd6...
supply_key:         ED25519 e65eec4d...
pause_key:          ED25519 55221f75...
pause_status:       UNPAUSED
auto_renew_account: 0.0.6144372
```

### Token 5: GCSR — GCSP1024 (2024-01-01 to 2024-12-31)
```
token_id:           0.0.8113653
name:               "GCSR - GCSP1024.1704067200.1735603200"
symbol:             "GCSP1024.1704067200.1735603200"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         75446
total_supply:       1
decimals:           0
created_timestamp:  1737146720.913341336   (2025-01-17)
admin_key:          null
freeze_key:         ED25519 910bf1c8...
wipe_key:           ED25519 159e9021...
supply_key:         ED25519 adbdf377...
pause_key:          ED25519 08de1d4c...
pause_status:       UNPAUSED
auto_renew_account: 0.0.6144372
```
Symbol decoded: `GCSP1024.{startUnix}.{endUnix}` → 2024-01-01 to 2024-12-31

### Token 6: Smoke Test — 3449
```
token_id:           0.0.8182455
name:               "TOLAM SMOKE TEST REGISTRY - Smoke_Test-3449.1509494400.1540944000"
symbol:             "Smoke_Test-3449.1509494400.1540944000"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         8630
total_supply:       11
decimals:           0
created_timestamp:  1738018582.308863000   (2025-01-27)
admin_key:          null
freeze_key:         ED25519 f1faf054...
wipe_key:           ED25519 f5e903e4...
supply_key:         ED25519 54397851...
pause_key:          ED25519 bdd01c48...
pause_status:       UNPAUSED
auto_renew_account: 0.0.6144372
```
Symbol decoded: Project 3449, 2017-11-01 to 2018-10-31

### Token 7: Verra VCU — 466 (US, project 4018)
```
token_id:           0.0.8315181
name:               "VRA - VCS-VCU-466-VER-US-4-4018-01012022-31122022-0"
symbol:             "VCS-VCU-466-VER-US-4-4018-01012022-31122022-0"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         24468
total_supply:       201
decimals:           0
created_timestamp:  1740003307.526116000   (2025-02-19)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 8: Verra VCU — 466 (Singapore, project 4019)
```
token_id:           0.0.8315201
name:               "VRA - VCS-VCU-466-VER-SG-4-4019-03012022-31122022-0"
symbol:             "VCS-VCU-466-VER-SG-4-4019-03012022-31122022-0"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         8750
total_supply:       6109
decimals:           0
created_timestamp:  1740003905.617895302   (2025-02-19)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 9: Verra VCU — 466 (US, project 3207)
```
token_id:           0.0.8315235
name:               "VRA - VCS-VCU-466-VER-US-6-3207-01012023-31122023-0"
symbol:             "VCS-VCU-466-VER-US-6-3207-01012023-31122023-0"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         32027
total_supply:       3902
decimals:           0
created_timestamp:  1740004977.923221352   (2025-02-19)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 10: GCSR — GCSP1024 (2024-11-16 to 2024-12-31)
```
token_id:           0.0.8351104
name:               "GCSR - GCSP1024.1731715200.1735603200"
symbol:             "GCSP1024.1731715200.1735603200"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         12000
total_supply:       12000
decimals:           0
created_timestamp:  1740510739.886953000   (2025-02-25)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 11: GCSR — GCSP1024 (2025-01-01 to 2025-12-31)
```
token_id:           0.0.8351309
name:               "GCSR - GCSP1024.1735689600.1767139200"
symbol:             "GCSP1024.1735689600.1767139200"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         8628
total_supply:       6628
decimals:           0
created_timestamp:  1740514770.429124421   (2025-02-25)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 12: GCSR — GCSP1024 (2024-10-01 to 2024-11-15)
```
token_id:           0.0.8351944
name:               "GCSR - GCSP1024.1727740800.1731628800"
symbol:             "GCSP1024.1727740800.1731628800"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         5933
total_supply:       3933
decimals:           0
created_timestamp:  1740531265.889639501   (2025-02-26)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 13: EcoRegistry CDC — 153 (Brazil, 2020)
```
token_id:           0.0.8357484
name:               "ERA - CDC_153_19_1_332_14_R1_XX_BR_1_1_2020"
symbol:             "CDC_153_19_1_332_14_R1_XX_BR_1_1_2020"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         919867
total_supply:       10000
decimals:           0
created_timestamp:  1740607599.242154284   (2025-02-26)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 14: EcoRegistry CDC — 153 (Brazil, 2021)
```
token_id:           0.0.8357578
name:               "ERA - CDC_153_19_1_332_14_R1_XX_BR_1_1_2021"
symbol:             "CDC_153_19_1_332_14_R1_XX_BR_1_1_2021"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         1031206
total_supply:       10000
decimals:           0
created_timestamp:  1740610249.441082000   (2025-02-27)
admin_key:          null
auto_renew_account: 0.0.6144372
```

### Token 15: EcoRegistry CDC — 153 (Brazil, 2022)
```
token_id:           0.0.8357599
name:               "ERA - CDC_153_19_1_332_14_R1_XX_BR_1_1_2022"
symbol:             "CDC_153_19_1_332_14_R1_XX_BR_1_1_2022"
memo:               ""
type:               NON_FUNGIBLE_UNIQUE
supply_type:        FINITE
max_supply:         1031207
total_supply:       10000
decimals:           0
created_timestamp:  1740610852.529288000   (2025-02-27)
admin_key:          null
auto_renew_account: 0.0.6144372
```

---

## CERTIFICATES TREASURY (0.0.6138881) — All 5 Tokens

### Certificate 1: Smoke Test TC (original)
```
token_id:           0.0.7642468
name:               "Tolam Smoke Test Registry Tokenization Certificate"
symbol:             "SMKTST-TC"
memo:               "0.0.7642466"          ← Hedera account/topic ID
type:               NON_FUNGIBLE_UNIQUE
supply_type:        INFINITE
max_supply:         0
total_supply:       6
decimals:           0
created_timestamp:  1732619038.902675000   (2024-11-26)
admin_key:          null
freeze_key:         null
kyc_key:            null
wipe_key:           null
supply_key:         ED25519 332ee2eb...
pause_key:          null
pause_status:       NOT_APPLICABLE
auto_renew_account: 0.0.6138881
```

### Certificate 2: EcoRegistry TC
```
token_id:           0.0.7642495
name:               "EcoRegistry Tokenization Certificate"
symbol:             "ERTC"
memo:               "0.0.7642494"          ← Hedera account/topic ID
type:               NON_FUNGIBLE_UNIQUE
supply_type:        INFINITE
max_supply:         0
total_supply:       12
decimals:           0
created_timestamp:  1732619388.654837000   (2024-11-26)
admin_key:          null
freeze_key:         null
wipe_key:           null
supply_key:         ED25519 6daa826b...
pause_key:          null
pause_status:       NOT_APPLICABLE
auto_renew_account: 0.0.6138881
```

### Certificate 3: Verra TC
```
token_id:           0.0.7642516
name:               "Verra Tokenization Certificate"
symbol:             "VTC"
memo:               "0.0.7642515"          ← Hedera account/topic ID
type:               NON_FUNGIBLE_UNIQUE
supply_type:        INFINITE
max_supply:         0
total_supply:       11
decimals:           0
created_timestamp:  1732619682.493067081   (2024-11-26)
admin_key:          ED25519 aeaa793f...    ← HAS admin key
freeze_key:         null
wipe_key:           ED25519 9be88515...
supply_key:         ED25519 8ff79514...
pause_key:          null
pause_status:       NOT_APPLICABLE
auto_renew_account: 0.0.6138881
```

### Certificate 4: Global C-Sink Registry TC
```
token_id:           0.0.8090690
name:               "Global C-Sink Registry Tokenization Certificate"
symbol:             "GCSR-TC"
memo:               "0.0.8090689"          ← Hedera account/topic ID
type:               NON_FUNGIBLE_UNIQUE
supply_type:        INFINITE
max_supply:         0
total_supply:       8
decimals:           0
created_timestamp:  1736888618.785317789   (2025-01-14)
admin_key:          ED25519 5e87a410...    ← HAS admin key
freeze_key:         null
wipe_key:           ED25519 1ec013cd...
supply_key:         ED25519 22fe4d92...
pause_key:          null
pause_status:       NOT_APPLICABLE
auto_renew_account: 0.0.6138881
```

### Certificate 5: Smoke Test TC (v2)
```
token_id:           0.0.8492081
name:               "Tolam Smoke Test Registry Tokenization Certificate"
symbol:             "SMKTST-TC"
memo:               "0.0.8492080"          ← Hedera account/topic ID
type:               NON_FUNGIBLE_UNIQUE
supply_type:        INFINITE
max_supply:         0
total_supply:       0                      ← No certificates minted yet
decimals:           0
created_timestamp:  1741988049.413825000   (2025-03-14)
admin_key:          null
freeze_key:         null
wipe_key:           null
supply_key:         ED25519 63abf25b...
pause_key:          null
pause_status:       NOT_APPLICABLE
auto_renew_account: 0.0.6138881
```

---

## NFT SERIAL METADATA — IPFS Content (Assets)

Each asset NFT serial has metadata = base64-encoded IPFS CID (Qm... hash). The IPFS JSON follows this exact schema:

### Verra (VRA) Example — Token 0.0.8315181, Serial 201
```json
{
  "name": "829400837",
  "description": "This token instance represents 1 tCO2e.",
  "image": "",
  "type": "",
  "properties": {
    "registryOfOrigin": "verra",
    "registryProjectId": "VCS4018",
    "registryProjectName": "CO2 UTILIZATION IN CONCRETE - Removals & Reductions - CarbonCure - U.S & Canada. Project #1",
    "monitoringPeriodStartDate": "2022-01-01T00:00:00Z",
    "monitoringPeriodEndDate": "2022-12-31T00:00:00Z",
    "trustChainHook": "1740003391.683668000"
  }
}
```

### Verra (VRA) Example — Token 0.0.8315201, Serial 6109 (Singapore project)
```json
{
  "name": "829459594",
  "description": "This token instance represents 1 tCO2e.",
  "image": "",
  "type": "",
  "properties": {
    "registryOfOrigin": "verra",
    "registryProjectId": "VCS4019",
    "registryProjectName": "CO2 UTILIZATION IN CONCRETE - REMOVALS & REDUCTIONS – CarbonCure – Asia #1",
    "monitoringPeriodStartDate": "2022-01-03T00:00:00Z",
    "monitoringPeriodEndDate": "2022-12-31T00:00:00Z",
    "trustChainHook": "1740006007.523527000"
  }
}
```

### GCSR Example — Token 0.0.8351104, Serial 12000
```json
{
  "name": "11814",
  "description": "This token instance represents 1 tCO2e.",
  "image": "",
  "type": "",
  "properties": {
    "registryOfOrigin": "global-c-sink-registry",
    "registryProjectId": "GCSP1024",
    "registryProjectName": "Carboneers SRC India",
    "monitoringPeriodStartDate": "2024-11-16T00:00:00Z",
    "monitoringPeriodEndDate": "2024-12-31T00:00:00Z",
    "trustChainHook": "1740512370.350359703"
  }
}
```

### GCSR Example — Token 0.0.8113653, Serial 1
```json
{
  "name": "1",
  "description": "This token instance represents 1 tCO2e.",
  "image": "",
  "type": "",
  "properties": {
    "registryOfOrigin": "global-c-sink-registry",
    "registryProjectId": "GCSP1024",
    "registryProjectName": "Carboneers SRC India",
    "monitoringPeriodStartDate": "2024-01-01T00:00:00Z",
    "monitoringPeriodEndDate": "2024-12-31T00:00:00Z",
    "trustChainHook": "1737146749.826086000"
  }
}
```

### EcoRegistry (ERA) Example — Token 0.0.8357484, Serial 10000
```json
{
  "name": "2023-08-17T14:35:36.000Z",
  "description": "This token instance represents 1 tCO2e.",
  "image": "",
  "type": "",
  "properties": {
    "registryOfOrigin": "ecoregistry",
    "registryProjectId": "153",
    "registryProjectName": "Carbono Verde Afforestation Project",
    "monitoringPeriodStartDate": "2020-01-01T00:00:00.000Z",
    "monitoringPeriodEndDate": "2020-12-31T00:00:00.000Z",
    "trustChainHook": "1740609262.465079000"
  }
}
```

### Smoke Test Example — Token 0.0.8182455, Serial 11
```json
{
  "name": "9",
  "description": "This token instance represents 1 tCO2e.",
  "image": "",
  "type": "",
  "properties": {
    "registryOfOrigin": "smoke-test",
    "registryProjectId": "Smoke_Test-3449",
    "registryProjectName": "Smoke_Test-GS1247 VPA 16 Improved Kitchen Regimes: Mwogo (Bugesera), Rwanda",
    "monitoringPeriodStartDate": "2017-11-01T00:00:00Z",
    "monitoringPeriodEndDate": "2018-10-31T00:00:00Z",
    "trustChainHook": "1738018667.666433729"
  }
}
```

### Smoke Test Example — Token 0.0.7821560, Serial 1000
```json
{
  "name": "967",
  "description": "This token instance represents 1 tCO2e.",
  "image": "",
  "type": "",
  "properties": {
    "registryOfOrigin": "smoke-test",
    "registryProjectId": "Smoke_Test-11309",
    "registryProjectName": "Smoke_Test-GS10818 - Dissemination of Improved Cookstoves in India by Greenway - Dissemination of Improved Cookstoves in Karnataka by Greenway - VPA004",
    "monitoringPeriodStartDate": "2020-05-14T00:00:00Z",
    "monitoringPeriodEndDate": "2022-04-28T00:00:00Z",
    "trustChainHook": "1748532421.057891076"
  }
}
```

---

## NFT SERIAL METADATA — Certificates

Certificate NFT metadata = base64-encoded Hedera consensus timestamp (NOT IPFS CIDs).

Format: `{seconds}.{nanoseconds}` — this is a Hedera transaction timestamp, likely the `trustChainHook` of the corresponding tokenization transaction.

### Examples
| Certificate Token | Serial | Decoded Metadata | UTC Datetime |
|-------------------|--------|------------------|--------------|
| VTC (0.0.7642516) | 11 | `1740007217.169224000` | 2025-02-19T23:20:17Z |
| VTC (0.0.7642516) | 10 | `1740007058.753371000` | 2025-02-19T23:17:38Z |
| ERTC (0.0.7642495) | 12 | `1740614119.774156000` | 2025-02-26T23:55:19Z |
| ERTC (0.0.7642495) | 11 | `1740613570.655501000` | 2025-02-26T23:46:10Z |
| GCSR-TC (0.0.8090690) | 8 | `1740531347.729306000` | 2025-02-26T00:55:47Z |
| GCSR-TC (0.0.8090690) | 7 | `1740530663.779138000` | 2025-02-26T00:44:23Z |
| SMKTST-TC (0.0.7642468) | 6 | `1748532421.057891076` | 2025-05-29T14:47:01Z |
| SMKTST-TC (0.0.7642468) | 5 | `1738018667.666433729` | 2025-01-27T20:37:47Z |

---

## PARSER-CRITICAL PATTERNS

### 1. Token Name Patterns (4 distinct registries)

| Registry | Name Pattern | Example |
|----------|-------------|---------|
| **Verra** | `"VRA - VCS-VCU-{methodology}-VER-{country}-{field5}-{projectId}-{startDDMMYYYY}-{endDDMMYYYY}-{field9}"` | `"VRA - VCS-VCU-466-VER-US-4-4018-01012022-31122022-0"` |
| **EcoRegistry** | `"ERA - CDC_{projectId}_{f1}_{f2}_{f3}_{f4}_{f5}_XX_{country}_{f6}_{f7}_{year}"` | `"ERA - CDC_153_19_1_332_14_R1_XX_BR_1_1_2020"` |
| **Global C-Sink** | `"GCSR - {projectId}.{startUnix}.{endUnix}"` | `"GCSR - GCSP1024.1704067200.1735603200"` |
| **Smoke Test** | `"TOLAM SMOKE TEST REGISTRY - Smoke_Test-{projectId}.{startUnix}.{endUnix}"` | `"TOLAM SMOKE TEST REGISTRY - Smoke_Test-11309.1589414400.1651104000"` |
| **EcoRegistry (v1)** | `"EcoRegistry Asset"` (generic, no serial info) | Only token 0.0.6144590, supply=0 |

### 2. Symbol Patterns

| Registry | Symbol Pattern | Example |
|----------|---------------|---------|
| **Verra** | `"VCS-VCU-{methodology}-VER-{country}-{field}-{projectId}-{startDDMMYYYY}-{endDDMMYYYY}-{trailing}"` | `"VCS-VCU-466-VER-SG-4-4019-03012022-31122022-0"` |
| **EcoRegistry** | `"CDC_{projectId}_{...}_{country}_{...}_{year}"` | `"CDC_153_19_1_332_14_R1_XX_BR_1_1_2022"` |
| **Global C-Sink** | `"{projectId}.{startUnix}.{endUnix}"` | `"GCSP1024.1731715200.1735603200"` |
| **Smoke Test** | `"Smoke_Test-{projectId}.{startUnix}.{endUnix}"` | `"Smoke_Test-3449.1509494400.1540944000"` |
| **EcoRegistry (v1)** | `"ERA"` | Generic |

### 3. Verra VCU Symbol Decomposition
```
VCS-VCU-{methodology}-VER-{countryISO2}-{unknownInt}-{projectId}-{startDDMMYYYY}-{endDDMMYYYY}-{subIndex}
```
- `VCS` = Verified Carbon Standard (registry)
- `VCU` = Verified Carbon Unit (unit type)
- `{methodology}` = VCS methodology number (466, 576)
- `VER` = verified (standard designation)
- `{countryISO2}` = ISO 3166-1 alpha-2 country code (US, MX, SG)
- `{unknownInt}` = possibly issuance/batch sequence (1, 4, 6)
- `{projectId}` = VCS project number (1041, 3207, 4018, 4019)
- `{startDDMMYYYY}` = vintage start date, format DDMMYYYY
- `{endDDMMYYYY}` = vintage end date, format DDMMYYYY
- `{subIndex}` = always `0` in observed data

### 4. EcoRegistry CDC Symbol Decomposition
```
CDC_{projectId}_{f1}_{f2}_{f3}_{f4}_{roundCode}_{XX}_{countryISO2}_{f5}_{f6}_{vintageYear}
```
- `CDC` = Certificado de Carbono (EcoRegistry's unit type)
- `{projectId}` = EcoRegistry project ID (109, 153)
- Fields f1-f4: unknown numeric fields (possibly methodology, standard, scope identifiers)
- `{roundCode}` = R-prefixed code (R1, R6) — possibly verification round
- `XX` = constant placeholder
- `{countryISO2}` = ISO country code (CO=Colombia, BR=Brazil)
- `{vintageYear}` = year of vintage (2020, 2021, 2022)

### 5. GCSR Symbol Decomposition
```
{projectId}.{startTimestampUnix}.{endTimestampUnix}
```
- Timestamps are Unix epoch seconds (not Hedera timestamps)
- Maps directly to monitoring period dates

### 6. IPFS Metadata Schema (Consistent Across ALL Registries)
```typescript
interface TolAmNFTMetadata {
  name: string;           // Varies by registry (see below)
  description: string;    // Always "This token instance represents 1 tCO2e."
  image: string;          // Always empty string ""
  type: string;           // Always empty string ""
  properties: {
    registryOfOrigin: "verra" | "ecoregistry" | "global-c-sink-registry" | "smoke-test";
    registryProjectId: string;    // "VCS4018", "153", "GCSP1024", "Smoke_Test-3449"
    registryProjectName: string;  // Full project name
    monitoringPeriodStartDate: string;  // ISO 8601 datetime
    monitoringPeriodEndDate: string;    // ISO 8601 datetime
    trustChainHook: string;             // Hedera consensus timestamp "{seconds}.{nanoseconds}"
  }
}
```

### 7. `name` Field in IPFS Metadata (Per-Registry Patterns)

| Registry | `name` value | Meaning |
|----------|-------------|---------|
| **Verra** | `"829400837"` | Verra serial number (large integer as string) |
| **EcoRegistry** | `"2023-08-17T14:35:36.000Z"` | ISO timestamp (possibly issuance/retirement date?) |
| **Global C-Sink** | `"11814"`, `"1"` | Sequential credit number within project |
| **Smoke Test** | `"967"`, `"9"` | Sequential credit number |

### 8. Memo Field Pattern

| Treasury | Token Type | Memo | Meaning |
|----------|-----------|------|---------|
| Assets (v1 only) | EcoRegistry Asset (0.0.6144590) | `"0.0.6144588"` | Hedera entity ID — likely a Topic or Account |
| Assets (all others) | VRA, ERA, GCSR, Smoke Test | `""` | Empty |
| Certificates (all) | All TCs | `"0.0.{id}"` where id = token_id - 1 or - 2 | Always populated. References a Hedera entity (likely HCS Topic for trust chain) |

Certificate memo pattern — the memo always contains a Hedera account/topic ID that is numerically close to (but not equal to) the token_id:
- Token 0.0.7642468 → memo "0.0.7642466" (delta -2)
- Token 0.0.7642495 → memo "0.0.7642494" (delta -1)
- Token 0.0.7642516 → memo "0.0.7642515" (delta -1)
- Token 0.0.8090690 → memo "0.0.8090689" (delta -1)
- Token 0.0.8492081 → memo "0.0.8492080" (delta -1)

### 9. Key Configuration Patterns

| Property | Assets (v1/ERA) | Assets (production) | Certificates |
|----------|-----------------|---------------------|--------------|
| admin_key | Present (1 token) | **null** | Present on VTC + GCSR-TC only |
| freeze_key | Present | Present | **null** |
| kyc_key | null | null | null |
| wipe_key | Present | Present | Present on VTC + GCSR-TC only |
| supply_key | Present | Present | Present (all) |
| pause_key | null (v1) | Present | **null** |
| supply_type | INFINITE (v1) | **FINITE** | **INFINITE** |
| max_supply | 0 (v1) | 5,933 — 1,031,207 | 0 |

Key insight: Production asset tokens are **FINITE supply with no admin_key** — immutable token definitions. Certificate tokens are **INFINITE supply** (can mint unlimited certificates). Asset tokens have freeze + pause keys for compliance; certificates have minimal keys (just supply_key, sometimes wipe_key).

### 10. Assets vs. Certificates Relationship

- **1 asset token = 1 project + 1 vintage/monitoring period**. Each NFT serial within = 1 tCO2e.
- **1 certificate token = 1 registry**. Each NFT serial = 1 tokenization event (batch mint receipt).
- Certificate NFT metadata = Hedera consensus timestamp of the tokenization transaction.
- Certificate memo = Hedera Topic ID for the trust chain log.
- `trustChainHook` in IPFS metadata links asset NFTs back to the Hedera consensus layer.

### 11. Geographic Data

**No direct coordinates/GeoJSON in any token or NFT metadata.**

Geographic information available only through:
- Country code in Verra symbols: `VER-{country}` (US, MX, SG)
- Country code in EcoRegistry symbols: `..._XX_{country}_...` (CO, BR)
- Country in IPFS `registryProjectName`: "India", "Rwanda", "U.S & Canada", "Asia"
- No geographic data in GCSR or Smoke Test token-level fields (must look up project)

### 12. Account 0.0.8224139

All production asset NFTs (VRA, GCSR, ERA) were transferred to account `0.0.8224139`. This appears to be a Tolam marketplace/distribution account. Smoke test NFTs went to `0.0.3239778` and `0.0.2156915`.

### 13. trustChainHook Pattern

The `trustChainHook` in IPFS metadata is a Hedera consensus timestamp. Multiple NFTs within the same token share the same `trustChainHook` (e.g., serials 200 and 201 of 0.0.8315181 both reference `1740003391.683668000`). This suggests the hook points to the batch mint transaction, not individual serial mints.

---

## SUMMARY TABLE — All Tokens

| # | token_id | Registry | Name/Symbol Key | Supply | Max | Country |
|---|----------|----------|----------------|--------|-----|---------|
| 1 | 0.0.6144590 | EcoRegistry | ERA (generic, v1) | 0 | 0 | — |
| 2 | 0.0.7821560 | Smoke Test | ST-11309 | 1,000 | 36,756 | India |
| 3 | 0.0.7851603 | EcoRegistry | CDC-109 (CO, 2021) | 0 | 26,873 | CO |
| 4 | 0.0.8112020 | Verra | VCU-576 (MX, 2020) | 1 | 230,496 | MX |
| 5 | 0.0.8113653 | GCSR | GCSP1024 (2024 full) | 1 | 75,446 | India |
| 6 | 0.0.8182455 | Smoke Test | ST-3449 | 11 | 8,630 | Rwanda |
| 7 | 0.0.8315181 | Verra | VCU-466 (US, 4018, 2022) | 201 | 24,468 | US |
| 8 | 0.0.8315201 | Verra | VCU-466 (SG, 4019, 2022) | 6,109 | 8,750 | SG |
| 9 | 0.0.8315235 | Verra | VCU-466 (US, 3207, 2023) | 3,902 | 32,027 | US |
| 10 | 0.0.8351104 | GCSR | GCSP1024 (Nov-Dec 2024) | 12,000 | 12,000 | India |
| 11 | 0.0.8351309 | GCSR | GCSP1024 (2025 full) | 6,628 | 8,628 | India |
| 12 | 0.0.8351944 | GCSR | GCSP1024 (Oct-Nov 2024) | 3,933 | 5,933 | India |
| 13 | 0.0.8357484 | EcoRegistry | CDC-153 (BR, 2020) | 10,000 | 919,867 | BR |
| 14 | 0.0.8357578 | EcoRegistry | CDC-153 (BR, 2021) | 10,000 | 1,031,206 | BR |
| 15 | 0.0.8357599 | EcoRegistry | CDC-153 (BR, 2022) | 10,000 | 1,031,207 | BR |

| # | token_id | Type | Name | Supply | Memo (Topic) |
|---|----------|------|------|--------|-------------|
| C1 | 0.0.7642468 | Smoke Test TC | SMKTST-TC | 6 | 0.0.7642466 |
| C2 | 0.0.7642495 | EcoRegistry TC | ERTC | 12 | 0.0.7642494 |
| C3 | 0.0.7642516 | Verra TC | VTC | 11 | 0.0.7642515 |
| C4 | 0.0.8090690 | GCSR TC | GCSR-TC | 8 | 0.0.8090689 |
| C5 | 0.0.8492081 | Smoke Test TC (v2) | SMKTST-TC | 0 | 0.0.8492080 |
