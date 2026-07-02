#!/usr/bin/env node
/**
 * Pre-generate Mapbox Static API minimap tiles for all known zones.
 * Saves as WebP images to public/simulation/minimaps/
 *
 * Usage: MAPBOX_TOKEN=pk.xxx node scripts/generate-minimap-tiles.js
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const TOKEN = process.env.MAPBOX_TOKEN || process.env.VITE_MAPBOX_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('Set MAPBOX_TOKEN or VITE_MAPBOX_ACCESS_TOKEN env var');
  process.exit(1);
}

const OUT_DIR = resolve(import.meta.dirname, '../public/simulation/minimaps');
mkdirSync(OUT_DIR, { recursive: true });

// All known zones + additional points of interest in the Camargue bioregion
const LOCATIONS = [
  { id: 'zone-7', label: 'Zone 7', lng: 4.55, lat: 43.52, zoom: 11 },
  { id: 'zone-12', label: 'Zone 12', lng: 4.68, lat: 43.48, zoom: 11 },
  { id: 'camargue', label: 'Camargue', lng: 4.63, lat: 43.5, zoom: 9 },
  { id: 'rhone-delta', label: 'Rhone Delta', lng: 4.63, lat: 43.5, zoom: 10 },
  { id: 'gulf-of-lion', label: 'Gulf of Lion', lng: 4.0, lat: 43.2, zoom: 9 },
  { id: 'posidonia', label: 'Posidonia Meadows', lng: 4.0, lat: 43.2, zoom: 10 },
  // Additional bioregion locations for variety
  { id: 'etang-vaccares', label: 'Etang de Vaccares', lng: 4.65, lat: 43.53, zoom: 12 },
  { id: 'salin-giraud', label: 'Salin-de-Giraud', lng: 4.73, lat: 43.42, zoom: 12 },
  { id: 'aigues-mortes', label: 'Aigues-Mortes', lng: 4.19, lat: 43.57, zoom: 12 },
  { id: 'arles', label: 'Arles', lng: 4.63, lat: 43.68, zoom: 12 },
  { id: 'fos-sur-mer', label: 'Fos-sur-Mer', lng: 4.94, lat: 43.43, zoom: 12 },
  { id: 'petite-camargue', label: 'Petite Camargue', lng: 4.15, lat: 43.55, zoom: 11 },
  { id: 'solar-camargue-7', label: 'SolarCamargue-7', lng: 4.58, lat: 43.55, zoom: 13 },
  { id: 'nesting-corridor', label: 'Nesting Corridor Z7-Z12', lng: 4.61, lat: 43.50, zoom: 11 },
  { id: 'peatland-basin', label: 'Peatland Basin', lng: 4.50, lat: 43.52, zoom: 12 },
];

const STYLE = 'mapbox/outdoors-v12';
const WIDTH = 224;
const HEIGHT = 160;

async function generateTile(loc) {
  const pin = `pin-s+d94a4a(${loc.lng},${loc.lat})`;
  const url = `https://api.mapbox.com/styles/v1/${STYLE}/static/${pin}/${loc.lng},${loc.lat},${loc.zoom},0/${WIDTH}x${HEIGHT}@2x?access_token=${TOKEN}&attribution=false&logo=false`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`  FAIL ${loc.id}: ${res.status} ${res.statusText}`);
      return false;
    }
    const buffer = Buffer.from(await res.arrayBuffer());
    const path = resolve(OUT_DIR, `${loc.id}.png`);
    writeFileSync(path, buffer);
    console.log(`  OK ${loc.id} (${buffer.length} bytes)`);
    return true;
  } catch (err) {
    console.error(`  FAIL ${loc.id}: ${err.message}`);
    return false;
  }
}

console.log(`Generating ${LOCATIONS.length} minimap tiles...`);
console.log(`Output: ${OUT_DIR}\n`);

let success = 0;
for (const loc of LOCATIONS) {
  const path = resolve(OUT_DIR, `${loc.id}.png`);
  if (existsSync(path)) {
    console.log(`  SKIP ${loc.id} (already exists)`);
    success++;
    continue;
  }
  if (await generateTile(loc)) success++;
  // Small delay to avoid rate limits
  await new Promise(r => setTimeout(r, 200));
}

// Generate an index JSON for the frontend to load
const index = LOCATIONS.map(l => ({
  id: l.id,
  label: l.label,
  lng: l.lng,
  lat: l.lat,
  src: `/simulation/minimaps/${l.id}.png`,
}));
writeFileSync(resolve(OUT_DIR, 'index.json'), JSON.stringify(index, null, 2));

console.log(`\nDone: ${success}/${LOCATIONS.length} tiles generated.`);
console.log(`Index: ${OUT_DIR}/index.json`);
