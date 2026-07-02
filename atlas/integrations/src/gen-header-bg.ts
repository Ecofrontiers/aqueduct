#!/usr/bin/env npx tsx
/**
 * Generate RAEIS header background image via Replicate Flux
 * Usage: npx tsx src/gen-header-bg.ts
 */

import { writeFileSync } from "fs";
import { join } from "path";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN || "";
const OUTPUT = join(import.meta.dirname, "../../public/images/raeis-header-bg.webp");

async function main() {
  console.log("Generating header background via Replicate Flux...");

  // Create prediction
  const createRes = await fetch(
    "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          prompt:
            "Satellite view of Earth from low orbit at night, showing bioregions with lush green forests meeting rivers and coastlines, subtle aurora borealis glow, clouds parting to reveal terrain, environmental monitoring aesthetic, nature from above, rich deep blues and emerald greens, atmospheric haze, photorealistic, wide panoramic banner format, cinematic, no text, NASA Earth Observatory style",
          aspect_ratio: "21:9",
          num_outputs: 1,
          output_format: "webp",
          output_quality: 90,
        },
      }),
    }
  );

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Create failed: ${createRes.status} ${err}`);
  }

  const prediction = await createRes.json();
  console.log(`Prediction created: ${prediction.id}`);

  // Poll for completion
  let result = prediction;
  while (result.status !== "succeeded" && result.status !== "failed") {
    await new Promise((r) => setTimeout(r, 1000));
    const pollRes = await fetch(
      `https://api.replicate.com/v1/predictions/${prediction.id}`,
      { headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` } }
    );
    result = await pollRes.json();
    process.stdout.write(".");
  }
  console.log();

  if (result.status === "failed") {
    throw new Error(`Generation failed: ${result.error}`);
  }

  const imageUrl = result.output[0];
  console.log(`Image URL: ${imageUrl}`);

  // Download
  const imgRes = await fetch(imageUrl);
  const buf = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(OUTPUT, buf);
  console.log(`Saved to ${OUTPUT} (${(buf.length / 1024).toFixed(0)} KB)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
