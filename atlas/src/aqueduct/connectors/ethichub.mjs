// Aqueduct — EthicHub connector.
//
// Recipe: docs/research/03-ethichub-feasibility.md §3 "Connector recipe".
// Reads three PUBLIC, no-auth surfaces (spec F1 "read anything reachable"):
//   A. greencoffee.ethichub.com/en/shop            — the lot shop (Odoo, server-rendered HTML)
//   B. app.ethichub.com/api/v1/projects             — the lending platform (public JSON)
//   C. forno.celo.org (CreditLine contract eth_call) — onchain read (public RPC)
//
// This module is isomorphic (Node script + browser via Vite dev-proxy) — it
// only uses global `fetch`. Parsing is regex-based against the real markup
// (research/03: "parse HTML, not rendered text" — the Odoo markup is stable
// but a naive textContent extraction picks up cookie-banner noise).
//
// Every exported fetch* function returns { data, ledgerEntry } where
// ledgerEntry is a real-vs-sim ledger row: { ts, source, url, ok, note }.

import { JOIN_CONFIDENCE, computeLotId, initialsFromName, redactName } from "../schema/canonicalLot.mjs";

const SHOP_ORIGIN = "https://greencoffee.ethichub.com";
const APP_ORIGIN = "https://app.ethichub.com";
const CELO_RPC = "https://forno.celo.org";
const CREDIT_LINE_CONTRACT = "0xDb5D3aBF19014308A67420344021CEEE6003ACdd";
const UA = "Mozilla/5.0 (compatible; AqueductScout/0.1; +https://regenatlas.xyz)";

function nowIso() {
  return new Date().toISOString();
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchOne(html, re) {
  const m = html.match(re);
  return m ? decodeEntities(m[1]) : null;
}

/** A. Shop index — list of lots, filtered to Chiapas. */
export async function fetchShopIndex() {
  const url = `${SHOP_ORIGIN}/en/shop`;
  const ts = nowIso();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    const html = await res.text();
    const re = /href="(\/en\/shop\/([a-z0-9-]+)-(\d+))"[^>]*itemprop="url"[\s\S]{0,20}?/g;
    // Simpler/robust: pull every /en/shop/<slug>-<id> href, unique by id.
    const hrefRe = /href="(\/en\/shop\/[a-z0-9-]+-(\d+))"/g;
    const seen = new Map();
    let m;
    while ((m = hrefRe.exec(html))) {
      const [, path, id] = m;
      if (!seen.has(id)) seen.set(id, path);
    }
    const allLots = Array.from(seen.entries()).map(([id, path]) => ({ id, path }));
    const chiapasLots = allLots.filter(({ path }) => path.includes("chiapas"));
    return {
      data: { allCount: allLots.length, chiapasLots },
      ledgerEntry: {
        ts,
        provenance: "LIVE",
        agent: "@scout-ethichub",
        platform: "ethichub-shop",
        url,
        verb: "read",
        detail: `read ${allLots.length} lots at greencoffee.ethichub.com — ${chiapasLots.length} matched Chiapas`,
        status: "OK",
      },
    };
  } catch (err) {
    return {
      data: null,
      ledgerEntry: {
        ts,
        provenance: "LIVE",
        agent: "@scout-ethichub",
        platform: "ethichub-shop",
        url,
        verb: "read",
        detail: `shop index unreachable: ${err.message}`,
        status: "FAILED",
      },
    };
  }
}

/**
 * A2. One lot detail page -> parsed fields (no producer full name persisted
 * downstream). `originOverride` lets the browser build call this through the
 * Vite dev-server proxy (`/api/ethichub-shop`, see vite.config.ts) to attempt
 * a true same-session live re-fetch without a CORS failure — the `url` in
 * the returned ledger entry is always the REAL public EthicHub URL either
 * way (the proxy is transport only, never the cited source).
 */
