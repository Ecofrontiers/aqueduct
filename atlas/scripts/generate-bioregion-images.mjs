#!/usr/bin/env node
/**
 * Generate landscape hero images for all bioregions using Replicate FLUX 1.1 Pro.
 *
 * Usage:
 *   node scripts/generate-bioregion-images.mjs           # generate all missing
 *   node scripts/generate-bioregion-images.mjs --force   # regenerate all
 *   node scripts/generate-bioregion-images.mjs PA20      # generate specific code
 *
 * Images saved to: public/images/bioregions/{CODE}.webp
 * Cost: ~$0.04 per image (FLUX 1.1 Pro)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GEOJSON_PATH = path.join(ROOT, "public/geojson/bioregions.geojson");
const OUTPUT_DIR = path.join(ROOT, "public/images/bioregions");

const API_TOKEN = process.env.REPLICATE_API_TOKEN;
const MODEL = "black-forest-labs/flux-1.1-pro";
const CONCURRENCY = 4;
const POLL_INTERVAL = 2000;
const MAX_POLLS = 60;

// ── Realm-specific prompt hints for more accurate landscapes ──
const REALM_HINTS = {
  // Terrestrial realms
  Antarctic: "icy glaciers, snow-covered terrain, polar landscape, aurora, frozen seas",
  Afrotropics: "African savanna, tropical vegetation, warm earth tones, baobab trees",
  Australasia: "Australian outback, eucalyptus forests, coral reefs, unique terrain",
  Indomalaya: "tropical rainforest, monsoon landscape, lush green valleys, misty mountains",
  Nearctic: "North American wilderness, boreal forests, mountain ranges, temperate landscapes",
  Neotropics: "South American rainforest, Andes mountains, Amazon basin, tropical biodiversity",
  Oceania: "Pacific islands, coral atolls, turquoise waters, volcanic islands, tropical beaches",
  Palearctic: "European mixed forests, Mediterranean coast, Eurasian steppe, mountain valleys",
  // Marine realms (MEOW provinces)
  Arctic: "arctic ocean, sea ice, polar waters, northern lights reflected on dark ocean, icebergs",
  "Temperate Northern Atlantic": "deep blue Atlantic ocean, rocky coastline, North Sea waves, kelp forests underwater",
  "Temperate Northern Pacific": "Pacific northwest coastline, cold blue waters, sea stacks, fog over ocean",
  "Tropical Atlantic": "turquoise Caribbean waters, coral reefs, tropical ocean, white sand beneath clear water",
  "Western Indo-Pacific": "Indian Ocean, coral reef systems, mangrove coastline, warm tropical waters",
  "Central Indo-Pacific": "Coral Triangle, vibrant reef systems, tropical archipelago waters, deep blue ocean",
  "Eastern Indo-Pacific": "Pacific island waters, deep ocean blue, volcanic island coastline, reef formations",
  "Tropical Eastern Pacific": "warm Pacific waters, Galapagos-style volcanic coast, deep blue tropical ocean",
  "Temperate South America": "Patagonian coast, cold southern ocean, dramatic cliffs meeting the sea",
  "Temperate Southern Africa": "South African coastline, Agulhas current, dramatic ocean meeting rocky shore",
  "Temperate Australasia": "Great Australian Bight, Southern Ocean meeting coast, kelp forests",
  "Southern Ocean": "Antarctic waters, icebergs floating in deep blue ocean, southern aurora, pack ice",
};

function buildPrompt(name, realmName) {
  const hint = REALM_HINTS[realmName] || "natural landscape";
  return [
    `Breathtaking wide-angle landscape photograph of ${name}.`,
    `${hint}.`,
    "Golden hour dramatic lighting, pristine untouched nature, high detail.",
    "Professional nature photography, National Geographic style.",
    "No text, no people, no buildings, no watermarks.",
  ].join(" ");
}

async function createPrediction(prompt) {
  const res = await fetch(
    `https://api.replicate.com/v1/models/${MODEL}/predictions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: "16:9",
          output_format: "webp",
          output_quality: 85,
          safety_tolerance: 5,
        },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Create prediction failed (${res.status}): ${text}`);
  }
  return res.json();
}

async function pollPrediction(id) {
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${API_TOKEN}` },
    });
    const data = await res.json();
    if (data.status === "succeeded") return data.output;
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(`Prediction ${id} ${data.status}: ${data.error || "unknown"}`);
    }
  }
  throw new Error(`Prediction ${id} timed out after ${MAX_POLLS * POLL_INTERVAL / 1000}s`);
}

async function downloadImage(url, filepath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(filepath, buffer);
}

async function generateOne(code, name, realmName) {
  const outPath = path.join(OUTPUT_DIR, `${code}.webp`);
  const prompt = buildPrompt(name, realmName);

  console.log(`  [${code}] Generating: ${name}`);
  const prediction = await createPrediction(prompt);
  const output = await pollPrediction(prediction.id);

  // output is a URL string for flux models
  const imageUrl = typeof output === "string" ? output : output?.[0] || output;
  await downloadImage(imageUrl, outPath);
  const size = (fs.statSync(outPath).size / 1024).toFixed(0);
  console.log(`  [${code}] Saved (${size} KB)`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const specificCode = args.find((a) => !a.startsWith("--"));

  // Load bioregion data
  const geojson = JSON.parse(fs.readFileSync(GEOJSON_PATH, "utf-8"));
  let features = geojson.features.map((f) => ({
    code: f.properties.code,
    name: f.properties.name,
    realm_name: f.properties.realm_name,
  }));

  if (specificCode) {
    features = features.filter((f) => f.code === specificCode);
    if (features.length === 0) {
      console.error(`No bioregion found with code: ${specificCode}`);
      process.exit(1);
    }
  }

  // Skip already generated (unless --force)
  if (!force) {
    const before = features.length;
    features = features.filter(
      (f) => !fs.existsSync(path.join(OUTPUT_DIR, `${f.code}.webp`))
    );
    if (before !== features.length) {
      console.log(`Skipping ${before - features.length} already generated (use --force to redo)`);
    }
  }

  if (features.length === 0) {
    console.log("All images already generated.");
    return;
  }

  const cost = (features.length * 0.04).toFixed(2);
  console.log(`\nGenerating ${features.length} bioregion images (~$${cost} at $0.04/image)\n`);

  // Process in batches with concurrency limit
  let completed = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < features.length; i += CONCURRENCY) {
    const batch = features.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map((f) => generateOne(f.code, f.name, f.realm_name))
    );

    for (const [idx, result] of results.entries()) {
      if (result.status === "fulfilled") {
        completed++;
      } else {
        failed++;
        const code = batch[idx].code;
        console.error(`  [${code}] FAILED: ${result.reason.message}`);
        errors.push({ code, error: result.reason.message });
      }
    }

    console.log(`  Progress: ${completed + failed}/${features.length} (${failed} failed)\n`);

    // Brief pause between batches to be nice to the API
    if (i + CONCURRENCY < features.length) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  console.log(`\nDone! ${completed} generated, ${failed} failed.`);
  if (errors.length > 0) {
    console.log("\nFailed bioregions:");
    for (const e of errors) console.log(`  ${e.code}: ${e.error}`);
    console.log("\nRetry with: node scripts/generate-bioregion-images.mjs");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
