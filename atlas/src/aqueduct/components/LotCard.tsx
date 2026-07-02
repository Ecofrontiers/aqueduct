import React, { useState } from "react";
import {
  Coffee,
  Coin,
  Drop,
  Fingerprint,
  HandCoins,
  MapPin,
  Mountains,
  ShieldCheck,
  ArrowUpRight,
  Check,
  Copy,
  Users,
} from "@phosphor-icons/react";
import { ProvenanceChip, ValueOrDash, JoinConfidenceTag } from "./Chips";
import { CollapsibleSection } from "../../shared/components/CollapsibleSection";
import type { AqueductAnyLot } from "../hooks/useAqueductEconomy";

function fmtEur(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  return `€${n.toFixed(2)}`;
}

// FOB EUR/kg -> ICE C-equivalent ¢/lb, purely for the commodity-floor
// context line. 1 kg = 2.20462 lb; EUR/USD taken as ~1.08 as a labeled
// approximation (no live FX feed wired — SIM-tier note).
function eurKgToCentsLb(eurPerKg: number) {
  const usdPerKg = eurPerKg * 1.08;
  const usdPerLb = usdPerKg / 2.20462;
  return usdPerLb * 100;
}

type SectionId = "price" | "origin" | "sensory" | "eudr" | "lending" | "identity" | "story";

/**
 * Aqueduct lot detail card — the Atlas detail-card anatomy
 * (AssetBioregionCard idiom): hero header, signal pills, collapsible
 * sections. DM Sans throughout; mono only for data values.
 * Section order per .claude/design-briefs/lot-detail-and-network-brief.md.
 */
const COMMODITY_LABELS = { coffee: "Coffee", cacao: "Cacao", honey: "Honey" } as const;

