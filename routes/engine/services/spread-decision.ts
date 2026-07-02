/**
 * spread-decision.ts — the Nemotron BUY/SKIP BRAIN.
 *
 * Every spread the DETECTOR surfaces passes through a Nemotron buy/skip decision before any
 * USDC moves. This is the NVIDIA-load-bearing call: pull it → no decision, no autonomous earn.
 *
 * Model id (BINDING): `nvidia/nemotron-3-super-120b-a12b`
 * Endpoint: NVIDIA NIM, OpenAI-compatible /chat/completions at $NEMOTRON_BASE_URL
 *           (https://integrate.api.nvidia.com/v1), Authorization: Bearer $NVIDIA_API_KEY.
 *
 * DISCIPLINE (§5.2): the LLM does NOT recompute the arithmetic. `netSpreadUsd` is grounded by
 * spread-detector.ts; Nemotron judges whether the residual edge survives realistic
 * slippage / fee drag / liveness and returns a verdict + reason. The streamed reasoning
 * renders in Zone D as the on-camera "the NVIDIA model decided to earn" beat.
 *
 * If the model is unreachable (offline test / 403 / 404), we fall back to a DETERMINISTIC
 * guardrail verdict so the engine never blocks — and we mark `source: "fallback"` so the
 * demo writeup is honest about which rail answered.
 *
 * ZERO contract dependency.
 */
import { resolveRoutesEnv, getEnvOptional } from "./env.ts";
import type { Spread } from "./spread-detector.ts";

export type DecisionSource = "nemotron" | "fallback";

export interface BuySkip {
  verdict: "BUY" | "SKIP";
  reason: string; // human-readable; from reasoning_content when live, else deterministic
  netSpreadUsd: number; // echoed from the detector, NOT recomputed by the LLM
  flags: ("phantom" | "thin_liquidity" | "grade_mismatch" | "fee_drag" | "ok")[];
  source: DecisionSource;
  model: string;
}

const SYSTEM_PROMPT =
  "You are the BUY/SKIP brain of an onchain card-arbitrage acquisition desk. " +
  "You are given ONE already-computed arbitrage spread. The net spread (USD) and all fees " +
  "are ALREADY computed deterministically upstream — DO NOT recompute them. Your only job " +
  "is to judge whether this spread is a real, executable EARN that survives realistic " +
  "slippage, fee drag, thin liquidity, and phantom-listing risk, then decide BUY or SKIP. " +
  "Respond with STRICT JSON only: " +
  '{"verdict":"BUY"|"SKIP","reason":"<one sentence>","flags":["phantom"|"thin_liquidity"|"grade_mismatch"|"fee_drag"|"ok"]}.';

function userPrompt(s: Spread): string {
  return JSON.stringify(
    {
      product: s.name,
      set: s.set,
      grade: s.grade,
      buyVenue: s.buyVenue,
      askUsd: s.askUsd,
      sellVenue: s.sellVenue,
      gradeMatchedValueUsd: s.gradeMatchedValueUsd,
      feesUsd: s.feesUsd,
      netSpreadUsd: s.netSpreadUsd,
      form: s.form,
      detectorConfidence: s.confidence,
      oracleSource: s.oracleSource,
      oracleConfidence: s.oracleConfidence,
      soldCount: s.soldCount,
    },
    null,
    0,
  );
}

/** Deterministic guardrail used both as fallback and to sanity-bound the LLM verdict. */
export function deterministicDecision(s: Spread): BuySkip {
  const flags: BuySkip["flags"] = [];
  // thin liquidity
  if (s.soldCount < 5) flags.push("thin_liquidity");
  // fee drag: fees eat more than half the gross
  if (s.grossSpreadUsd > 0 && s.feesUsd / s.grossSpreadUsd > 0.5) flags.push("fee_drag");
  // low oracle confidence acts as a phantom-risk proxy
  if (s.oracleConfidence !== "high") flags.push("phantom");
  if (flags.length === 0) flags.push("ok");

  // BUY when the net edge is real and not dominated by fee drag / extreme thinness.
  const buy =
    s.netSpreadUsd > 0 &&
    s.oracleConfidence === "high" &&
    s.soldCount >= 3 &&
    !(s.grossSpreadUsd > 0 && s.feesUsd / s.grossSpreadUsd > 0.6);

  return {
    verdict: buy ? "BUY" : "SKIP",
    reason: buy
      ? `Net +$${s.netSpreadUsd} survives fees on a grade-matched ${s.oracleConfidence}-confidence comp (${s.soldCount} sold); ${s.form} round-trip is executable.`
      : `Edge does not clear the guardrail (net $${s.netSpreadUsd}, conf ${s.oracleConfidence}, ${s.soldCount} sold, flags: ${flags.join(",")}).`,
    netSpreadUsd: s.netSpreadUsd,
    flags,
    source: "fallback",
    model: "deterministic-guardrail",
  };
}

