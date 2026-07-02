import React, { useState } from "react";
import { ProvenanceChip, ValueOrDash, JoinConfidenceTag } from "./Chips";
import type { AqueductLotSnapshot } from "../hooks/useAqueductLots";

function fmtEur(n: number | null | undefined) {
  if (n === null || n === undefined) return null;
  return `€${n.toFixed(2)}`;
}

// FOB EUR/kg -> ICE C-equivalent ¢/lb, purely for the oracle two-register
// grammar (DESIGN-BRIEF §2.4). 1 kg = 2.20462 lb; EUR/USD taken as ~1.08 as a
// labeled approximation (no live FX feed wired at Gate 1 — SIM-tier note).
function eurKgToCentsLb(eurPerKg: number) {
  const usdPerKg = eurPerKg * 1.08;
  const usdPerLb = usdPerKg / 2.20462;
  return usdPerLb * 100;
}

/**
 * Aqueduct lot card — the Atlas asset page, extended with the canonical lot
 * schema. Block order per DESIGN-BRIEF.md §6 (data always above story).
 */
export function LotCard({ lot }: { lot: AqueductLotSnapshot }): React.ReactElement {
  const [showJson, setShowJson] = useState(false);
  const priceEur = lot.price?.amount ?? null;
  const oracleCentsLb = priceEur ? eurKgToCentsLb(priceEur) : null;

  return (
    <div className="aq-layer aq-card p-5 space-y-5 aq-mono text-sm">
      {/* 1. Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h1 className="text-lg font-semibold" style={{ color: "var(--aq-text)" }}>
            {lot.producer.initials} / {lot.origin.region} ({lot.origin.country}) – {lot.variety} {lot.process} – {lot.quality.sca_score} SCA
          </h1>
          <ProvenanceChip provenance={lot.provenance === "LIVE" ? "LIVE" : "SNAPSHOT"} dated={lot.source.fetched_at} />
        </div>
        <div className="text-xs" style={{ color: "var(--aq-dim)" }}>
          fetched {new Date(lot.source.fetched_at).toISOString().replace("T", " ").slice(0, 19)}Z ·{" "}
          <a
            href={lot.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            style={{ color: "var(--aq-amber)" }}
          >
            view on EthicHub ↗
          </a>
        </div>
      </div>

      {/* 2. Content-addressed lot ID */}
      <div className="aq-hairline pt-3">
        <div className="text-xs mb-1" style={{ color: "var(--aq-dim)" }}>
          content-addressed lot id
        </div>
        <div className="flex items-center gap-2">
          <code className="text-xs break-all" style={{ color: "var(--aq-text)" }}>
            {lot.aqueduct_id_full}
          </code>
          <button
            className="text-xs underline shrink-0"
            style={{ color: "var(--aq-dim)" }}
            onClick={() => navigator.clipboard?.writeText(lot.aqueduct_id_full)}
          >
            copy
          </button>
        </div>
        <div className="text-[11px] mt-1" style={{ color: "var(--aq-dim)" }}>
          sha256 of the identity fields — the namespace is the algorithm, not us; anyone can recompute it.
        </div>
      </div>

      {/* 3. Keyed spec list */}
      <div className="aq-hairline pt-3 space-y-1">
        <SpecRow label="Origin" value={lot.origin.locality_raw} />
        <SpecRow label="Variety" value={lot.variety} />
        <SpecRow label="Altitude" value={lot.altitude_masl} />
        <SpecRow label="Process" value={lot.process} />
        <SpecRow label="Drying" value={lot.drying} />
        <SpecRow label="Harvest" value={lot.harvest_window.season} />
        <SpecRow label="Weight / state" value={`${lot.weight_state}${lot.format ? ` · ${lot.format}` : ""}`} />
      </div>

      {/* 4. Sensory profile */}
      <div className="aq-hairline pt-3">
        <div className="text-xs mb-1" style={{ color: "var(--aq-dim)" }}>
          sensory profile
        </div>
        <div className="space-y-1">
          <SpecRow label="Aroma" value={lot.sensory.aroma} />
          <SpecRow label="Taste" value={lot.sensory.taste} />
          <SpecRow label="Body" value={lot.sensory.body} />
          <SpecRow label="Acidity" value={lot.sensory.acidity} />
        </div>
      </div>

      {/* 5. Price & spread */}
      <div className="aq-hairline pt-3 space-y-1">
        <div className="text-xs mb-1" style={{ color: "var(--aq-dim)" }}>
          price
        </div>
        <div>
          {lot.price ? (
            <>
              <span className="font-semibold">
                {lot.price.incoterm.split(" ")[0]} {fmtEur(priceEur)}/{lot.price.unit}
              </span>{" "}
              <span style={{ color: "var(--aq-dim)" }}>({lot.price.incoterm})</span>
            </>
          ) : (
            <ValueOrDash value={null} />
          )}
        </div>
        {oracleCentsLb !== null && (
          <div className="text-xs" style={{ color: "var(--aq-dim)" }}>
            oracle (approx.): ICE C-equivalent ≈ {oracleCentsLb.toFixed(1)} ¢/lb from asking FOB · SIM FX 1.08 — no
            live ICE C feed wired at Gate 1
          </div>
        )}
      </div>

      {/* 6. Diligence / EUDR panel */}
      <div className="aq-hairline pt-3">
        <div className="text-xs mb-2" style={{ color: "var(--aq-dim)" }}>
          diligence — EUDR document chain
        </div>
        <div className="space-y-1">
          <EudrRow label="Plot geolocation" present={lot.eudr.plot_geo_present} />
          <EudrRow label="Harvest window" present={lot.eudr.harvest_window_present} />
          <EudrRow label="Legality evidence" present={lot.eudr.legality_evidence} />
          <EudrRow label="Due Diligence Statement ref" present={Boolean(lot.eudr.dds_ref)} value={lot.eudr.dds_ref} />
        </div>
      </div>

      {/* 7. Bottom attribute table */}
      <div className="aq-hairline pt-3 space-y-1">
        <SpecRow label="Lot Type" value={lot.lot_type} />
        <SpecRow label="Custody" value={lot.custody_model} />
        <SpecRow label="identity_stage" value={lot.identity_stage} />
        <SpecRow label="ico_mark" value={lot.ico_mark} />
        <div className="flex items-center gap-2 justify-between py-0.5">
          <span style={{ color: "var(--aq-dim)" }}>join_confidence</span>
          <JoinConfidenceTag level={lot.join_confidence} />
        </div>
        <SpecRow label="Composition" value={lot.composition} />
      </div>

      {/* Cross-surface identity resolution (spec B3) */}
      {lot.lending.matched && (
        <div className="aq-hairline pt-3">
          <div className="text-xs mb-1" style={{ color: "var(--aq-dim)" }}>
            identity resolution — cross-surface (both surfaces EthicHub's)
          </div>
          <div className="text-xs" style={{ color: "var(--aq-text)" }}>
            linked by producer/community, not by platform id — matched against {lot.lending.projects.length} lending
            project{lot.lending.projects.length === 1 ? "" : "s"} for "{lot.lending.community_searched}":
          </div>
          <ul className="mt-1 space-y-0.5">
            {lot.lending.projects.map((p) => (
              <li key={p.id} className="text-xs" style={{ color: "var(--aq-dim)" }}>
                #{p.id} — {p.objective}
              </li>
            ))}
          </ul>
          {lot.onchain && (
            <div className="text-xs mt-1" style={{ color: "var(--aq-dim)" }}>
              onchain (Celo): {lot.onchain.total_credit_lines} credit lines on {lot.onchain.contract.slice(0, 10)}… —{" "}
              {lot.onchain.note}
            </div>
          )}
        </div>
      )}

      {/* 8. Activity/history — Gate 1: source read only; full feed grammar is Gate 2 */}
      <div className="aq-hairline pt-3">
        <div className="text-xs mb-1" style={{ color: "var(--aq-dim)" }}>
          activity
        </div>
        <div className="text-xs" style={{ color: "var(--aq-text)" }}>
          {new Date(lot.source.fetched_at).toISOString().slice(11, 19)}Z · {lot.provenance === "LIVE" ? "LIVE" : "SNAPSHOT"} ·
          @scout-ethichub · pinned lot {lot.source.platform_lot_id} · OK
        </div>
      </div>

      {/* 10. Producer story — last, after all data */}
      {lot.producer_story && (
        <div className="aq-hairline pt-3">
          <div className="text-xs mb-1" style={{ color: "var(--aq-dim)" }}>
            producer story (as published; name initialed per house rule)
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--aq-text)" }}>
            {lot.producer_story}
          </p>
        </div>
      )}

      <div className="aq-hairline pt-3">
        <button className="text-xs underline" style={{ color: "var(--aq-dim)" }} onClick={() => setShowJson((s) => !s)}>
          {showJson ? "Hide raw" : "Show raw"}
        </button>
        {showJson && (
          <pre className="text-[10px] mt-2 overflow-x-auto aq-card-2 p-2 rounded" style={{ color: "var(--aq-dim)" }}>
            {JSON.stringify(lot, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function SpecRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span style={{ color: "var(--aq-dim)" }}>{label}</span>
      <span className="text-right" style={{ color: "var(--aq-text)" }}>
        <ValueOrDash value={value} />
      </span>
    </div>
  );
}

function EudrRow({ label, present, value }: { label: string; present: boolean; value?: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <span style={{ color: "var(--aq-dim)" }}>{label}</span>
      <span className="flex items-center gap-1.5">
        {present ? (
          <span style={{ color: "var(--aq-up)" }}>✓ verified</span>
        ) : (
          <span
            style={{
              color: "var(--aq-amber)",
              border: "1px dashed var(--aq-amber)",
              padding: "0 4px",
              borderRadius: 3,
            }}
          >
            hatched · unverifiable
          </span>
        )}
        {value && <span style={{ color: "var(--aq-dim)" }}>{value}</span>}
      </span>
    </div>
  );
}
