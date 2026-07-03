import { ArrowDown, ArrowLeft, ArrowRight, ArrowUpRight, HandCoins } from "@phosphor-icons/react";
import type React from "react";
import { useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useLocation } from "react-router-dom";
import Footer from "../../Footer";
import Header from "../../Header";
import { ProvenanceChip, ValueOrDash } from "../components/Chips";
import { getGccOracleState, getGlwPriceSnapshot } from "../connectors/glow.mjs";
import { useAqueductLots } from "../hooks/useAqueductLots";
import { buildAssuranceContract } from "../sim/assuranceContract.mjs";
import { CAPITAL_ROSTER } from "../sim/buyerRoster.mjs";
import { runCapitalFormationsMatch } from "../sim/capitalFormations.mjs";
import { getEconomy } from "../sim/economy.mjs";
import { buildFinanceIntent } from "../sim/financeIntent.mjs";
import { buildMinerBid, runTokenizerRace } from "../sim/tokenizerRoster.mjs";
import {
  ADVANCE_RATE,
  CELO_CREDIT_LINES,
  PLATFORM_STATS,
  STABLECOIN_RAIL,
  buildCoopRegistry,
  duplicateFinancingCheck,
  projectCoopTradeFinance,
} from "../sim/tradeFinance.mjs";
import {
  SIM_PLEDGE_STEP_EUR,
  addSimInterest,
  addSimPledge,
  selectSessionBackers,
  selectSimInterest,
  selectSimPledge,
  useSteward,
} from "../state/stewardStore";

// Account palette, keyed to the map's legend (same #4f46e5 the capital halos use). Every
// opportunity below is exogenous capital ENTERING the loop → indigo. The equity/community
// node is the endogenous/allocated side → green. No venue purple (there are no venues here).
const INDIGO = "#4f46e5";
const GREEN = "#059669";

const KIND_LABEL: Record<string, string> = { buyer: "Buyer", grant: "Grant", fund: "Fund" };
const KIND_COLOR: Record<string, string> = { buyer: INDIGO, grant: GREEN, fund: INDIGO };

function eur(n: number): string {
  return `€${Math.round(n).toLocaleString()}`;
}
function usd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/**
 * /financing — the CAPITAL ACCOUNT of Aqueduct's goods account. After a coop aggregates
 * lots and publishes an intent, this is the one surface where the money that clears it
 * forms. Two doors: coops RAISE against a confirmed season; financiers BACK a legible lot
 * (identity-resolved, grade-verified, origin-attested, intent-fillable) rather than a
 * tokenized question mark. Every match is gated by the same PolicyRule engine that runs the
 * solver race — never a bare match.
 *
 * Honesty contract (FABLE-KICKOFF.md): real numbers only where real — EthicHub's 9.9%
 * facility and the 192,600→212,369.79 USDC completed cycle, the Glow Miner's reported
 * $399→43.6 GLW/wk×89wk terms, ~$500/farmer-season, the €1,120 assurance threshold.
 * Everything else is SIM- or TO-BUILD-chipped and depends visibly on the lot's legibility.
 */