export function LotCard({ lot }: { lot: AqueductAnyLot }): React.ReactElement {
  const [openSections, setOpenSections] = useState<Set<SectionId>>(
    new Set(["price", "origin", "eudr"])
  );
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id as SectionId)) next.delete(id as SectionId);
      else next.add(id as SectionId);
      return next;
    });
  };

  const priceEur = lot.price?.amount ?? null;
  // ICE C is the coffee contract — the ¢/lb floor context only applies to coffee.
  const isCoffee = (lot.commodity ?? "coffee") === "coffee";
  const floorCentsLb = priceEur && isCoffee ? eurKgToCentsLb(priceEur) : null;
  const origin = [lot.origin.region, lot.origin.country].filter(Boolean).join(", ");
  const eudrChecks = [
    { label: "Plot geolocation", present: lot.eudr.plot_geo_present, note: "not published by the platform" },
    { label: "Harvest window", present: lot.eudr.harvest_window_present, note: "not published" },
    { label: "Legality evidence", present: lot.eudr.legality_evidence, note: "not published" },
    { label: "Due Diligence Statement", present: Boolean(lot.eudr.dds_ref), note: "no DDS reference", value: lot.eudr.dds_ref },
  ];
  const eudrComplete = eudrChecks.every((c) => c.present);

  return (
    <div className="aq-layer bg-cardBackground border border-gray-200 overflow-hidden flex flex-col">
      {/* ── Hero header ── */}
      <div className="relative overflow-hidden">
        {lot.image && (
          <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${lot.image})` }} />
        )}
        <div className={`absolute inset-0 ${lot.image ? "bg-gradient-to-r from-black/70 via-black/50 to-black/30" : "bg-gray-800"}`} />
        <div className="relative z-10 px-5 py-4">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1" style={{ backgroundColor: "#b4530930", color: "#fff" }}>
              <Coffee size={11} />
              {COMMODITY_LABELS[lot.commodity ?? "coffee"]}
            </span>
            {lot.variety && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white/90">{lot.variety}</span>
            )}
            {lot.process && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-white/20 text-white/90">{lot.process}</span>
            )}
          </div>
          <h1 className="text-base font-bold text-white leading-tight">{lot.title_redacted}</h1>
          <div className="flex items-center gap-1 mt-1.5 text-xs text-white/70">
            {origin && (
              <span className="flex items-center gap-0.5">
                <MapPin size={11} className="flex-shrink-0" />
                {origin}
              </span>
            )}
            <span className="text-white/40">·</span>
            <span className="font-medium text-white/90">
              {lot.producer.initials} ({lot.producer.entity_type})
            </span>
          </div>
        </div>
      </div>

      {/* ── Provenance line ── */}
      <div className="px-4 pt-3 flex items-center gap-2 flex-wrap text-xs text-gray-500">
        <ProvenanceChip
          provenance={lot.sim ? "SIM" : lot.provenance === "LIVE" ? "LIVE" : "SNAPSHOT"}
          dated={lot.provenance === "SNAPSHOT" ? lot.source.fetched_at : undefined}
        />
        {lot.sim ? (
          <span>seeded synthetic lot — deterministic, replays identically</span>
        ) : (
          <span>
            fetched <span className="aq-mono">{new Date(lot.source.fetched_at).toISOString().replace("T", " ").slice(0, 19)}Z</span>
          </span>
        )}
        {lot.source.url && (
          <a
            href={lot.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-blue-500 hover:text-blue-700"
          >
            view on EthicHub
            <ArrowUpRight size={11} />
          </a>
        )}
      </div>

      {/* ── Signal pills ── */}
      <div className="px-4 pt-2 pb-3 flex items-center gap-1.5 flex-wrap">
        {lot.quality.sca_score != null && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-700 flex items-center gap-0.5">
            <Check size={10} weight="bold" />
            {lot.quality.sca_score} SCA
          </span>
        )}
        <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
          {lot.weight_state}
          {lot.format ? ` · ${lot.format}` : ""}
          {lot.weight_kg ? ` · ${lot.weight_kg.toLocaleString()} kg` : ""}
        </span>
        <span
          className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
            eudrComplete ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          EUDR {eudrComplete ? "ready" : "partial"}
        </span>
        {lot.lending.matched && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            Lending linked
          </span>
        )}
      </div>

      {/* ── Sections ── */}
      <div>
        {/* Price & commodity floor */}
        <CollapsibleSection
          id="price"
          icon={<Coin size={13} />}
          label="Price & commodity floor"
          isOpen={openSections.has("price")}
          onToggle={toggleSection}
        >
          {lot.price ? (
            <div className="space-y-2">
              <div className="flex items-baseline justify-between bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-500">{lot.price.incoterm}</span>
                <span className="text-base font-bold text-gray-900 aq-mono">
                  {fmtEur(priceEur)}/{lot.price.unit}
                </span>
              </div>
              {floorCentsLb !== null ? (
                <div className="bg-gray-50 px-3 py-2">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-gray-500">Commodity floor (approx.)</span>
                    <span className="text-xs font-semibold text-gray-700 aq-mono">
                      ICE C-eq ≈ {floorCentsLb.toFixed(1)} ¢/lb
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                    The floor = ICE C + origin differential — a lower bound, not a verdict.
                    Specialty lots price above it on grade. Converted at SIM FX 1.08; no live
                    ICE C feed wired.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Floor = exchange benchmark + origin differential; no benchmark feed wired
                  for this commodity (SIM, coarse calibration).
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Price on match — <ValueOrDash value={null} /></p>
          )}
        </CollapsibleSection>

        {/* Origin & production */}
        <CollapsibleSection
          id="origin"
          icon={<Mountains size={13} />}
          label="Origin & production"
          isOpen={openSections.has("origin")}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-2 gap-px bg-gray-100">
            <KV label="Origin" value={lot.origin.locality_raw} />
            <KV label="Altitude" value={lot.altitude_masl} />
            <KV label="Variety" value={lot.variety} />
            <KV label="Process" value={lot.process} />
            <KV label="Drying" value={lot.drying} />
            <KV label="Harvest" value={lot.harvest_window.season} />
            <KV label="Lot type" value={lot.lot_type} />
            <KV label="Custody" value={lot.custody_model} />
            <KV label="Composition" value={lot.composition} />
            <KV label="Grade basis" value={lot.quality.grade_basis} />
          </div>
        </CollapsibleSection>

        {/* Sensory profile */}
        <CollapsibleSection
          id="sensory"
          icon={<Drop size={13} />}
          label="Sensory profile"
          isOpen={openSections.has("sensory")}
          onToggle={toggleSection}
        >
          <div className="grid grid-cols-2 gap-px bg-gray-100">
            <KV label="Aroma" value={lot.sensory.aroma} />
            <KV label="Taste" value={lot.sensory.taste} />
            <KV label="Body" value={lot.sensory.body} />
            <KV label="Acidity" value={lot.sensory.acidity} />
          </div>
        </CollapsibleSection>

        {/* EUDR readiness */}
        <CollapsibleSection
          id="eudr"
          icon={<ShieldCheck size={13} />}
          label="EUDR readiness"
          isOpen={openSections.has("eudr")}
          onToggle={toggleSection}
        >
          <div className="space-y-1">
            {eudrChecks.map((check) => (
              <div key={check.label} className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-2">
                <span className="text-xs text-gray-700">{check.label}</span>
                <span className="flex items-center gap-1.5">
                  {check.value && <span className="text-[11px] text-gray-500 aq-mono">{check.value}</span>}
                  {check.present ? (
                    <span className="aq-status aq-status--ok">OK</span>
                  ) : (
                    <span className="aq-status aq-status--partial" title={check.note}>
                      PARTIAL
                    </span>
                  )}
                </span>
              </div>
            ))}
            <p className="text-[11px] text-gray-400 pt-1 leading-relaxed">
              A real check finding real gaps — the platform does not publish these fields for
              this lot. Nothing here is invented to look complete.
            </p>
          </div>
        </CollapsibleSection>

        {/* Lending & onchain */}
        {lot.lending.matched && (
          <CollapsibleSection
            id="lending"
            icon={<HandCoins size={13} />}
            label={`Lending & onchain (${lot.lending.projects.length})`}
            isOpen={openSections.has("lending")}
            onToggle={toggleSection}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Linked by producer/community, not platform id
                </span>
                <JoinConfidenceTag level={lot.join_confidence} />
              </div>
              <div className="space-y-1">
                {lot.lending.projects.map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 bg-gray-50 px-3 py-2">
                    <span className="text-xs text-gray-700">{p.objective}</span>
                    <span className="text-[11px] text-gray-400 aq-mono shrink-0">#{p.id}</span>
                  </div>
                ))}
              </div>
              {lot.onchain && (
                <div className="bg-gray-50 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-700">Celo credit lines</span>
                    <span className="text-xs font-semibold text-gray-700 aq-mono">
                      {lot.onchain.total_credit_lines ?? "—"}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5 aq-mono">{lot.onchain.contract.slice(0, 10)}…</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{lot.onchain.note}</p>
                </div>
              )}
            </div>
          </CollapsibleSection>
        )}

        {/* Identity & provenance */}
        <CollapsibleSection
          id="identity"
          icon={<Fingerprint size={13} />}
          label="Identity & provenance"
          isOpen={openSections.has("identity")}
          onToggle={toggleSection}
        >
          <div className="space-y-2">
            <div className="bg-gray-50 px-3 py-2">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[11px] text-gray-500">Content-addressed lot id</span>
                <button
                  className="flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700"
                  onClick={() => {
                    navigator.clipboard?.writeText(lot.aqueduct_id_full);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  <Copy size={11} />
                  {copied ? "copied" : "copy"}
                </button>
              </div>
              <code className="text-[11px] text-gray-700 break-all aq-mono">{lot.aqueduct_id_full}</code>
              <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                {lot.sim
                  ? "Seeded content hash of the synthetic lot's fields (SIM) — deterministic and replayable, not a platform read."
                  : "sha256 of the identity fields — the namespace is the algorithm, not us; anyone can recompute it."}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-px bg-gray-100">
              <KV label="Identity stage" value={lot.identity_stage} />
              <KV label="ICO mark" value={lot.ico_mark} />
              <KV label="Platform lot" value={lot.source.platform_lot_id} mono />
              <KV label="Source" value={lot.source.platform} />
            </div>
          </div>
        </CollapsibleSection>

        {/* Producer story — last, after all data */}
        {lot.producer_story && (
          <CollapsibleSection
            id="story"
            icon={<Users size={13} />}
            label="Producer story"
            isOpen={openSections.has("story")}
            onToggle={toggleSection}
          >
            <p className="text-xs text-gray-600 leading-relaxed">{lot.producer_story}</p>
            <p className="text-[11px] text-gray-400 mt-1.5">As published; name initialed per house rule.</p>
          </CollapsibleSection>
        )}
      </div>

      {/* Raw JSON */}
      <div className="border-t border-gray-100 px-4 py-2.5">
        <button className="text-[11px] text-gray-400 hover:text-gray-600 underline" onClick={() => setShowJson((s) => !s)}>
          {showJson ? "Hide raw JSON" : "Show raw JSON"}
        </button>
        {showJson && (
          <pre className="text-[10px] mt-2 overflow-x-auto bg-gray-50 border border-gray-100 p-2 text-gray-500 aq-mono">
            {JSON.stringify(lot, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function KV({ label, value, mono }: { label: string; value: string | number | null | undefined; mono?: boolean }) {
  return (
    <div className="bg-cardBackground px-3 py-2">
      <div className="text-[11px] text-gray-400">{label}</div>
      <div className={`text-xs text-gray-800 font-medium ${mono ? "aq-mono" : ""}`}>
        <ValueOrDash value={value} />
      </div>
    </div>
  );
}