export async function fetchLotDetail(path, originOverride) {
  const realUrl = `${SHOP_ORIGIN}${path}`;
  const fetchUrl = originOverride ? `${originOverride}${path}` : realUrl;
  const url = realUrl;
  const ts = nowIso();
  const platformLotId = path.match(/-(\d+)$/)?.[1] ?? path;
  try {
    const res = await fetch(fetchUrl, { headers: { "User-Agent": UA } });
    const html = await res.text();

    const title = matchOne(html, /<h1[^>]*itemprop="name"[^>]*>([^<]+)<\/h1>/i) ?? "";
    // Title grammar: "Producer / Region (Country) – Variety Process – SCA"
    const fullProducerName = title.split("/")[0]?.trim() ?? "Unknown producer";

    const attrPairs = {};
    const attrRe = /<span>([^<]+)<\/span>:\s*<span>([^<]+)<\/span>/g;
    let am;
    while ((am = attrRe.exec(html))) {
      attrPairs[decodeEntities(am[1])] = decodeEntities(am[2]);
    }

    const origin = matchOne(html, /<strong>\s*Origin:\s*<\/strong>\s*([^<]+)/i);
    const altitude = matchOne(html, /<strong>\s*Altitude:\s*<\/strong>\s*([^<]+)/i);
    const process = matchOne(html, /<strong>\s*Process:\s*<\/strong>\s*([^<]+)/i) ?? attrPairs["Process"] ?? null;
    const drying = matchOne(html, /<strong>\s*Drying:\s*<\/strong>\s*([^<]+)/i);
    const harvestSeason = matchOne(html, /<strong>\s*Harvest\s*Season\s*<\/strong>\s*([^<]+)/i);
    const aroma = matchOne(html, /<strong>\s*Aroma:\s*<\/strong>\s*([^<]+)/i);
    const taste = matchOne(html, /<strong>\s*Taste:\s*<\/strong>\s*([^<]+)/i);
    const body = matchOne(html, /<strong>\s*(?:Coffee\s*)?Body:\s*<\/strong>\s*([^<]+)/i);
    const acidity = matchOne(html, /<strong>\s*Acidity:\s*<\/strong>\s*([^<]+)/i);

    const priceRaw = matchOne(html, /<span itemprop="price"[^>]*>([\d.]+)<\/span>/i);
    const price = priceRaw ? Number.parseFloat(priceRaw) : null;
    const currency = matchOne(html, /<span itemprop="priceCurrency"[^>]*>([^<]+)<\/span>/i) ?? "EUR";

    const imgPath = matchOne(html, /data-zoom-image="([^"]+)"/i);
    const image = imgPath ? `${SHOP_ORIGIN}${imgPath.replace(/&amp;/g, "&")}` : null;

    // Story paragraph — captured for the "producer story" block, redacted below.
    const descBlockMatch = html.match(/<div class="oe_structure"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/i);
    const rawDescHtml = descBlockMatch ? descBlockMatch[1] : "";
    const storyMatch = rawDescHtml.match(
      /About the (?:Coffee producer|origin):<\/strong><\/p>([\s\S]*?)(?:<div><span class="o_small-fs">|$)/i,
    );
    let story = storyMatch ? decodeEntities(storyMatch[1].replace(/<[^>]+>/g, " ")) : null;
    // Full stripped description text — used ONLY server-side to find a more
    // specific village/community name than the "Origin:" line carries (e.g.
    // lot 79's Origin line says "Soconusco, Chiapas" but the producer-story
    // prose names the actual village, "San José Ixtepec" — that's the name
    // the lending API's community field uses, per research/03). Not persisted
    // verbatim to output; only used for matching, then redacted like `story`.
    const descriptionTextRaw = decodeEntities(rawDescHtml.replace(/<[^>]+>/g, " "));

    const initials = initialsFromName(fullProducerName);
    if (story) story = redactName(story, fullProducerName, initials);
    const titleRedacted = redactName(title, fullProducerName, initials);

    const variety = attrPairs["Variety"] ?? null;
    const sca = attrPairs["SCA"] ? Number.parseFloat(attrPairs["SCA"]) : null;
    const country = attrPairs["Country"] ?? null;
    const lotType = attrPairs["Lot Type"] ?? null;
    const format = attrPairs["Format"] ?? null;
    const coffeeType = attrPairs["Coffee type"] ?? null;

    // origin free text looks like "Soconusco, Chiapas (Mexico)" or
    // "Agua Caliente, Sierra Madre, Soconusco, Chiapas (Mexico)" — take the
    // first comma-segment as the community/locality label.
    const community = origin ? origin.split(",")[0].trim() : null;
    const region = origin && origin.includes("Chiapas") ? "Chiapas" : null;

    const ok = Boolean(title && price);
    return {
      data: {
        source: { platform: "ethichub-shop", platform_lot_id: platformLotId, url, fetched_at: ts },
        title_redacted: titleRedacted,
        producer: { initials, entity_type: fullProducerName.includes("&") ? "community_pair" : "person" },
        // full name kept ONLY transiently in-memory for community-matching against the
        // lending API in the same connector run — never written to output JSON.
        _fullProducerNameTransient: fullProducerName,
        origin: { country: country ?? "Mexico", region, community, locality_raw: origin, plot_geo: null },
        altitude_masl: altitude,
        process,
        variety,
        drying,
        description_text_raw: descriptionTextRaw,
        harvest_window: { season: harvestSeason, note: "as published — no plot-level harvest date" },
        sensory: { aroma, taste, body, acidity },
        quality: { sca_score: sca, grade_basis: "SCA cupping score (EthicHub-published)" },
        lot_type: lotType,
        coffee_type: coffeeType,
        weight_state: "green",
        format,
        price:
          price !== null
            ? { amount: price, currency, unit: "kg", incoterm: "FOB (origin, price as published incl. VAT)" }
            : null,
        image,
        producer_story: story,
      },
      ledgerEntry: {
        ts,
        provenance: ok ? "LIVE" : "LIVE",
        agent: "@scout-ethichub",
        platform: "ethichub-shop",
        url,
        verb: "pinned",
        detail: ok
          ? `pinned lot ${platformLotId} — ${initials} / ${region ?? "?"} (${country ?? "?"}) – ${variety ?? "?"} ${process ?? ""} – ${sca ?? "?"} SCA · €${price}/kg`
          : `lot ${platformLotId} — parse incomplete`,
        status: ok ? "OK" : "PARTIAL",
      },
    };
  } catch (err) {
    return {
      data: null,
      ledgerEntry: {
        ts,
        provenance: "LIVE",
        agent: "@scout-ethichub",
        platform: "ethichub-shop",
        url,
        verb: "read",
        detail: `lot detail unreachable: ${err.message}`,
        status: "FAILED",
      },
    };
  }
}