export default function AqueductFinancing(): React.ReactElement {
  const { lots: realLots, loading } = useAqueductLots({ liveRefetch: false });
  const location = useLocation();
  const steward = useSteward();

  const d = useMemo(() => {
    const economy = getEconomy();
    const real = realLots ?? [];
    const allLots = [...real, ...economy.lots];

    const formations = runCapitalFormationsMatch(allLots);
    const coopSeats = buildCoopRegistry(real);
    const realSeat = coopSeats.find((s) => s.real) ?? coopSeats[0] ?? null;
    const anchorLot = real[0] ?? null;

    // Card A — the assurance round: threshold is the REAL €1,120 finance intent; fill is SIM.
    const financeIntent = anchorLot ? buildFinanceIntent(anchorLot) : null;
    const assurance = financeIntent ? buildAssuranceContract(financeIntent, allLots) : null;

    // Card B/C(sibling) — the coop's projected trade-credit line + receivable.
    const tf = realSeat ? projectCoopTradeFinance(realSeat) : null;
    const dupCheck = realSeat ? duplicateFinancingCheck(realSeat, allLots) : null;

    // Card C headline — the real Glow Miner receivable (observed-market terms).
    const miner = buildMinerBid();

    // Card D — pre-sales: real anchor lots first (each an open sell intent), then the top
    // sim open sell intents joined to their lot. Advance = price × weight × ADVANCE_RATE.
    const lotById = new Map(allLots.map((l) => [l.aqueduct_id, l]));
    const presales: Array<{
      lotId: string;
      title: string;
      fob: number;
      weightKg: number;
      committedEur: number;
      incoterm: string;
      real: boolean;
    }> = [];
    for (const lot of real) {
      if (!lot.price?.amount) continue;
      const weightKg = lot.weight_kg ?? 70;
      presales.push({
        lotId: lot.aqueduct_id,
        title: lot.title_redacted,
        fob: lot.price.amount,
        weightKg,
        committedEur: lot.price.amount * weightKg,
        incoterm: lot.price.incoterm ?? "FOB",
        real: true,
      });
    }
    const simSell = economy.intents
      .filter((i: { intentType: string; status?: string }) => i.intentType === "sell-this-lot" && i.status === "open")
      .map((i: { lotId?: string }) => lotById.get(i.lotId ?? ""))
      .filter((l): l is NonNullable<typeof l> => Boolean(l?.price?.amount))
      .map((lot) => {
        const weightKg = lot.weight_kg ?? 70;
        return {
          lotId: lot.aqueduct_id,
          title: lot.title_redacted,
          fob: lot.price.amount,
          weightKg,
          committedEur: lot.price.amount * weightKg,
          incoterm: lot.price.incoterm ?? "FOB",
          real: false,
        };
      })
      .sort((a, b) => b.committedEur - a.committedEur)
      .slice(0, 5);
    presales.push(...simSell);

    // Real cost-of-capital corroboration from the completed Celo cycle.
    const cycle = CELO_CREDIT_LINES.lines[2];
    const realizedMultiple = cycle.repaidUsdc / cycle.borrowedUsdc; // 212,369.79 / 192,600
    const realizedPct = Math.round((realizedMultiple - 1) * 10000) / 100; // ~10.26%

    const perFarmerUsd = PLATFORM_STATS.lentUsd / PLATFORM_STATS.farmers; // = 500

    const tokenizerRace = runTokenizerRace({ instrumentValueEur: formations.totalCapitalEur });

    return {
      formations,
      realSeat,
      financeIntent,
      assurance,
      tf,
      dupCheck,
      miner,
      presales,
      cycle,
      realizedMultiple,
      realizedPct,
      perFarmerUsd,
      tokenizerRace,
    };
  }, [realLots]);

  const glwPrice = getGlwPriceSnapshot();
  const gccOracle = getGccOracleState();
  const { formations, realSeat, financeIntent, assurance, tf, dupCheck, miner, presales } = d;

  const coopHref = realSeat ? `/coops/${realSeat.id}` : "/";
  const assuranceAnchor = realSeat ? `assurance-${realSeat.id}` : "assurance";

  // Opportunity ids — stable keys the session-only SIM levers (pledge / express-interest)
  // write against. The assurance id IS the deep-link anchor, so a pledge and a #hash target
  // the same node.
  const TRADE_CREDIT_ID = "trade-credit";
  const MINER_ID = "miner";
  const PRESALE_ID = "presale";

  // Fix 1 — hash deep-link scroll. <ScrollRestoration/> scrolls-to-top on route change and
  // eats the fragment; there is no built-in hash handler. Targets (the presale rows, the
  // assurance card) mount only after realLots resolves, so re-run once data is ready. rAF
  // defers the scroll past ScrollRestoration's own scroll-to-0 so ours wins.
  const dataReady = !loading;
  useEffect(() => {
    if (!dataReady) return;
    const raw = location.hash;
    if (!raw) return;
    const id = decodeURIComponent(raw.slice(1));
    if (!id) return;
    const el = document.getElementById(id);
    if (!el) return; // guard: unknown / not-yet-mounted id — the dataReady re-run will retry
    const raf = requestAnimationFrame(() => el.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => cancelAnimationFrame(raf);
  }, [location.hash, dataReady]);

  // Fix 3 — session-only SIM pledge on the assurance round. Displayed fill = real seeded
  // pledge + this session's SIM pledges, clamped to the threshold; backers = base + one per
  // SIM_PLEDGE_STEP_EUR step. Deterministic, no RNG, never a real transaction.
  const simPledgeEur = assurance ? selectSimPledge(steward, assuranceAnchor) : 0;
  const displayedPledgedEur = assurance ? Math.min(assurance.pledgedEur + simPledgeEur, assurance.thresholdEur) : 0;
  const displayedBackers = assurance ? assurance.contributorCount + Math.round(simPledgeEur / SIM_PLEDGE_STEP_EUR) : 0;
  const displayedProgressPct = assurance ? Math.round((displayedPledgedEur / assurance.thresholdEur) * 1000) / 10 : 0;
  const assembled = assurance ? displayedPledgedEur >= assurance.thresholdEur : false;
  const displayedStatus = assembled ? "ASSEMBLED" : assurance?.status ?? "";

  // Express-interest counts for the honestly-non-transactional cards.
  const tradeCreditInterest = selectSimInterest(steward, TRADE_CREDIT_ID);
  const minerInterest = selectSimInterest(steward, MINER_ID);
  const presaleInterest = selectSimInterest(steward, PRESALE_ID);

  // Fix 5 — aggregate band. Every figure is computed from the same data the cards render.
  const presaleAdvanceTotalEur = presales.reduce((s, p) => s + p.committedEur * ADVANCE_RATE, 0);
  const presaleOfftakeTotalEur = presales.reduce((s, p) => s + p.committedEur, 0);
  const openCapacityEur = (assurance?.thresholdEur ?? 0) + (tf?.financeableEur ?? 0) + presaleAdvanceTotalEur;
  // Weighted-average stated yield across the two APR-quoting facility cards (assurance +
  // trade-credit both 9.9% reported), weighted by their EUR capacity.
  const yieldCards: Array<{ capacityEur: number; yieldPct: number }> = [];
  if (assurance) yieldCards.push({ capacityEur: assurance.thresholdEur, yieldPct: assurance.settlementTerms.aprPct });
  if (tf) yieldCards.push({ capacityEur: tf.financeableEur, yieldPct: 9.9 });
  const yieldWeightBase = yieldCards.reduce((s, c) => s + c.capacityEur, 0);
  const weightedYieldPct =
    yieldWeightBase > 0
      ? Math.round((yieldCards.reduce((s, c) => s + c.capacityEur * c.yieldPct, 0) / yieldWeightBase) * 10) / 10
      : 0;
  const openOpportunityCount = [assurance, tf, miner, presales.length > 0].filter(Boolean).length;
  const sessionBackers = selectSessionBackers(steward);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Financing | Aqueduct</title>
        <meta
          name="description"
          content="The capital account — coops raise against a confirmed season, financiers back a legible lot. Assurance rounds, trade-credit lines, receivables, and pre-sales, every match gated by the same policy engine as the solver race."
        />
      </Helmet>
      <Header />

      <div className="main-container flex-1">
        <div className="pt-[70px] md:pt-[60px] pb-12 max-w-[860px] mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-4">
            <ArrowLeft size={12} /> Back to the map
          </Link>

          {/* ── Orientation ── */}
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Financing</h1>
          </div>
          <p className="text-sm text-gray-600 mb-2 leading-relaxed">
            Capital enters the loop here — at <span className="font-medium text-gray-800">fill → settle</span>. After a
            coop aggregates lots and publishes an intent (the{" "}
            <Link to="/guide" className="underline hover:text-gray-800">
              goods account
            </Link>
            ), this is where the money that clears it forms. Two doors:{" "}
            <strong className="font-semibold">coops raise</strong>,{" "}
            <strong className="font-semibold">financiers back</strong> — every match gated by the same{" "}
            <Link to="/" className="underline hover:text-gray-800">
              policy engine
            </Link>{" "}
            that runs the solver race, never a bare match.
          </p>

          {/* ── Two-door header (Centrifuge pattern) ── */}
          <div className="grid sm:grid-cols-2 gap-2 mb-6">
            <a
              href="#for-coops"
              className="group bg-white border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors"
              style={{ borderLeft: `2px solid ${GREEN}` }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: GREEN }}>
                For coops
              </div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                Raise capital against a confirmed season
                <ArrowDown size={13} className="text-gray-400 group-hover:text-gray-700" />
              </div>
            </a>
            <a
              href="#for-financiers"
              className="group bg-white border border-gray-200 px-4 py-3 hover:border-gray-300 transition-colors"
              style={{ borderLeft: `2px solid ${INDIGO}` }}
            >
              <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: INDIGO }}>
                For financiers
              </div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                Back a legible lot, not a tokenized question mark
                <ArrowDown size={13} className="text-gray-400 group-hover:text-gray-700" />
              </div>
            </a>
          </div>

          {/* ── Honest-scale stat row: real quantities lead, the SIM pool total is chipped ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            <StatTile
              label="EthicHub completed cycle"
              value="192,600 → 212,369.79"
              unit="USDC borrowed → repaid"
              chip={<ProvenanceChip provenance="LIVE" />}
            />
            <StatTile
              label="GLW live pool"
              value={`$${glwPrice.usdPerGlw}`}
              unit={`$${Math.round(glwPrice.liquidityUsd / 1000)}k depth`}
              chip={<ProvenanceChip provenance="LIVE" />}
            />
            <StatTile
              label="Per farmer-season"
              value={`≈$${Math.round(d.perFarmerUsd)}`}
              unit={`$5M / ${PLATFORM_STATS.farmers.toLocaleString()} farmers`}
              chip={<ProvenanceChip provenance="SNAPSHOT" dated="2026-07-02" />}
            />
            <StatTile
              label="Declared capital in roster"
              value={eur(formations.totalCapitalEur)}
              unit="seeded roster, not real TVL"
              chip={<ProvenanceChip provenance="SIM" />}
            />
          </div>

          {/* ── Page-level trust rails (rendered once, not per card) ── */}
          <div className="flex flex-col gap-2 mb-8">
            {/* Rail 1 — duplicate-financing registry */}
            <div className="bg-gray-50 border border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-800">Duplicate-financing registry</span>
                <ProvenanceChip provenance="SIM" />
                <span className="text-[10px] text-gray-400">mechanic real, scale SIM</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed">
                Has this lot already been pledged? A content-addressed set lookup — the MonetaGo precedent.{" "}
                <span className="aq-mono text-gray-700">{(dupCheck?.registrySize ?? 0).toLocaleString()}</span> entries,{" "}
                <span className="aq-mono text-gray-700">{dupCheck?.duplicatePledges ?? 0}</span> duplicates. This is the
                identity-resolved property every card below leans on.
              </p>
            </div>
            {/* Rail 2 — USDC settlement rail */}
            <div className="bg-gray-50 border border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-[11px] font-semibold text-gray-800">USDC settlement rail</span>
              </div>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-1">{STABLECOIN_RAIL.realPrecedent}</p>
              <p className="text-[11px] text-gray-500 leading-relaxed mb-1.5">{STABLECOIN_RAIL.prepared}</p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <ProvenanceChip provenance="LIVE" />
                <span className="text-[10px] text-gray-400">Celo USDC precedent</span>
                <ProvenanceChip provenance="TESTNET" />
                <span className="text-[10px] text-gray-400">Base Sepolia settle prepared</span>
                <ProvenanceChip provenance="SIM" />
                <span className="text-[10px] text-gray-400">until a real key broadcasts</span>
              </div>
            </div>
          </div>

          {/* ════════════ FOR FINANCIERS ════════════ */}
          <div id="for-financiers" className="scroll-mt-20 mb-3">
            <h2 className="text-base font-bold text-gray-900">Open opportunities — vaults and pools you can back</h2>
            <p className="text-xs text-gray-500">
              Each depends on the lot's legibility; where a property is missing, the gap shows. Ladder order —
              most-defensible first, roadmap last.
            </p>
          </div>

          {/* Aggregate band — the whole book of opportunities in one line, computed from the
              same data the cards render. Visually leading; every figure SIM-chipped. */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border border-gray-100 mb-4"
            style={{ borderLeft: `2px solid ${INDIGO}` }}
          >
            <BandStat
              label="Open capacity"
              value={eur(openCapacityEur)}
              sub={`${openOpportunityCount} open opportunities`}
              color={INDIGO}
            />
            <BandStat
              label="Avg stated yield"
              value={`${weightedYieldPct}%`}
              sub="capacity-weighted APR"
              color={INDIGO}
            />
            <BandStat
              label="Open opportunities"
              value={String(openOpportunityCount)}
              sub="assurance · credit · receivable · pre-sale"
              color={INDIGO}
            />
            <BandStat
              label="Backers this session"
              value={String(sessionBackers)}
              sub="your levers, live"
              color={INDIGO}
            />
          </div>
          <div className="flex items-center gap-1.5 mb-6">
            <ProvenanceChip provenance="SIM" />
            <span className="text-[10px] text-gray-400">
              aggregates of the cards below — the money is simulated and says so; only your session interactions move
              the backer count
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-10">
            {/* ── Card A — Assurance contract (headline, the new build) ── */}
            {assurance && financeIntent && (
              <div
                id={assuranceAnchor}
                className="scroll-mt-20 md:col-span-2 bg-white border border-gray-100 px-4 py-4"
                style={{ borderLeft: `2px solid ${INDIGO}` }}
              >
                <Eyebrow color={INDIGO}>Assurance contract</Eyebrow>
                <div className="flex items-center gap-1.5 mt-0.5 mb-2 flex-wrap">
                  <h3 className="text-sm font-bold text-gray-900">Seedling planting — threshold pledge round</h3>
                  <ProvenanceChip provenance="LIVE" />
                  <span className="text-[10px] text-gray-400">threshold + rate real · fill SIM</span>
                </div>

                {/* Hero yield — the rate is the largest figure on the card (fix 2) */}
                <HeroYield
                  value={`${assurance.settlementTerms.aprPct}% APR`}
                  caption={`· ${assurance.settlementTerms.termMonths}mo · activates once the pledge tips`}
                  confidence={assurance.settlementTerms.confidence}
                  color={INDIGO}
                />
                <p className="text-[10px] text-gray-400 leading-relaxed mb-3">
                  EthicHub / Heifer facility, corroborated by the completed 192,600→212,369.79 USDC cycle. Funds only
                  when the full {eur(assurance.thresholdEur)} assembles — nobody pays otherwise; if the pledge fails to
                  tip everyone is refunded (the dominant variant adds a sponsor-funded bonus, so pledging early is the
                  dominant strategy).
                </p>

                {/* Pledge progress — second position (fix 2); moves live on each SIM pledge (fix 3) */}
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-gray-500">
                    <span className="aq-mono font-semibold text-gray-900">{eur(displayedPledgedEur)}</span> pledged of{" "}
                    <span className="aq-mono text-gray-700">{eur(assurance.thresholdEur)}</span>
                  </span>
                  <span className="text-gray-400">{displayedBackers} backers</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${displayedProgressPct}%`, backgroundColor: INDIGO }}
                  />
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  {displayedProgressPct}% — <span className="uppercase font-semibold">{displayedStatus}</span>
                  {assembled ? (
                    <span> (SIM) — threshold assembled; the facility would now activate.</span>
                  ) : (
                    <span>
                      , still crowding in. Contingent pledges from the same policy-gated actors, each carrying its cited
                      reason.
                    </span>
                  )}
                </div>

                {/* The financier's lever — real interaction, simulated money (fix 3) */}
                <SimActionButton
                  label={assembled ? "Round assembled" : "Back this round"}
                  onClick={() => addSimPledge(assuranceAnchor, SIM_PLEDGE_STEP_EUR, assurance.thresholdEur)}
                  color={INDIGO}
                  disabled={assembled}
                  detail={assembled ? undefined : `+${eur(SIM_PLEDGE_STEP_EUR)} per pledge`}
                />

                <VerifyLine
                  verifies="identity-resolved (registry rail) + origin-attested (lot EUDR fields)"
                  foreclosed="lone-backer risk — contingent pledges crowd in, nobody is exposed alone"
                />
                <CardLinks>
                  <CardLink to={coopHref}>The community raising this round</CardLink>
                  <CardLink to={`${coopHref}#steward`}>Author a pledge round from your seat</CardLink>
                </CardLinks>
              </div>
            )}

            {/* ── Card B — Coop trade-credit line (EthicHub, strongest real anchor) ── */}
            <div
              className="bg-white border border-gray-100 px-4 py-4 flex flex-col"
              style={{ borderLeft: `2px solid ${INDIGO}` }}
            >
              <Eyebrow color={INDIGO}>Trade-credit line</Eyebrow>
              <div className="flex items-center gap-1.5 mt-0.5 mb-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900">Coop revolving credit line</h3>
                <ProvenanceChip provenance="LIVE" />
              </div>

              {/* Hero yield — the facility APR is the card's largest figure (fix 2) */}
              <HeroYield value="9.9% APR" caption="· facility, reported" confidence="reported" color={INDIGO} />
              <p className="text-[11px] text-gray-500 leading-relaxed mb-2">
                A revolving line drawn against confirmed offtake, repaid on harvest — social collateral today, the crop
                itself once it's legible.
              </p>

              {/* Pool state — how much of the receivable base is advanceable (fix 4) */}
              {tf && (
                <PoolBar
                  label="Advanceable of receivable base"
                  filled={tf.financeableEur}
                  total={tf.receivableEur}
                  color={INDIGO}
                  fmt={eur}
                />
              )}

              {/* Track record — Goldfinch four-field spine, real */}
              <div className="bg-gray-50 border border-gray-100 px-3 py-2 mb-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-gray-500">Completed cycle</span>
                  <span className="aq-mono text-gray-900">192,600 → 212,369.79 USDC</span>
                </div>
                <div className="flex items-center justify-between text-[11px] mt-0.5">
                  <span className="text-gray-500">Realized cost of capital</span>
                  <span className="aq-mono text-gray-900">
                    {d.realizedMultiple.toFixed(4)}× · ~{d.realizedPct}%
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 mt-1">
                  Manager scale: &gt;$5M / &gt;10,000 farmers / 6 countries / since 2018.
                </div>
              </div>

              <div className="grid grid-cols-2 gap-px bg-gray-100 mb-2">
                <CardMetric label="Receivable" value={tf ? eur(tf.receivableEur) : "—"} mono />
                <CardMetric
                  label={`Advance @ ${Math.round(ADVANCE_RATE * 100)}%`}
                  value={tf ? eur(tf.financeableEur) : "—"}
                  mono
                />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                Facility APR is LIVE/reported. The coop-projected line is SIM. Bank-proven for commercial producers
                (Agrotoken/Santander); extending to smallholder lots requires Aqueduct's aggregation + credible grading.
              </p>

              <div className="mt-auto">
                <SimActionButton
                  label="Express interest"
                  onClick={() => addSimInterest(TRADE_CREDIT_ID)}
                  color={INDIGO}
                  count={tradeCreditInterest}
                  countLabel="interested this session"
                />
                <VerifyLine
                  verifies="grade-verified (SCA) + intent-fillable (liquidation path)"
                  foreclosed="unsecured-lender loss — a filled sell intent is the repayment source"
                />
                <CardLinks>
                  <CardLink to={coopHref}>The coop that would draw this line</CardLink>
                </CardLinks>
              </div>
            </div>

            {/* ── Card C — Glow Miner receivable (real reported terms, honest exemplar) ── */}
            <div
              className="bg-white border border-gray-100 px-4 py-4 flex flex-col"
              style={{ borderLeft: `2px solid ${INDIGO}` }}
            >
              <Eyebrow color={INDIGO}>Receivable advance</Eyebrow>
              <div className="flex items-center gap-1.5 mt-0.5 mb-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900">Glow Miner receivable</h3>
                <ProvenanceChip provenance="SNAPSHOT" dated="2026-07" />
              </div>

              {/* Hero yield — the Miner's implied multiple is the card's largest figure (fix 2) */}
              <HeroYield
                value={`${miner.yield.netMultiple}×`}
                caption={`· ${usd(miner.yield.principalUsd)} in → ${usd(miner.yield.grossUsd)} gross`}
                confidence={miner.confidence}
                color={INDIGO}
              />
              <p className="text-[11px] text-gray-500 leading-relaxed mb-2">
                Sell a confirmed future cashflow at a discount for cash today — a solar reward stream and a coffee
                receivable are the same instrument shape.
              </p>

              {/* Pool state — no sold-fraction is published for a Miner, so honest term-progress:
                  a fresh position, 0 of its payout weeks elapsed (fix 4) */}
              <PoolBar
                label="Term progress (fresh position)"
                filled={0}
                total={miner.yield.termWeeks}
                color={INDIGO}
                fmt={(n) => `${n}wk`}
              />

              {/* Honest field order: principal → periodic payout → term → gross */}
              <div className="grid grid-cols-2 gap-px bg-gray-100 mb-2">
                <CardMetric label="Principal" value={usd(miner.yield.principalUsd)} mono />
                <CardMetric label="Periodic payout" value={`${miner.yield.glwPerWeek} GLW/wk`} mono />
                <CardMetric label="Term" value={`${miner.yield.termWeeks} weeks`} mono />
                <CardMetric label="Gross payout" value={usd(miner.yield.grossUsd)} mono />
              </div>
              <p className="text-[10px] text-gray-400 leading-relaxed mb-2">
                Priced live off the GLW pool (${glwPrice.usdPerGlw}/GLW). Reported, never "confirmed" — the app.glow.org
                listing is auth-gated, corroborated only by the live OFFCHAIN_FRACTIONS contract.
              </p>

              {/* Coffee-receivable sibling (SIM) */}
              <div className="bg-gray-50 border border-gray-100 px-3 py-2 mb-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[11px] font-semibold text-gray-700">Coffee-receivable sibling</span>
                  <ProvenanceChip provenance="SIM" />
                </div>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  The same shape on a coffee lot: a filled intent's{" "}
                  <span className="aq-mono text-gray-700">{tf ? eur(tf.financeableEur) : "—"}</span> factored over a
                  T+7…T+90 window (receivable × {ADVANCE_RATE}). Closest analog: the Goldfinch reputation-based
                  emerging-market archetype. PayFi ($4.5B+) proves the primitive works in an adjacent lane — not
                  ag-proven yet.
                </p>
              </div>

              <div className="mt-auto">
                <SimActionButton
                  label="Express interest"
                  onClick={() => addSimInterest(MINER_ID)}
                  color={INDIGO}
                  count={minerInterest}
                  countLabel="interested this session"
                />
                <VerifyLine
                  verifies="intent-fillable (a filled intent IS the receivable)"
                  foreclosed="phantom-cashflow risk — the cashflow is a settled intent, not a promise"
                />
                {presales[0] && (
                  <CardLinks>
                    <CardLink to={`/lots/${presales[0].lotId}`}>See a fillable lot</CardLink>
                  </CardLinks>
                )}
              </div>
            </div>

            {/* ── Card D — Lot pre-sales (forward purchases) ── */}
            <div
              className="bg-white border border-gray-100 px-4 py-4 flex flex-col"
              style={{ borderLeft: `2px solid ${INDIGO}` }}
            >
              <Eyebrow color={INDIGO}>Forward pre-sale</Eyebrow>
              <div className="flex items-center gap-1.5 mt-0.5 mb-2 flex-wrap">
                <h3 className="text-sm font-bold text-gray-900">Lot pre-sales</h3>
                <ProvenanceChip provenance="SIM" />
              </div>

              {/* Hero yield — the pre-pay advance rate is the card's largest figure (fix 2) */}
              <HeroYield
                value={`${Math.round(ADVANCE_RATE * 100)}%`}
                caption="· pre-pay advance rate"
                confidence="declared"
                color={INDIGO}
              />
              <p className="text-[11px] text-gray-500 leading-relaxed mb-2">
                A buyer commits (and pre-pays {Math.round(ADVANCE_RATE * 100)}%) against a not-yet-delivered harvest;
                that confirmed offtake is exactly what unlocks the credit line.
              </p>

              {/* Pool state — advance committed against total lot value across open pre-sales (fix 4) */}
              <PoolBar
                label="Advance committed of lot value"
                filled={presaleAdvanceTotalEur}
                total={presaleOfftakeTotalEur}
                color={INDIGO}
                fmt={eur}
              />

              <div className="flex flex-col gap-1 mb-2">
                {presales.map((p) => {
                  const advance = p.committedEur * ADVANCE_RATE;
                  return (
                    <div
                      key={p.lotId}
                      id={`lot-${p.lotId}`}
                      className="scroll-mt-20 bg-gray-50 border border-gray-100 px-3 py-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] text-gray-700 truncate">{p.title}</span>
                        {p.real ? <ProvenanceChip provenance="LIVE" /> : <ProvenanceChip provenance="SIM" />}
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-0.5 text-[10px] text-gray-500 aq-mono">
                        <span>offtake {eur(p.committedEur)}</span>
                        <span>advance now {eur(advance)}</span>
                        <span>balance {eur(p.committedEur - advance)}</span>
                        <Link to={`/lots/${p.lotId}`} className="text-blue-600 hover:text-blue-800 shrink-0">
                          lot →
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-auto">
                <SimActionButton
                  label="Express interest"
                  onClick={() => addSimInterest(PRESALE_ID)}
                  color={INDIGO}
                  count={presaleInterest}
                  countLabel="interested this session"
                />
                <VerifyLine
                  verifies="origin-attested + intent-fillable (the sell intent is the commitment)"
                  foreclosed="delivery-default risk — pre-pay is a fraction, balance on delivery"
                />
              </div>
            </div>

            {/* ── Card E — Equity / community raise (TO-BUILD, honest) ── */}
            <div
              className="px-4 py-4 flex flex-col border border-dashed"
              style={{ borderColor: "#d1d5db", borderLeft: `2px solid ${GREEN}` }}
            >
              <Eyebrow color={GREEN}>Equity round</Eyebrow>
              <div className="flex items-center gap-1.5 mt-0.5 mb-1 flex-wrap">
                <h3 className="text-sm font-bold text-gray-500">Member-equity / community round</h3>
                <ProvenanceChip provenance="TO-BUILD" />
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
                Member-equity / community round — the assurance contract (Card A) is the demo-now crowd-in substitute;
                share issuance is not built. No cap table is fabricated.
              </p>
              <div className="grid grid-cols-1 gap-px bg-gray-50 mb-2">
                <CardMetric
                  label="Indicative round size (projection)"
                  value={tf ? `${eur(tf.receivableEur)} receivable base` : "—"}
                  mono
                  muted
                />
              </div>
              <div className="mt-auto">
                <CardLinks>
                  <CardLink to={`#${assuranceAnchor}`}>Back the assurance round instead (demo-now)</CardLink>
                </CardLinks>
              </div>
            </div>
          </div>

          {/* ════════════ FOR COOPS ════════════ */}
          <div id="for-coops" className="scroll-mt-20 mb-3">
            <h2 className="text-base font-bold text-gray-900">Raise — post a finance intent from your seat</h2>
            <p className="text-xs text-gray-500">
              The supply-side door. Your steward already authors the intent, runs the real solver race, accepts a fill,
              and stops at the honest disabled settle boundary — this reuses it, it doesn't rebuild it.
            </p>
          </div>

          <div className="bg-white border border-gray-200 px-5 py-4 mb-4" style={{ borderLeft: `2px solid ${GREEN}` }}>
            {realSeat ? (
              <p className="text-[11px] text-gray-600 leading-relaxed mb-3">
                Take your seat at{" "}
                <Link to={`${coopHref}#steward`} className="font-semibold text-gray-900 underline hover:text-gray-700">
                  {realSeat.name}
                </Link>{" "}
                and post a <span className="aq-mono">sell-this-lot</span> or{" "}
                <span className="aq-mono">finance-this-planting</span> intent. The swarm works it in four steps:
              </p>
            ) : (
              <p className="text-[11px] text-gray-600 leading-relaxed mb-3">Take your seat and post an intent.</p>
            )}

            {/* The three/four-step diagram — each step names the card it maps to */}
            <div className="grid sm:grid-cols-4 gap-2 mb-3">
              <RaiseStep n="1" title="Publish" body="Author the intent from your steward seat." card="→ your seat" />
              <RaiseStep n="2" title="Threshold opens" body="An assurance round opens the raise." card="Card A" />
              <RaiseStep
                n="3"
                title="Capital crowds in"
                body="Policy-matched credit, receivable, pre-sale."
                card="Cards B–D"
              />
              <RaiseStep n="4" title="Settle" body="On the USDC rail — at the honest boundary." card="→ settle rail" />
            </div>

            {/* What each mechanism means for the coop */}
            <div className="grid sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-gray-500">
              <MeaningLine term="Assurance">nobody pays unless all pay, so early pledges are safe.</MeaningLine>
              <MeaningLine term="Trade-credit">cash now against confirmed offtake, repaid on harvest.</MeaningLine>
              <MeaningLine term="Receivable">your matched intent is factorable.</MeaningLine>
              <MeaningLine term="Pre-sale">
                a buyer pre-pays {Math.round(ADVANCE_RATE * 100)}% before delivery.
              </MeaningLine>
            </div>

            {realSeat && (
              <Link
                to={`${coopHref}#steward`}
                className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold"
                style={{ color: GREEN }}
              >
                Open your steward seat <ArrowRight size={12} />
              </Link>
            )}
          </div>

          {/* ════════════ HOW PRICING WORKS (demoted) ════════════ */}
          <div className="mb-3 mt-10">
            <h2 className="text-base font-bold text-gray-900">How pricing works</h2>
            <p className="text-xs text-gray-500">
              This explains the surface; it isn't the product. The races and the actor book below are the underwriting
              substrate every opportunity card draws from.
            </p>
          </div>

          {/* Solver race — one paragraph */}
          <div className="bg-white border border-gray-100 px-4 py-3 mb-3">
            <h3 className="text-xs font-bold text-gray-900 mb-1">Solver race</h3>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Competition compresses landed cost, not the farmer's FOB — the same deterministic landed-cost computation
              runs on the coop seat and the tour.{" "}
              <Link to="/" className="underline hover:text-gray-700">
                See it on the map
              </Link>
              .
            </p>
          </div>

          {/* Oracle line — one honest GLW-live / GCC-drained strip */}
          <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] px-4 py-2.5 border border-gray-100 bg-gray-50">
            <ProvenanceChip provenance="LIVE" />
            <span className="text-gray-700">
              GLW <span className="aq-mono text-gray-900">${glwPrice.usdPerGlw}</span> (live pool read, $
              {Math.round(glwPrice.liquidityUsd / 1000)}k depth)
            </span>
            <span className="text-gray-300">·</span>
            <ProvenanceChip provenance="SNAPSHOT" dated={gccOracle.fetched_at} />
            <span className="text-gray-700">
              GCC: {gccOracle.verdict} — auction drained, pool dust, so no GCC-denominated instrument can be structured
              today
            </span>
          </div>

          {/* Tokenizer race */}
          <div className="bg-white border border-gray-100 px-4 py-3 mb-3">
            <h3 className="text-xs font-bold text-gray-900 mb-1">
              Tokenizer race — how a receivable becomes a tradable instrument
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              What structuring costs. Same mechanism as the solver race — lowest all-in structuring cost that clears the
              deal-size bar wins. Illustrated at this economy's total declared capital (
              {eur(formations.totalCapitalEur)}) — a real instrument would size off one actual asset. Archetypes are
              modeled on Centrifuge / Maple / Goldfinch / Ondo; fees are labeled estimates. The Glow Miner is the real
              exception — observed-market terms on its own instrument.
            </p>
            <div className="flex flex-col gap-2">
              {d.tokenizerRace.bids.map((b) => {
                const confidence: string | undefined = b.instrument ? b.confidence : b.cost?.lines?.[0]?.confidence;
                const source: string | undefined = b.instrument ? b.source : b.cost?.lines?.[0]?.source;
                return (
                  <div
                    key={b.handle}
                    className="flex items-center justify-between gap-2 bg-white border border-gray-100 px-3.5 py-2.5"
                    style={{ borderLeft: `2px solid ${INDIGO}` }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{b.name}</span>
                        {b.instrument ? (
                          <ProvenanceChip provenance="SNAPSHOT" dated={b.fetched_at} />
                        ) : (
                          <ProvenanceChip provenance="SIM" />
                        )}
                        {b.handle === d.tokenizerRace.winner?.handle && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                            winner
                          </span>
                        )}
                        {confidence && <ConfidenceTag level={confidence} />}
                      </div>
                      <p className="text-[11px] text-gray-500">{b.note}</p>
                      {source && <p className="text-[10px] text-gray-400 truncate">source: {source}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      {b.status === "DECLINED" ? (
                        <span className="aq-status aq-status--failed">DECLINED</span>
                      ) : b.instrument ? (
                        <>
                          <div className="text-xs font-semibold text-gray-900 aq-mono">
                            {usd(b.yield.grossUsd)} gross · {b.yield.netMultiple}×
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {usd(b.yield.principalUsd)} → {b.yield.glwPerWeek} GLW/wk × {b.yield.termWeeks}wk
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xs font-semibold text-gray-900 aq-mono">
                            {eur(b.cost?.allInYear1Eur ?? 0)} ({b.cost?.allInYear1Pct}%)
                          </div>
                          <div className="text-[11px] text-gray-400">{b.cost?.listingDays}d to list</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* The policy-gated actor book — underwriting substrate */}
          <div className="bg-white border border-gray-100 px-4 py-3 mb-3">
            <h3 className="text-xs font-bold text-gray-900 mb-1">The policy-gated actor book</h3>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-3">
              Every opportunity card draws from this book. A match means a lot triggered none of that actor's decline
              rules; every rule cites why — real where a real standard exists (GIIN/IRIS+), internal where it's a
              modeled risk. This is the "never a bare match" discipline LandX and Goldfinch don't have.
            </p>

            {/* Top funding flows */}
            <div className="border border-gray-100 overflow-x-auto mb-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-left">
                    <th className="px-3 py-2 font-medium">Origin</th>
                    <th className="px-3 py-2 font-medium">Actor</th>
                    <th className="px-3 py-2 font-medium text-right">Matched value</th>
                    <th className="px-3 py-2 font-medium text-right">Lots</th>
                  </tr>
                </thead>
                <tbody>
                  {formations.topFlows.slice(0, 12).map((f) => (
                    <tr key={`${f.origin}->${f.actorHandle}`} className="border-t border-gray-50">
                      <td className="px-3 py-1.5 text-gray-700">{f.origin}</td>
                      <td className="px-3 py-1.5 text-gray-700">{f.actorName}</td>
                      <td className="px-3 py-1.5 text-right aq-mono text-gray-900">{eur(f.matchedValueEur)}</td>
                      <td className="px-3 py-1.5 text-right aq-mono text-gray-500">{f.matchedLotCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Network of actors — the anchor rows every #handle deep-link resolves to */}
            <div className="flex flex-col gap-2">
              {formations.actors.map((a) => (
                <ActorRow key={a.handle} actor={a} expanded anchor />
              ))}
            </div>
          </div>

          <p className="text-[11px] text-gray-400 mt-6">
            Roster: <code className="aq-mono">sim/buyerRoster.mjs</code> ({CAPITAL_ROSTER.length} actors, SIM).
            Assurance: <code className="aq-mono">sim/assuranceContract.mjs</code> (threshold + terms real, fill SIM).
            Matching engine: <code className="aq-mono">sim/policy.mjs</code> — the same engine the{" "}
            <Link to="/" className="underline hover:text-gray-600">
              solver race
            </Link>{" "}
            runs. No second roster: pledgers, lenders, and buyers are the same policy-gated actors, so every match cites
            its reason.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ── Shared card-anatomy primitives ──

function Eyebrow({ color, children }: { color: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color }}>
      {children}
    </div>
  );
}

function ConfidenceTag({ level }: { level: string }): React.ReactElement {
  return (
    <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-gray-100 text-gray-500">
      {level}
    </span>
  );
}

/**
 * The hero number on every opportunity card (fix 2) — the rate/yield/multiple/advance-rate,
 * rendered as the card's largest figure in the deck's stat-number treatment: big, weight 700,
 * account color, with its confidence tag adjacent. No gradient, no motion — weight and color
 * carry it.
 */
function HeroYield({
  value,
  caption,
  confidence,
  color,
}: { value: string; caption?: string; confidence?: string; color: string }): React.ReactElement {
  return (
    <div className="flex items-baseline gap-2 flex-wrap mb-1.5">
      <span className="aq-mono leading-none" style={{ color, fontSize: "1.9rem", fontWeight: 700 }}>
        {value}
      </span>
      {confidence && <ConfidenceTag level={confidence} />}
      {caption && <span className="text-[11px] text-gray-500">{caption}</span>}
    </div>
  );
}

/** Pool-state idiom (fix 4): an "X of Y" line over a thin capacity bar — capacity/remaining
 *  on the facility, advance-vs-value on pre-sales, term-progress on the Miner. */
function PoolBar({
  label,
  filled,
  total,
  color,
  fmt,
}: {
  label: string;
  filled: number;
  total: number;
  color: string;
  fmt?: (n: number) => string;
}): React.ReactElement {
  const pct = total > 0 ? Math.min(100, Math.round((filled / total) * 100)) : 0;
  const show = fmt ?? ((n: number) => String(n));
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
        <span>{label}</span>
        <span className="aq-mono">
          <span className="text-gray-900 font-semibold">{show(filled)}</span> of {show(total)}
        </span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

/**
 * The prominent per-opportunity action (fix 3) — a real interaction, honestly simulated. The
 * SIM chip rides on the button itself: the interaction is real, the money is simulated and
 * says so. "Back this round" pledges; "Express interest" logs a quiet count. No motion.
 */
function SimActionButton({
  label,
  onClick,
  color,
  disabled,
  detail,
  count,
  countLabel,
}: {
  label: string;
  onClick: () => void;
  color: string;
  disabled?: boolean;
  detail?: string;
  count?: number;
  countLabel?: string;
}): React.ReactElement {
  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white hover:brightness-95 disabled:opacity-50"
        style={{ backgroundColor: color }}
      >
        <HandCoins size={13} weight="bold" /> {label}
        <span className="text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded bg-white/25">SIM</span>
      </button>
      {detail && <span className="text-[10px] text-gray-400">{detail}</span>}
      {count != null && count > 0 && (
        <span className="text-[10px] text-gray-500 aq-mono">
          {count} {countLabel}
        </span>
      )}
    </div>
  );
}

/** One cell of the leading aggregate band (fix 5) — muted-stat-row idiom, the value in the
 *  account color so the whole-book yield reads at a glance. */
function BandStat({
  label,
  value,
  sub,
  color,
}: { label: string; value: string; sub?: string; color: string }): React.ReactElement {
  return (
    <div className="bg-cardBackground px-3 py-2.5">
      <div className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{label}</div>
      <div className="text-base font-bold aq-mono leading-tight" style={{ color }}>
        {value}
      </div>
      {sub && <div className="text-[10px] text-gray-400 mt-0.5 truncate">{sub}</div>}
    </div>
  );
}

function CardMetric({
  label,
  value,
  mono,
  muted,
}: { label: string; value: string; mono?: boolean; muted?: boolean }): React.ReactElement {
  return (
    <div className="bg-cardBackground px-3 py-2">
      <div className="text-[10px] text-gray-400">{label}</div>
      <div className={`text-xs font-bold ${muted ? "text-gray-500" : "text-gray-900"} ${mono ? "aq-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function VerifyLine({ verifies, foreclosed }: { verifies: string; foreclosed: string }): React.ReactElement {
  return (
    <div className="mt-2 pt-2 border-t border-gray-50">
      <p className="text-[10px] text-gray-500 leading-relaxed">
        <span className="font-semibold text-gray-700">What verifies it:</span> {verifies}
      </p>
      <p className="text-[10px] text-gray-400 leading-relaxed mt-0.5">
        <span className="font-semibold">Failure foreclosed:</span> {foreclosed}
      </p>
    </div>
  );
}

function CardLinks({ children }: { children: React.ReactNode }): React.ReactElement {
  return <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">{children}</div>;
}

function CardLink({ to, children }: { to: string; children: React.ReactNode }): React.ReactElement {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-0.5 text-[11px] font-medium text-blue-600 hover:text-blue-800"
    >
      {children} <ArrowUpRight size={11} />
    </Link>
  );
}

function RaiseStep({
  n,
  title,
  body,
  card,
}: { n: string; title: string; body: string; card: string }): React.ReactElement {
  return (
    <div className="bg-gray-50 border border-gray-100 px-3 py-2">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-[10px] font-bold text-gray-400">{n}</span>
        <span className="text-[11px] font-semibold text-gray-800">{title}</span>
      </div>
      <p className="text-[10px] text-gray-500 leading-tight mb-1">{body}</p>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-gray-400">{card}</span>
    </div>
  );
}

function MeaningLine({ term, children }: { term: string; children: React.ReactNode }): React.ReactElement {
  return (
    <div>
      <span className="font-semibold text-gray-700">{term}</span> — {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  unit,
  chip,
}: { label: string; value: string; unit?: string; chip?: React.ReactNode }): React.ReactElement {
  return (
    <div className="bg-cardBackground border border-gray-100 px-3 py-2.5">
      <div className="flex items-center justify-between gap-1 mb-0.5">
        <div className="text-[10px] text-gray-400 uppercase tracking-wide truncate">{label}</div>
        {chip}
      </div>
      <div className="text-sm font-semibold text-gray-900 aq-mono leading-tight">{value}</div>
      {unit && <div className="text-[10px] text-gray-400 mt-0.5">{unit}</div>}
    </div>
  );
}

interface ActorLike {
  handle: string;
  name: string;
  kind: string;
  capitalEur: number;
  note: string;
  matchedLotCount: number;
  matchedVolumeKg: number;
  matchedValueEur: number;
  matchRatePct: number;
  citedFailureModes: string[];
  citedStandardNames: string[];
}

function ActorRow({
  actor,
  expanded,
  anchor,
}: { actor: ActorLike; expanded?: boolean; anchor?: boolean }): React.ReactElement {
  const color = KIND_COLOR[actor.kind] ?? "#6b7280";
  return (
    <div
      id={anchor ? actor.handle : undefined}
      className="scroll-mt-20 bg-white border border-gray-100 px-3.5 py-3"
      style={{ borderLeft: `2px solid ${color}` }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: `${color}18`, color }}
          >
            {KIND_LABEL[actor.kind] ?? actor.kind}
          </span>
          <h4 className="text-sm font-semibold text-gray-900 truncate">{actor.name}</h4>
          <ProvenanceChip provenance="SIM" />
        </div>
        <span className="text-xs font-semibold text-gray-700 aq-mono flex-shrink-0">{eur(actor.capitalEur)}</span>
      </div>
      <p className="text-[11px] text-gray-500 mb-1.5">{actor.note}</p>
      <div className="flex items-center gap-3 text-[11px] text-gray-500 aq-mono">
        <span>
          matched <span className="text-gray-900 font-medium">{actor.matchedLotCount}</span> lots ({actor.matchRatePct}
          %)
        </span>
        <span>
          value <ValueOrDash value={eur(actor.matchedValueEur)} />
        </span>
      </div>
      {expanded && (actor.citedFailureModes.length > 0 || actor.citedStandardNames.length > 0) && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {actor.citedStandardNames.map((s) => (
            <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-700 font-medium">
              cites: {s}
            </span>
          ))}
          {actor.citedFailureModes.map((f) => (
            <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
              cites: {f}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
