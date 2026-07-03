import {
  ArrowLeft,
  ArrowUpRight,
  Coins,
  CurrencyCircleDollar,
  HandCoins,
  Megaphone,
  ShieldCheck,
  Truck,
  Users,
} from "@phosphor-icons/react";
import type React from "react";
import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import { REFERENCE_PROFILE, computeReferenceBid } from "../../../../routes/engine/services/commodity-landed-cost.mjs";
import Footer from "../../Footer";
import Header from "../../Header";
import { ProvenanceChip } from "../components/Chips";
import { useAqueductEconomy } from "../hooks/useAqueductEconomy";
import { runSolverRace } from "../sim/solverRoster.mjs";
import {
  ADVANCE_RATE,
  buildCoopRegistry,
  duplicateFinancingCheck,
  projectCoopTradeFinance,
} from "../sim/tradeFinance.mjs";

/**
 * The coop seat — the same engine, seen from the cooperative's chair
 * (north-star correction, 2026-07-02: the layer is FOR smallholder farmers;
 * this is the surface where the supply side acts instead of being rendered).
 * Everything is REAL-anchored or a labeled projection; the solver race run
 * here is the same genuine landed-cost computation the tour runs.
 */
export default function AqueductCoopSeat(): React.ReactElement {
  const { coopId } = useParams<{ coopId: string }>();
  const { realLots, lots: allLots, loading } = useAqueductEconomy();
  const [race, setRace] = useState<ReturnType<typeof runSolverRace> | null>(null);

  const seat = useMemo(() => {
    if (loading) return null;
    return buildCoopRegistry(realLots).find((s: { id: string }) => s.id === coopId) ?? null;
  }, [realLots, coopId, loading]);

  const projection = useMemo(() => (seat ? projectCoopTradeFinance(seat) : null), [seat]);
  const dupCheck = useMemo(() => (seat ? duplicateFinancingCheck(seat, allLots) : null), [seat, allLots]);

  if (loading) {
    return (
      <div className="w-svw h-svh flex items-center justify-center">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!seat || !projection || !dupCheck) {
    return (
      <>
        <Header />
        <div className="main-container pt-[100px] px-6">
          <p>
            Coop not found.{" "}
            <Link to="/" className="underline">
              Back to the map
            </Link>
          </p>
        </div>
      </>
    );
  }

  const avgFob =
    seat.lots.reduce(
      (s: number, l: { price?: { amount: number }; weight_kg?: number }) =>
        s + (l.price?.amount ?? 0) * (l.weight_kg ?? 70),
      0,
    ) / Math.max(1, projection.volumeKg);

  // Global shipping — the same landed-cost lines the solver race already computes, just
  // read as a blended logistics quote instead of a competitive bid. Before a race has run,
  // fall back to the open reference profile so the panel is never empty/invented — same
  // computeLandedCost() call the winning solver's bid comes from.
  const shippingBid = race?.winner?.bid ?? computeReferenceBid({ fobEurPerKg: avgFob, weightKg: projection.volumeKg });
  const shippingLineLabels = ["Freight & import", "Customs", "Certification"];
  const blendedShippingEurPerKg = shippingBid.lines
    .filter((l: { label: string }) => shippingLineLabels.includes(l.label))
    .reduce((s: number, l: { eurPerKg: number }) => s + l.eurPerKg, 0);
  const shippingIsProjection = !race?.winner;

  const publishIntent = () => {
    // Solver policies judge the aggregate by its WEAKEST constituent — a risk desk
    // declines on the worst lot in the pool, not the average (conservative, honest).
    const lots = seat.lots as Array<{
      quality?: { sca_score: number | null };
      eudr?: {
        plot_geo_present: boolean;
        harvest_window_present: boolean;
        legality_evidence: boolean;
        dds_ref: string | null;
      };
      certs?: unknown[];
      commodity?: string;
    }>;
    const aggregateLot = {
      ...lots[0],
      quality: {
        sca_score: lots.reduce<number | null>(
          (min, l) =>
            l.quality?.sca_score == null ? min : min == null ? l.quality.sca_score : Math.min(min, l.quality.sca_score),
          null,
        ),
        grade_basis: "aggregate — weakest constituent",
      },
      eudr: {
        plot_geo_present: lots.every((l) => l.eudr?.plot_geo_present),
        harvest_window_present: lots.every((l) => l.eudr?.harvest_window_present),
        legality_evidence: lots.every((l) => l.eudr?.legality_evidence),
        dds_ref: lots.every((l) => l.eudr?.dds_ref) ? lots[0].eudr?.dds_ref ?? null : null,
      },
    };
    setRace(runSolverRace({ lot: aggregateLot, fobEurPerKg: avgFob, weightKg: projection.volumeKg }));
  };

  const fmtEur = (n: number) => `€${Math.round(n).toLocaleString()}`;

  return (
    <>
      <Helmet>
        <title>{seat.name} · Aqueduct coop seat</title>
      </Helmet>
      <Header />
      <div className="main-container">
        <div className="pt-[70px] md:pt-[60px] pb-12 max-w-[980px] mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-3">
            <ArrowLeft size={12} /> Back to the map
          </Link>

          {/* ── Seat header ── */}
          <div className="bg-cardBackground border border-gray-200 px-5 py-4 mb-4">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <Users size={16} className="text-gray-500" />
              <h1 className="text-base font-bold text-gray-900">{seat.name}</h1>
              <ProvenanceChip provenance={seat.real ? "LIVE" : "SIM"} />
              <span className="text-[11px] text-gray-500">{seat.kindLabel}</span>
            </div>
            <p className="text-xs text-gray-500">
              {seat.origin}
              {seat.country ? `, ${seat.country}` : ""} · {seat.commodity}
            </p>
            <p className="text-[11px] text-gray-400 mt-1.5 leading-relaxed">{seat.lotBasis}</p>
            {seat.lendingProjects.length > 0 && (
              <div className="mt-2 space-y-1">
                {seat.lendingProjects.map((p: { id: number; objective: string }) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-1.5">
                    <span className="text-[11px] text-gray-700">{p.objective}</span>
                    <span className="text-[10px] text-gray-400 aq-mono shrink-0">EthicHub project #{p.id} · REAL</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* ── Your lots + publish intent ── */}
            <div className="bg-cardBackground border border-gray-200 px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <Megaphone size={14} className="text-gray-500" />
                <h2 className="text-xs font-bold text-gray-900">Your aggregated season</h2>
              </div>
              <div className="grid grid-cols-3 gap-px bg-gray-100 mb-3">
                <Kpi label="Lots" value={String(projection.lotCount)} />
                <Kpi label="Volume" value={`${projection.volumeKg.toLocaleString()} kg`} />
                <Kpi label="Receivable" value={fmtEur(projection.receivableEur)} />
              </div>
              {!race ? (
                <button
                  onClick={publishIntent}
                  className="w-full py-2 bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
                >
                  Publish sell intent — let solvers compete for your route
                </button>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-gray-500">
                    Solver race on your aggregated volume ({projection.volumeKg.toLocaleString()} kg @ ~€
                    {avgFob.toFixed(2)}/kg FOB) — every bid is the same deterministic landed-cost computation,
                    competition drives YOUR landed cost down:
                  </p>
                  {race.bids.map(
                    (b: { handle: string; status: string; bid: { landedEurPerKg: number } | null; real?: boolean }) => (
                      <div key={b.handle} className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-1.5">
                        <span className="text-[11px] aq-mono text-gray-700">{b.handle}</span>
                        <span className="flex items-center gap-1.5">
                          {b.real && <ProvenanceChip provenance="LIVE" />}
                          {b.status === "DECLINED" ? (
                            <span className="aq-status aq-status--failed">DECLINED</span>
                          ) : (
                            <span
                              className={`text-[11px] aq-mono ${b.handle === race.winner?.handle ? "font-bold text-green-700" : "text-gray-600"}`}
                            >
                              €{b.bid!.landedEurPerKg.toFixed(3)}/kg landed
                            </span>
                          )}
                        </span>
                      </div>
                    ),
                  )}
                  {race.winner && (
                    <p className="text-[11px] text-gray-500 pt-1">
                      Best landed:{" "}
                      <span className="font-semibold text-gray-800">
                        €{race.winner.bid.landedEurPerKg.toFixed(3)}/kg
                      </span>{" "}
                      by <span className="aq-mono">{race.winner.handle}</span> — your asking FOB holds; the competition
                      compresses the middle, not your price.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Tokenized trade finance ── */}
            <div className="bg-cardBackground border border-gray-200 px-5 py-4">
              <div className="flex items-center gap-1.5 mb-3">
                <HandCoins size={14} className="text-gray-500" />
                <h2 className="text-xs font-bold text-gray-900">Tokenized trade finance</h2>
                <ProvenanceChip provenance="SIM" />
                <span className="text-[10px] text-gray-400">projection</span>
              </div>
              <div className="grid grid-cols-3 gap-px bg-gray-100 mb-3">
                <Kpi label="Structured receivable" value={fmtEur(projection.receivableEur)} />
                <Kpi label={`Advance @ ${Math.round(ADVANCE_RATE * 100)}%`} value={fmtEur(projection.financeableEur)} />
                <Kpi label="Lead match" value={fmtEur(projection.leadMatchEur)} />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                Advance rate is a declared assumption, not a citation. Eligibility below is the real policy-engine
                verdict — the same (institution, rule, condition, effect) machinery the solver race uses.
              </p>
              <div className="space-y-1">
                {projection.eligibleActors.map(
                  (a: {
                    handle: string;
                    name: string;
                    kind: string;
                    matchedLotCount: number;
                    matchedValueEur: number;
                  }) => (
                    <div key={a.handle} className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-1.5">
                      <span className="text-[11px] text-gray-700 truncate">
                        {a.name} <span className="text-gray-400">({a.kind})</span>
                      </span>
                      <span className="text-[11px] aq-mono text-gray-600 shrink-0">
                        {a.matchedLotCount} lot(s) · {fmtEur(a.matchedValueEur)}
                      </span>
                    </div>
                  ),
                )}
                {projection.eligibleActors.length === 0 && (
                  <p className="text-[11px] text-gray-400">
                    No capital actor's conditions match these lots yet — structure closes gaps (quality grading, EUDR
                    fields), matches follow.
                  </p>
                )}
              </div>
            </div>

            {/* ── Global shipping: one blended quote, eBay-GSP style ── */}
            <div className="bg-cardBackground border border-gray-200 px-5 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Truck size={14} className="text-gray-500" />
                <h2 className="text-xs font-bold text-gray-900">Global shipping</h2>
                <ProvenanceChip provenance="SIM" />
                <span className="text-[10px] text-gray-400">
                  {shippingIsProjection ? "projection, not a live carrier rate" : "from the winning bid"}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                Freight, customs, and certification collapsed into one blended line — the same way a marketplace's
                global shipping program abstracts international shipping from both sides. Aqueduct doesn't operate
                logistics; every figure traces to{" "}
                {shippingBid.profileLabel === REFERENCE_PROFILE.label
                  ? "the shared open reference engine"
                  : `${shippingBid.profileLabel}'s declared cost profile`}
                , never invented.
              </p>
              <div className="grid grid-cols-3 gap-px bg-gray-100 mb-2">
                <Kpi label="Blended cost" value={`€${blendedShippingEurPerKg.toFixed(3)}/kg`} />
                <Kpi label="Incoterm" value={shippingBid.incoterm} />
                <Kpi label="Transit" value={`${shippingBid.totalRouteDays}d`} />
              </div>
              <div className="space-y-1">
                {shippingBid.documentChain.map(
                  (step: { step: string; node: string; leadDays: number; confidence: string }) => (
                    <div key={step.step} className="flex items-center justify-between gap-2 bg-gray-50 px-3 py-1.5">
                      <span className="text-[11px] text-gray-700 truncate">
                        {step.step} <span className="text-gray-400">— {step.node}</span>
                      </span>
                      <span className="text-[10px] text-gray-400 aq-mono shrink-0">
                        +{step.leadDays}d · {step.confidence}
                      </span>
                    </div>
                  ),
                )}
              </div>
            </div>

            {/* ── Stablecoin settlement rail ── */}
            <div className="bg-cardBackground border border-gray-200 px-5 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <CurrencyCircleDollar size={14} className="text-gray-500" />
                <h2 className="text-xs font-bold text-gray-900">How a foreign buyer pays you</h2>
              </div>
              <p className="text-[11px] text-gray-600 leading-relaxed mb-2">
                {projection.stablecoinRail.realPrecedent}
              </p>
              <p className="text-[11px] text-gray-600 leading-relaxed mb-2">{projection.stablecoinRail.prepared}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ProvenanceChip provenance="LIVE" />
                <span className="text-[10px] text-gray-400">Celo USDC precedent</span>
                <ProvenanceChip provenance="TESTNET" />
                <span className="text-[10px] text-gray-400">Base Sepolia settle prepared</span>
                <ProvenanceChip provenance="SIM" />
                <span className="text-[10px] text-gray-400">buyer payment until broadcast</span>
              </div>
              <div className="mt-2 bg-gray-50 px-3 py-2">
                <div className="text-[11px] text-gray-700 flex items-center justify-between">
                  <span>Real completed cycle (Celo credit line 2)</span>
                  <span className="aq-mono">192,600 → 212,369.79 USDC repaid</span>
                </div>
                <div className="text-[10px] text-gray-400 mt-0.5 aq-mono">
                  {projection.benchmark.creditLines.contract} · verified {projection.benchmark.creditLines.verifiedAt}
                </div>
              </div>
            </div>

            {/* ── Registry service: duplicate-financing check ── */}
            <div className="bg-cardBackground border border-gray-200 px-5 py-4">
              <div className="flex items-center gap-1.5 mb-2">
                <ShieldCheck size={14} className="text-gray-500" />
                <h2 className="text-xs font-bold text-gray-900">Duplicate-financing check</h2>
                <span className="aq-status aq-status--ok">OK</span>
              </div>
              <div className="grid grid-cols-3 gap-px bg-gray-100 mb-2">
                <Kpi label="Lots checked" value={String(dupCheck.checked)} />
                <Kpi label="Registry entries" value={dupCheck.registrySize.toLocaleString()} />
                <Kpi label="Duplicate pledges" value={String(dupCheck.duplicatePledges)} />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">{dupCheck.note}</p>
              <p className="text-[11px] text-gray-400 leading-relaxed mt-1">
                This is the lender-facing registry service — protecting your credit access is the sustainability story,
                not a toll on your lot.
              </p>
            </div>
          </div>

          {/* Benchmark footer */}
          <div className="mt-4 bg-cardBackground border border-gray-200 px-5 py-3 flex items-center gap-2 flex-wrap">
            <Coins size={13} className="text-gray-400" />
            <span className="text-[11px] text-gray-500">{projection.benchmark.note}</span>
            <a
              href="https://docs.ethichub.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5"
            >
              source <ArrowUpRight size={10} />
            </a>
          </div>

          <div className="hidden md:block mt-6">
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-cardBackground px-3 py-2">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className="text-xs font-bold text-gray-900 aq-mono">{value}</div>
    </div>
  );
}
