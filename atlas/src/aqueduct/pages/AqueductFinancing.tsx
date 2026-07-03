import { ArrowLeft } from "@phosphor-icons/react";
import type React from "react";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Footer from "../../Footer";
import Header from "../../Header";
import { ProvenanceChip, ValueOrDash } from "../components/Chips";
import { getGccOracleState, getGlwPriceSnapshot } from "../connectors/glow.mjs";
import { useAqueductLots } from "../hooks/useAqueductLots";
import { CAPITAL_ROSTER } from "../sim/buyerRoster.mjs";
import { runCapitalFormationsMatch } from "../sim/capitalFormations.mjs";
import { getEconomy } from "../sim/economy.mjs";
import { runTokenizerRace } from "../sim/tokenizerRoster.mjs";

const KIND_LABEL: Record<string, string> = { buyer: "Buyer", grant: "Grant", fund: "Fund" };
// Hue encodes account DIRECTION, the way the map's legend teaches it — not actor taxonomy
// (the eyebrow label below still carries the kind). Buyers + funds are exogenous capital
// entering from outside → capitalExo indigo (the same #4f46e5 the map's capital halos use).
// Grants are the endogenous/allocated side → #059669 green. The map's venue/solver purple
// (#9333ea) does NOT appear here: there are no venues on this page.
const KIND_COLOR: Record<string, string> = { buyer: "#4f46e5", grant: "#059669", fund: "#4f46e5" };

function eur(n: number): string {
  return `€${Math.round(n).toLocaleString()}`;
}

