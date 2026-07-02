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
