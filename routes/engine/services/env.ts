/**
 * env.ts — first-token env loader for the EARN engine.
 *
 * Loads the repo-root `.env` via a first-token parse (KEY=VALUE on the first `=`;
 * everything after a `#` that is NOT inside the value is a comment; the value is taken
 * up to the first ` #` inline-comment, trimmed). Override the location with the
 * `ROUTES_ENV_PATH` environment variable. Real process env always wins over the file.
 *
 * HARD RULE: never print secrets. `dumpSafe()` only ever returns names + booleans.
 */
import { readFileSync, existsSync } from "node:fs";

// Default to a repo-local `.env` (engine/.env), overridable via ROUTES_ENV_PATH.
const ENV_PATH = process.env.ROUTES_ENV_PATH ?? new URL("../.env", import.meta.url).pathname;

let _cache: Record<string, string> | null = null;

/** Parse the env file once. First `=` splits key/value; strips an inline ` #...` comment. */
export function loadEnv(path: string = ENV_PATH): Record<string, string> {
  if (_cache) return _cache;
  const out: Record<string, string> = {};
  // Real process env wins (so CI / shell exports can override the file).
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === "string") out[k] = v;
  }
  if (existsSync(path)) {
    const raw = readFileSync(path, "utf-8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1);
      // strip an inline comment that begins with whitespace+#  (preserve '#' inside values like urls)
      const hashIdx = val.indexOf(" #");
      if (hashIdx >= 0) val = val.slice(0, hashIdx);
      val = val.trim().replace(/^["']|["']$/g, "");
      // Only fill from file if not already provided by the real environment.
      if (!(key in out) || out[key] === "") out[key] = val;
    }
  }
  _cache = out;
  return out;
}

export function getEnv(key: string, fallback?: string): string {
  const env = loadEnv();
  const v = env[key];
  if (v === undefined || v === "") {
    if (fallback !== undefined) return fallback;
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

export function getEnvOptional(key: string): string | undefined {
  const env = loadEnv();
  const v = env[key];
  return v === undefined || v === "" ? undefined : v;
}

/** Resolved EARN-engine config. Non-secret fields only are safe to log. */
export interface RoutesEnv {
  slabclawApiUrl: string;
  nemotronBaseUrl: string;
  nemotronModel: string;
  nemotronHeavyModel: string;
  openrouterFallbackModel: string;
  hasNvidiaKey: boolean;
  hasOpenrouterKey: boolean;
}

export function resolveRoutesEnv(): RoutesEnv {
  return {
    slabclawApiUrl: getEnv("SLABCLAW_API_URL", "https://api.slabclaw.com"),
    nemotronBaseUrl: getEnv("NEMOTRON_BASE_URL", "https://integrate.api.nvidia.com/v1"),
    nemotronModel: getEnv("NEMOTRON_MODEL", "nvidia/nemotron-3-super-120b-a12b"),
    nemotronHeavyModel: getEnv("NEMOTRON_HEAVY_MODEL", "nvidia/nemotron-3-ultra-550b-a55b"),
    openrouterFallbackModel: "nousresearch/hermes-4-405b",
    hasNvidiaKey: !!getEnvOptional("NVIDIA_API_KEY"),
    hasOpenrouterKey: !!getEnvOptional("OPENROUTER_API_KEY"),
  };
}

/** Never returns a secret value — only presence booleans + non-secret config. */
export function dumpSafe(): Record<string, string | boolean> {
  const e = resolveRoutesEnv();
  return {
    SLABCLAW_API_URL: e.slabclawApiUrl,
    NEMOTRON_BASE_URL: e.nemotronBaseUrl,
    NEMOTRON_MODEL: e.nemotronModel,
    NEMOTRON_HEAVY_MODEL: e.nemotronHeavyModel,
    NVIDIA_API_KEY_present: e.hasNvidiaKey,
    OPENROUTER_API_KEY_present: e.hasOpenrouterKey,
  };
}