function safeParseVerdict(text: string): { verdict?: string; reason?: string; flags?: string[] } | null {
  if (!text) return null;
  // Pull the first {...} JSON object out of the content (model may wrap it).
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

/**
 * Call Nemotron (NIM, OpenAI-compatible) for the buy/skip verdict. Non-streaming for the
 * decision payload; the demo command center can re-issue with stream:true for Zone D
 * reasoning_content. Times out and falls back deterministically.
 */
export async function decideBuySkip(s: Spread, timeoutMs = 45_000): Promise<BuySkip> {
  const env = resolveRoutesEnv();
  const apiKey = getEnvOptional("NVIDIA_API_KEY");

  if (!apiKey) return deterministicDecision(s);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const reqInit = {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: env.nemotronModel, // nvidia/nemotron-3-super-120b-a12b
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt(s) },
        ],
        temperature: 0.2,
        top_p: 0.95,
        max_tokens: 1024,
        stream: false,
      }),
    };
    // Retry transient rate/availability (429/503) with backoff BEFORE falling back — the loop scores
    // many cards in a burst, so a momentary NIM 429 would otherwise drop EVERY decision to the
    // deterministic rules (the "[nemotron HTTP 429 → fallback]" everywhere). Respect Retry-After.
    let res = await fetch(`${env.nemotronBaseUrl}/chat/completions`, reqInit);
    for (let attempt = 0; (res.status === 429 || res.status === 503) && attempt < 2; attempt++) {
      const ra = Number(res.headers.get("retry-after"));
      const waitMs = Number.isFinite(ra) && ra > 0 ? Math.min(ra * 1000, 4000) : 700 * (attempt + 1);
      await new Promise((r) => setTimeout(r, waitMs));
      res = await fetch(`${env.nemotronBaseUrl}/chat/completions`, reqInit);
    }

    if (!res.ok) {
      const fb = deterministicDecision(s);
      fb.reason = `[nemotron HTTP ${res.status} → fallback] ${fb.reason}`;
      return fb;
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string; reasoning_content?: string } }[];
    };
    const msg = data.choices?.[0]?.message;
    const content = msg?.content ?? "";
    const reasoning = msg?.reasoning_content ?? "";
    const parsed = safeParseVerdict(content);

    if (!parsed || (parsed.verdict !== "BUY" && parsed.verdict !== "SKIP")) {
      const fb = deterministicDecision(s);
      fb.reason = `[nemotron unparseable → fallback] ${fb.reason}`;
      return fb;
    }

    const flags = (Array.isArray(parsed.flags) ? parsed.flags : ["ok"]).filter((f): f is BuySkip["flags"][number] =>
      ["phantom", "thin_liquidity", "grade_mismatch", "fee_drag", "ok"].includes(f),
    );

    return {
      verdict: parsed.verdict,
      reason: (parsed.reason || reasoning || "Nemotron buy/skip decision.").trim(),
      netSpreadUsd: s.netSpreadUsd, // grounded, never recomputed
      flags: flags.length ? flags : ["ok"],
      source: "nemotron",
      model: env.nemotronModel,
    };
  } catch (err) {
    const fb = deterministicDecision(s);
    fb.reason = `[nemotron error → fallback: ${(err as Error).name}] ${fb.reason}`;
    return fb;
  } finally {
    clearTimeout(timer);
  }
}

/** Decide over a batch (the scale path — §6.2 fans the same call over thousands of spreads). */
export async function decideBatch(spreads: Spread[], opts: { concurrency?: number } = {}): Promise<BuySkip[]> {
  const concurrency = opts.concurrency ?? 4;
  const out: BuySkip[] = new Array(spreads.length);
  let i = 0;
  async function worker(): Promise<void> {
    while (i < spreads.length) {
      const idx = i++;
      out[idx] = await decideBuySkip(spreads[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, spreads.length) }, worker));
  return out;
}