/** B. Lending platform — community/loan history, matched by name. */
export async function fetchLendingProjects(page = 0) {
  const url = page ? `${APP_ORIGIN}/api/v1/projects?page=${page}` : `${APP_ORIGIN}/api/v1/projects`;
  const ts = nowIso();
  try {
    const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
    const json = await res.json();
    const projects = json.projects ?? [];
    return {
      data: { projects, totalProjects: json.totalProjects, nextPage: json.nextPage },
      ledgerEntry: {
        ts,
        provenance: "LIVE",
        agent: "@scout-ethichub-lending",
        platform: "ethichub-lending-api",
        url,
        verb: "read",
        detail: `read ${projects.length} lending projects (of ${json.totalProjects ?? "?"} total)`,
        status: "OK",
      },
    };
  } catch (err) {
    return {
      data: null,
      ledgerEntry: {
        ts,
        provenance: "LIVE",
        agent: "@scout-ethichub-lending",
        platform: "ethichub-lending-api",
        url,
        verb: "read",
        detail: `lending API unreachable: ${err.message}`,
        status: "FAILED",
      },
    };
  }
}

/** Match a community name against fetched lending projects (name/place join — never a platform ID). */
export function matchCommunityProjects(communityRaw, projects) {
  if (!communityRaw) return [];
  const norm = (s) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip accents so "Salchijí" ~ "Salchiji"
      .replace(/[^a-z0-9]/g, "");
  const target = norm(communityRaw);
  return projects.filter((p) => {
    const name = norm((p.communityName || "").replace(/\(m[eé]xico\)/i, ""));
    return name && (name.includes(target) || target.includes(name));
  });
}

/** C. Onchain — Celo CreditLine.totalSupply() via eth_call (selector 0x18160ddd). */
export async function fetchCeloCreditLineSupply() {
  const url = CELO_RPC;
  const ts = nowIso();
  try {
    const res = await fetch(CELO_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to: CREDIT_LINE_CONTRACT, data: "0x18160ddd" }, "latest"],
      }),
    });
    const json = await res.json();
    const totalSupply = json.result ? Number.parseInt(json.result, 16) : null;
    return {
      data: { contract: CREDIT_LINE_CONTRACT, totalSupply, chain: "celo" },
      ledgerEntry: {
        ts,
        provenance: "LIVE",
        agent: "@oracle-celo-creditline",
        platform: "celo-onchain",
        url: `https://celoscan.io/address/${CREDIT_LINE_CONTRACT}`,
        verb: "read",
        detail: `eth_call CreditLine.totalSupply() on ${CREDIT_LINE_CONTRACT} — ${totalSupply} credit lines`,
        status: totalSupply !== null ? "OK" : "FAILED",
      },
    };
  } catch (err) {
    return {
      data: null,
      ledgerEntry: {
        ts,
        provenance: "LIVE",
        agent: "@oracle-celo-creditline",
        platform: "celo-onchain",
        url,
        verb: "read",
        detail: `Celo RPC unreachable: ${err.message}`,
        status: "FAILED",
      },
    };
  }
}

export { SHOP_ORIGIN, APP_ORIGIN, CELO_RPC, CREDIT_LINE_CONTRACT };
