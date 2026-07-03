# Debug Log

### 2026-03-30 — AgentAvatarCompactSVG crash on invalid agentType
**Symptom:** App crashes with "Cannot read properties of undefined (reading 'primary')" when opening bioregion Actors tab
**Root cause:** owockibot had `agentType: 'COORDINATION'` which doesn't exist in `TYPE_PALETTES` map
**Fix:** Changed to `agentType: 'SOCIAL'` which is a valid key in the palette
**Mechanism:** `TYPE_PALETTES[agentType]` returned undefined, then `.primary` threw

### 2026-03-30 — Actors accordion crash on null org name
**Symptom:** "name.toLowerCase is not a function" when clicking Actors section
**Root cause:** Some orgs from Supabase have null/undefined `name` field
**Fix:** Guard with `(o.name || '').toLowerCase()` in search filter
**Mechanism:** Supabase returns records with null names; `.toLowerCase()` fails on null

### 2026-03-30 — Map disappears after adding .env
**Symptom:** Map blank after adding Supabase credentials to .env
**Root cause:** Missing `VITE_MAPBOX_ACCESS_TOKEN` — the ecospatial .env had it but it wasn't copied
**Fix:** Added Mapbox token from ecospatial's .env to ra-april-26's .env
**Mechanism:** MapBox component requires the token; falls through silently without it

### 2026-03-30 — OrgBioregionCard kills bioregion header
**Symptom:** Clicking org replaces entire panel including bioregion header/tabs
**Root cause:** Rendered OrgBioregionCard as panel replacement in Explore.tsx ternary chain (same level as AssetBioregionCard)
**Fix:** (Initially) moved inside BioregionPanel. (2026-03-31) Refactored all entity details to Explore.tsx level with breadcrumb nav — matches asset pattern now.
**Mechanism:** Explore.tsx state machine: bioregion+entity → detail card with breadcrumb, bioregion alone → BioregionPanel

### 2026-03-31 — Panel expand arrow renders over Legal modal
**Symptom:** The ">" expand/collapse button floats on top of the Legal modal overlay
**Root cause:** Expand button had `z-[60]`, legal modal overlay had `z-50`
**Fix:** Lowered expand button to `z-40` in Explore.tsx
**Mechanism:** Fixed positioning with z-index higher than modal's backdrop meant it punched through

### 2026-07-02 — Synthetic economy: EUDR full confirmation structurally unreachable
**Symptom:** Institutional-policy stress test (`sim/policyStressTest.mjs`) showed solver-5 declining and solver-4 repricing 100% of the 1,250-lot synthetic economy — completely flat, no lot-to-lot variation.
**Root cause:** `economy.mjs`'s lot generator hardcoded `dds_ref: null` for every synthetic lot, while the other 3 EUDR fields varied — `eudrUnverifiedFraction()` requires all 4 fields present to reach 0, so no SIM lot could ever be fully confirmed.
**Fix:** Tied `dds_ref` to the same `eudrReady` flag as `legality_evidence` in `economy.mjs` (a DDS reference only exists once the legality chain it documents does).
**Mechanism:** Post-fix, decline/reprice rates settled at ~80% with real per-lot variation, matching the expected `P(eudrReady) × P(harvest_window)` probability — caught by actually running the stress test against real data instead of assuming the mechanism worked.

### 2026-07-02 — Aqueduct lot markers rendered underneath route/network markers
**Symptom:** Chips/lot markers on the map could be visually covered by the network layer's route lines, hub dots, and venue markers when they overlapped.
**Root cause:** `AqueductLotsLayer` (lot markers) mounted before `AqueductNetworkLayer` (routes/hubs/venues) in `Explore.tsx`; react-map-gl `Marker`s carry no z-index, so later-mounted markers paint on top in DOM order.
**Fix:** Reordered so `AqueductNetworkLayer` mounts first and `AqueductLotsLayer` mounts last in `Explore.tsx`.
**Mechanism:** With no z-index available on `.mapboxgl-marker`, mount order in the parent JSX is the only lever for guaranteeing one marker set stacks above another.

## 2026-07-02 — coop seat: crash on "Publish sell intent"
- **Symptom:** pageerror `Cannot read properties of undefined (reading 'eudr')` when running the solver race from the coop seat; race panel never rendered.
- **Root cause:** cross-session interface drift — a parallel session evolved `runSolverRace({fobEurPerKg, weightKg})` to `runSolverRace({lot, fobEurPerKg, weightKg})` (per-solver institutional policies read `lot.eudr`/`lot.quality`); the coop seat call predated the new signature, so policy conditions dereferenced `undefined`.
- **Fix:** coop seat builds an aggregate lot judged by its WEAKEST constituent (min SCA, AND of EUDR fields) and passes it — a risk desk declines on the worst lot in a pool, not the average.
- **Mechanism/lesson:** shared sim modules are a cross-session API surface; after any parallel-session pull, smoke-test every call site of changed exports (`grep -rn "runSolverRace("`) before walking the UI.
