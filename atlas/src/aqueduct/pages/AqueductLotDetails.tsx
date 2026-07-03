import { ArrowRight, Truck } from "@phosphor-icons/react";
import type React from "react";
import { Helmet } from "react-helmet-async";
import { Marker } from "react-map-gl";
import { Link, useParams } from "react-router-dom";
import { computeReferenceBid } from "../../../../routes/engine/services/commodity-landed-cost.mjs";
import Footer from "../../Footer";
import Header from "../../Header";
import { useMapState } from "../../context/map";
import { MapBox } from "../../shared/components/MapBox";
import { ProvenanceChip } from "../components/Chips";
import { LotCard } from "../components/LotCard";
import { type AqueductAnyLot, useAqueductEconomy } from "../hooks/useAqueductEconomy";

/**
 * Aqueduct extended lot page — /lots/:lotId. Reuses the Atlas asset-page
 * chrome (Header, Footer, MapBox) per DESIGN-BRIEF.md §6 "maximum reuse,
 * truest to the fork framing." The Atlas base components themselves are
 * untouched; only this new page + the LotCard it renders belong to the
 * swarm layer.
 */
export default function AqueductLotDetails(): React.ReactElement {
  const { lotId } = useParams<{ lotId: string }>();
  const { mapStyle } = useMapState();
  const { lots, loading } = useAqueductEconomy();

  const lot = lots.find((l) => l.aqueduct_id === lotId || l.source?.platform_lot_id === lotId);

  if (loading) {
    return (
      <div className="w-svw h-svh flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!lot) {
    return (
      <>
        <Header />
        <div className="main-container pt-[100px] px-6">
          <p>
            Lot not found.{" "}
            <Link to="/" className="underline">
              Back to the map
            </Link>
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>{lot.title_redacted} · Aqueduct</title>
        <meta
          name="description"
          content={`${lot.origin.region}, ${lot.origin.country} — ${lot.variety} ${lot.process}, ${lot.quality.sca_score} SCA. Read live from EthicHub.`}
        />
      </Helmet>
      <Header />
      <div className="main-container">
        <div className="pt-[60px] md:pt-[80px]">
          <div className="grid lg:grid-cols-[440px_1fr] md:grid-cols-2 gap-4">
            <div>
              <LotCard lot={lot} />
            </div>
            <div className="space-y-4">
              {/* Map: a location-context inset, not a hero — the pin is community-
                  approximate, a big map overstates the precision this data actually has. */}
              <div>
                <div className="h-40 md:h-48 rounded-xl overflow-hidden">
                  <MapBox
                    mapStyle={mapStyle}
                    initialViewState={{
                      longitude: lot.map_marker.longitude,
                      latitude: lot.map_marker.latitude,
                      zoom: 8,
                    }}
                  >
                    <Marker longitude={lot.map_marker.longitude} latitude={lot.map_marker.latitude} anchor="center">
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#b45309",
                          border: "2px solid #ffffff",
                          boxShadow:
                            lot.provenance === "LIVE"
                              ? "0 0 0 2px #b45309, 0 0 0 6px rgba(180,83,9,0.15)"
                              : "0 1px 2px rgba(0,0,0,0.25)",
                        }}
                        title={lot.title_redacted}
                      />
                    </Marker>
                  </MapBox>
                </div>
                <div className="text-xs mt-2 px-2 text-gray-400">
                  {lot.sim
                    ? `Synthetic lot — map position is ${lot.map_marker.precision}, illustrative only.`
                    : `Map pin is community-approximate (${lot.map_marker.precision}) — EthicHub does not publish plot-level geolocation for this lot (the EUDR gap, rendered above).`}
                </div>
              </div>

              <RoutesPanel lot={lot} />
              <SimilarLots lot={lot} allLots={lots} />
            </div>
          </div>
          <div className="hidden md:block">
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}

/** Compact Routes panel: the same blended shipping quote (freight/customs/document
 *  chain, from commodity-landed-cost.mjs) the coop-seat page shows in full — condensed
 *  here to give this page a marketplace feel (a real logistics quote, not just a spec
 *  sheet) without duplicating the fuller version. */
function RoutesPanel({
  lot,
}: { lot: { price?: { amount: number } | null; weight_kg?: number } }): React.ReactElement | null {
  if (!lot.price?.amount) return null;
  const bid = computeReferenceBid({ fobEurPerKg: lot.price.amount, weightKg: lot.weight_kg ?? 70 });
  const blendedEurPerKg = bid.lines
    .filter((l: { label: string }) => ["Freight & import", "Customs", "Certification"].includes(l.label))
    .reduce((s: number, l: { eurPerKg: number }) => s + l.eurPerKg, 0);
  const insuranceLine = bid.lines.find((l: { label: string }) => l.label.startsWith("Cargo insurance"));

  return (
    <div className="aq-layer bg-cardBackground border border-gray-200 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Truck size={14} className="text-gray-500" />
        <h2 className="text-xs font-bold text-gray-900">Routes — shipping</h2>
        <span className="text-[10px] text-gray-400">reference quote, projection</span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 mb-2">
        <RouteStat label="Blended cost" value={`€${blendedEurPerKg.toFixed(3)}/kg`} />
        <RouteStat
          label={`Insurance (${((bid.insuredValuePct ?? 1.1) * 100).toFixed(0)}% CIF)`}
          value={insuranceLine ? `€${insuranceLine.eurPerKg.toFixed(4)}/kg` : "—"}
        />
        <RouteStat label="Incoterm" value={bid.incoterm} />
        <RouteStat label="Transit" value={`${bid.totalRouteDays}d`} />
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed">
        Freight, customs, and certification collapsed into one blended figure; cargo insurance shown separately — 110%
        of CIF/invoice value is the real Institute Cargo Clauses (C) minimum, the premium rate is an estimate. Computed
        by the same shared reference engine every solver bids through, not invented for this page.
      </p>
    </div>
  );
}

function RouteStat({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="bg-cardBackground px-3 py-2">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="text-xs font-bold text-gray-900 aq-mono">{value}</div>
    </div>
  );
}

/** Similar lots, same origin region — the "explore more" a real marketplace listing
 *  always has (Algrano's own pitch is literally "explore coffees" alongside any one
 *  lot). Pulled from the real lot population already loaded on this page, never a
 *  separate fetch or invented list. */
function SimilarLots({ lot, allLots }: { lot: AqueductAnyLot; allLots: AqueductAnyLot[] }): React.ReactElement | null {
  const similar = allLots
    .filter((l) => l.aqueduct_id !== lot.aqueduct_id && l.origin.region === lot.origin.region)
    .slice(0, 4);

  if (similar.length === 0) return null;

  return (
    <div className="aq-layer bg-cardBackground border border-gray-200 px-4 py-3">
      <h2 className="text-xs font-bold text-gray-900 mb-2">
        More from {lot.origin.region} ({similar.length})
      </h2>
      <div className="space-y-1">
        {similar.map((l) => (
          <Link
            key={l.aqueduct_id}
            to={`/lots/${l.aqueduct_id}`}
            className="flex items-center justify-between gap-2 bg-gray-50 hover:bg-gray-100 px-3 py-2 transition-colors group"
          >
            <div className="min-w-0">
              <div className="text-xs font-medium text-gray-800 truncate">{l.title_redacted}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <ProvenanceChip provenance={l.sim ? "SIM" : l.provenance === "LIVE" ? "LIVE" : "SNAPSHOT"} />
                {l.quality.sca_score != null && (
                  <span className="text-[10px] text-gray-400">{l.quality.sca_score} SCA</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {l.price && (
                <span className="text-xs font-semibold text-gray-700 aq-mono">
                  €{l.price.amount.toFixed(2)}/{l.price.unit}
                </span>
              )}
              <ArrowRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
