/**
 * Replicate API client for generating agent profile images
 * Uses Flux Schnell model for fast, high-quality image generation
 *
 * In development, requests are proxied through Vite to avoid CORS issues.
 * In production, requests go directly to Replicate API (requires backend proxy).
 */

const REPLICATE_API_TOKEN = import.meta.env.VITE_REPLICATE_API_TOKEN || '';

// Use proxy in development to avoid CORS, direct API in production (requires backend)
const IS_DEV = import.meta.env.DEV;
const REPLICATE_API_BASE = IS_DEV ? '/replicate-api/v1' : 'https://api.replicate.com/v1';

// Flux Schnell model - fast and high quality
const MODEL_VERSION = 'black-forest-labs/flux-schnell';

export interface GenerationRequest {
  prompt: string;
  seed?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export interface PredictionResponse {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string[];
  error?: string;
}

// Cache for generated images (in-memory + IndexedDB)
// IndexedDB chosen over localStorage because base64 data URLs are ~100-200KB each
// and localStorage caps at ~5MB. IndexedDB gives us ~50MB+.
const imageCache = new Map<string, string>();

const DB_NAME = 'agent-pfp-cache';
const DB_STORE = 'images';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(DB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadCache() {
  try {
    // Migrate any existing localStorage data to IndexedDB
    const legacy = localStorage.getItem('agent-pfp-cache');
    if (legacy) {
      const parsed = JSON.parse(legacy);
      Object.entries(parsed).forEach(([key, value]) => {
        imageCache.set(key, value as string);
      });
      // Persist to IndexedDB then remove localStorage entry
      await saveCacheToIDB();
      localStorage.removeItem('agent-pfp-cache');
      return;
    }

    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readonly');
    const store = tx.objectStore(DB_STORE);
    const req = store.getAll();
    const keyReq = store.getAllKeys();
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => {
        const keys = keyReq.result as string[];
        const values = req.result as string[];
        keys.forEach((k, i) => imageCache.set(k, values[i]));
        resolve();
      };
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // Ignore cache errors
  }
}
loadCache();

async function saveCacheToIDB() {
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    const store = tx.objectStore(DB_STORE);
    for (const [key, value] of imageCache.entries()) {
      store.put(value, key);
    }
    await new Promise<void>((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
    db.close();
  } catch {
    // Ignore cache errors
  }
}

function saveCache() {
  saveCacheToIDB();
}

// Convert a remote image URL to a base64 data URL for persistent caching.
// Replicate output URLs are temporary — without this, cached URLs 404 and
// trigger re-generation on next visit, burning tokens.
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// Generate cache key from address and agent type
function getCacheKey(address: string, agentType: string): string {
  return `${address.toLowerCase()}-${agentType}`;
}

// Check if we have a cached image
export function getCachedImage(address: string, agentType: string): string | null {
  const key = getCacheKey(address, agentType);
  return imageCache.get(key) ?? null;
}

// Generate a prompt for the agent based on type
function generatePrompt(agentType: string, seed: number): string {
  const baseStyle = 'digital art portrait, sci-fi, glowing eyes, futuristic, clean background, high detail';

  const typePrompts: Record<string, string> = {
    MONITORING: `A sentient environmental sensor being, ${baseStyle}, green and blue color scheme, nature-tech hybrid, covered in small leaves and circuitry, wise ancient eyes`,
    ECONOMIC: `A financial AI entity, ${baseStyle}, gold and amber color scheme, geometric patterns, data streams flowing, confident expression, crystalline structure`,
    SOCIAL: `A community network spirit, ${baseStyle}, purple and pink color scheme, interconnected nodes floating around, warm friendly expression, holographic features`,
    SPECIALIST: `A scientific research android, ${baseStyle}, blue and silver color scheme, lens-like eyes, scanning patterns, precise analytical look, tool appendages`,
    REPRESENTATION: `A nature guardian spirit representing ecosystems, ${baseStyle}, earth tones and greens, animal features subtly blended, ancient and wise, forest elements`,
  };

  const prompt = typePrompts[agentType] || typePrompts.MONITORING;

  // Add seed-based variation
  const variations = ['ethereal glow', 'crystalline texture', 'organic patterns', 'geometric design', 'holographic shimmer'];
  const variation = variations[seed % variations.length];

  return `${prompt}, ${variation}`;
}

// Start a generation and wait for result
export async function generateAgentPFP(
  address: string,
  agentType: string,
  options?: { forceRegenerate?: boolean }
): Promise<string | null> {
  const key = getCacheKey(address, agentType);

  // Check cache first (unless force regenerate)
  if (!options?.forceRegenerate) {
    const cached = imageCache.get(key);
    if (cached) return cached;
  }

  // Generate deterministic seed from address
  const seed = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const prompt = generatePrompt(agentType, seed);

  try {
    // Build headers - in dev mode, the proxy adds auth; in prod we add it here
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Prefer': 'wait', // Wait for result instead of polling
    };
    if (!IS_DEV) {
      headers['Authorization'] = `Bearer ${REPLICATE_API_TOKEN}`;
    }

    // Start prediction
    const createResponse = await fetch(`${REPLICATE_API_BASE}/models/${MODEL_VERSION}/predictions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: {
          prompt,
          seed,
          aspect_ratio: '1:1',
          output_format: 'webp',
          output_quality: 80,
          num_outputs: 1,
        },
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      console.error('Replicate API error:', error);
      return null;
    }

    const prediction: PredictionResponse = await createResponse.json();

    if (prediction.status === 'succeeded' && prediction.output?.[0]) {
      const imageUrl = prediction.output[0];
      // Convert to data URL so cache survives URL expiration
      const persistedUrl = await toDataUrl(imageUrl) ?? imageUrl;
      imageCache.set(key, persistedUrl);
      saveCache();
      return persistedUrl;
    }

    // If not complete, poll for result
    if (prediction.status === 'starting' || prediction.status === 'processing') {
      return await pollPrediction(prediction.id, key);
    }

    console.error('Prediction failed:', prediction.error);
    return null;
  } catch (error) {
    console.error('Failed to generate agent PFP:', error);
    return null;
  }
}

// Poll for prediction result
async function pollPrediction(predictionId: string, cacheKey: string, maxAttempts = 30): Promise<string | null> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls

    try {
      const headers: Record<string, string> = {};
      if (!IS_DEV) {
        headers['Authorization'] = `Bearer ${REPLICATE_API_TOKEN}`;
      }

      const response = await fetch(`${REPLICATE_API_BASE}/predictions/${predictionId}`, {
        headers,
      });

      if (!response.ok) continue;

      const prediction: PredictionResponse = await response.json();

      if (prediction.status === 'succeeded' && prediction.output?.[0]) {
        const imageUrl = prediction.output[0];
        const persistedUrl = await toDataUrl(imageUrl) ?? imageUrl;
        imageCache.set(cacheKey, persistedUrl);
        saveCache();
        return persistedUrl;
      }

      if (prediction.status === 'failed' || prediction.status === 'canceled') {
        console.error('Prediction failed:', prediction.error);
        return null;
      }
    } catch (error) {
      console.error('Poll error:', error);
    }
  }

  console.error('Prediction timed out');
  return null;
}

// Clear cache for an address
export async function clearCachedImage(address: string, agentType: string): Promise<void> {
  const key = getCacheKey(address, agentType);
  imageCache.delete(key);
  try {
    const db = await openDB();
    const tx = db.transaction(DB_STORE, 'readwrite');
    tx.objectStore(DB_STORE).delete(key);
    await new Promise<void>((r) => { tx.oncomplete = () => r(); tx.onerror = () => r(); });
    db.close();
  } catch {
    // Ignore
  }
}

// Get all cached images
export function getAllCachedImages(): Map<string, string> {
  return new Map(imageCache);
}

// Hydrate in-memory cache from pre-generated static files
export async function hydrateFromPregenerated(): Promise<void> {
  try {
    const res = await fetch('/simulation/pfp-manifest.json');
    if (!res.ok) return;
    const manifest: Record<string, string> = await res.json();
    for (const [key, url] of Object.entries(manifest)) {
      if (!imageCache.has(key)) {
        imageCache.set(key, url);
      }
    }
  } catch {
    // Pre-generated manifest not available, skip
  }
}