function usd(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

/**
 * The financing view — institutional capital (buyers/grants/funds) matched against the
 * real anchor lot + full seeded synthetic economy, via the same PolicyRule engine that
 * gates the solver race (sim/policy.mjs). "Matching of conditions": every match or
 * decline here is a real, explainable PolicyVerdict, never a bare pass/fail — same
 * "never a bare match" discipline as buyerAgent.mjs's single-buyer criteria rows.
 *
 * Everything on this page is SIM: real lot data, real GIIN/IRIS+ citations where a rule
 * carries one, but the buyers/grants/funds themselves are synthetic — no capability shown
 * live that isn't (FABLE-KICKOFF.md).
 */
export default function AqueductFinancing(): React.ReactElement {
  const { lots: realLots } = useAqueductLots({ liveRefetch: false });

  const formations = useMemo(() => {
    const economy = getEconomy();
    const lots = [...(realLots ?? []), ...economy.lots];
    return runCapitalFormationsMatch(lots);
  }, [realLots]);

  // Tokenizer race: same mechanism as the solver race, applied to structuring an
  // investable instrument instead of moving a lot. Illustrated at the scale of this
  // economy's total declared capital — a real instrument size would come from an
  // actual asset/org's value, not this pool total, but the race mechanism is identical
  // either way.
  const tokenizerRace = useMemo(
    () => runTokenizerRace({ instrumentValueEur: formations.totalCapitalEur }),
    [formations.totalCapitalEur],
  );

  // Glow oracle registers — one honest line: GLW has a healthy live pool read; GCC has no
  // usable register today (auction drained, pool dust). Both are pure snapshot reads.
  const glwPrice = getGlwPriceSnapshot();
  const gccOracle = getGccOracleState();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>Financing | Aqueduct</title>
        <meta
          name="description"
          content="Institutional capital — buyers, grants, and funds — matched against smallholder lots by explainable policy conditions, not a bare match."
        />
      </Helmet>
      <Header />

      <div className="main-container flex-1">
        <div className="pt-[70px] md:pt-[60px] pb-12 max-w-[760px] mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-4">
            <ArrowLeft size={12} /> Back to the map
          </Link>

          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">Financing</h1>
            <ProvenanceChip provenance="SIM" />
          </div>
          <p className="text-sm text-gray-600 mb-1.5">
            This is the <strong className="font-semibold text-gray-800">capital account</strong> — the financing that
            mirrors the map's{" "}
            <Link to="/guide" className="underline hover:text-gray-800">
              goods account
            </Link>
            . Capital forms at the <span className="font-medium text-gray-800">fill → settle</span> boundary: after a
            coop aggregates lots and publishes an intent, this is where the money that clears it comes from. Matched
            against every lot by the same policy engine that gates the{" "}
            <Link to="/" className="underline hover:text-gray-800">
              solver race
            </Link>
            .
          </p>
          <p className="text-[11px] text-gray-400 mb-6">
            A match means a lot triggered none of that actor's decline rules; every rule cites why — real where a real
            standard exists (GIIN/IRIS+), internal where it's a modeled risk. Never a bare match.
          </p>

          {/* ── Summary stat row ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
            <StatTile label="Total capital" value={eur(formations.totalCapitalEur)} />
            {Object.entries(formations.byKind).map(([kind, b]) => (
              <StatTile key={kind} label={`${KIND_LABEL[kind] ?? kind}s`} value={`${b.count} · ${eur(b.capitalEur)}`} />
            ))}
          </div>
          {/* ── Inline account-color legend (keyed to the map's palette, taught like MapLegend) ── */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-gray-400 mb-8">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#4f46e5" }} />
              indigo = exogenous capital (same account color the map halos use)
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: "#059669" }} />
              green = grant / endogenous
            </span>
          </div>

          {/* ── Top grants ── */}
          <Section n="1" title="Top grants" subtitle="Ranked by declared pool size">
            <div className="flex flex-col gap-2">
              {formations.topGrants.map((g) => (
                <ActorRow key={g.handle} actor={g} />
              ))}
            </div>
          </Section>

          {/* ── Top funding flows ── */}
          <Section n="2" title="Top funding flows" subtitle="Origin region → capital actor, by matched lot value">
            <div className="border border-gray-100 overflow-x-auto">
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
                  {formations.topFlows.slice(0, 15).map((f) => (
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
          </Section>

          {/* ── Network of actors: every buyer/grant/fund, conditions shown ── */}
          <Section n="3" title="Network of actors" subtitle="Every capital actor and the conditions it matches against">
            <div className="flex flex-col gap-2">
              {formations.actors.map((a) => (
                <ActorRow key={a.handle} actor={a} expanded anchor />
              ))}
            </div>
          </Section>

          {/* ── Tokenizer race: the solver-race mechanism, applied to structuring an
            investable instrument instead of moving a lot ── */}
          <Section
            n="4"
            title="Tokenizer race"
            subtitle="Same mechanism as the solver race — lowest all-in structuring cost that clears the deal-size bar wins"
          >
            <div className="mb-2 text-[11px] text-gray-400">
              Illustrated at this economy's total declared capital ({eur(formations.totalCapitalEur)}) — a real
              instrument would size off one actual asset or org, not this pool total. Archetypes are modeled on real RWA
              tokenization platforms (Centrifuge, Maple, Goldfinch, Ondo); fee figures are labeled estimates, not those
              platforms' actual quoted terms. The Glow Miner is the exception — real observed-market terms on its own
              instrument.
            </div>

            {/* ── Glow oracle registers: one honest line ── */}
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] px-3 py-2 border border-gray-100 bg-gray-50">
              <ProvenanceChip provenance="LIVE" />
              <span className="text-gray-700">
                GLW <span className="aq-mono text-gray-900">${glwPrice.usdPerGlw}</span> (live pool read, $
                {Math.round(glwPrice.liquidityUsd / 1000)}k depth)
              </span>
              <span className="text-gray-300">·</span>
              <ProvenanceChip provenance="SNAPSHOT" dated={gccOracle.fetched_at} />
              <span className="text-gray-700">
                GCC: {gccOracle.verdict} — auction drained, pool dust, so no GCC-denominated instrument can be
                structured today
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {tokenizerRace.bids.map((b) => {
                const confidence: string | undefined = b.instrument ? b.confidence : b.cost?.lines?.[0]?.confidence;
                const source: string | undefined = b.instrument ? b.source : b.cost?.lines?.[0]?.source;
                return (
                  <div
                    key={b.handle}
                    className="flex items-center justify-between gap-2 bg-white border border-gray-100 px-3.5 py-2.5"
                    style={{ borderLeft: "2px solid #4f46e5" }}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-gray-900 truncate">{b.name}</span>
                        {b.instrument ? (
                          <ProvenanceChip provenance="SNAPSHOT" dated={b.fetched_at} />
                        ) : (
                          <ProvenanceChip provenance="SIM" />
                        )}
                        {b.handle === tokenizerRace.winner?.handle && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-50 text-green-700">
                            winner
                          </span>
                        )}
                        {confidence && (
                          <span className="text-[9px] font-semibold uppercase tracking-wide px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                            {confidence}
                          </span>
                        )}
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
          </Section>

          <p className="text-[11px] text-gray-400 mt-6">
            Roster: <code className="aq-mono">sim/buyerRoster.mjs</code> ({CAPITAL_ROSTER.length} actors, SIM). Matching
            engine: <code className="aq-mono">sim/policy.mjs</code> — the same engine the{" "}
            <Link to="/" className="underline hover:text-gray-600">
              solver race
            </Link>{" "}
            runs.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="bg-cardBackground border border-gray-100 px-3 py-2.5">
      <div className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">{label}</div>
      <div className="text-sm font-semibold text-gray-900 aq-mono">{value}</div>
    </div>
  );
}

function Section({
  n,
  title,
  subtitle,
  children,
}: {
  n: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="mb-8">
      <div className="mb-2">
        <h2 className="text-sm font-bold text-gray-900">
          <span className="text-gray-400 mr-1.5">{n}</span>
          {title}
        </h2>
        <p className="text-[11px] text-gray-400">{subtitle}</p>
      </div>
      {children}
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
      // Only the Network-of-actors instance carries the deep-link id — a grant can
      // also appear under Top grants, and duplicate DOM ids break #handle anchors.
      id={anchor ? actor.handle : undefined}
      className="bg-white border border-gray-100 px-3.5 py-3"
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
