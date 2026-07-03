import { ArrowLeft, ArrowUpRight, Handshake, Package, Pulse, Receipt, UsersThree } from "@phosphor-icons/react";
import type React from "react";
import { useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Footer from "../../Footer";
import Header from "../../Header";
import { ProvenanceChip } from "../components/Chips";
import {
  type AqueductActor,
  type AqueductAnyLot,
  type AqueductEvent,
  type AqueductIntent,
  type EthicHubClaim,
  useAqueductEconomy,
} from "../hooks/useAqueductEconomy";
import { buildFinanceIntent } from "../sim/financeIntent.mjs";
import { deriveEudrStatus } from "../state/aqueductFiltersStore";

/**
 * The ontology, as a living page. AqueductX's types were an unlabeled REA
 * (Resource–Event–Agent) model; this page labels each of the five concepts,
 * gives its plain-language definition and its AqueductX type, and renders a
 * REAL example straight from `useAqueductEconomy` — an actual lot, an actual
 * open intent with its Kiva-template ask line, an actual typed Claim carrying
 * EthicHub's real 9.9% rate. No lorem: everything below the definitions is the
 * same data the map draws. The argument this page only states lives in
 * docs/research/12-value-chain-and-swarm-thesis.md.
 */
export default function AqueductOntology(): React.ReactElement {
  const { lots, realLots, intents, actors, events } = useAqueductEconomy();

  // Real Economic Resource: prefer a LIVE/SNAPSHOT EthicHub anchor; the seeded
  // economy's deterministic lots are the guaranteed fallback so the page is
  // never blank on the first render before the anchor fetch resolves.
  const lot: AqueductAnyLot | undefined = realLots[0] ?? lots[0];

  // Real Agent: a real (LIVE) cooperative community if the anchors have loaded,
  // else the open-reference backstop solver (always present), else anything.
  const actor: AqueductActor | undefined = useMemo(
    () =>
      actors.find((a) => a.kind === "coop" && a.provenance === "LIVE") ??
      actors.find((a) => a.id === "@solver-backstop") ??
      actors[0],
    [actors],
  );

  // Real Commitment + Claim: the finance-this-planting intent carries both the
  // Kiva-template ask line (its title) and the typed EthicHubClaim (9.9%). It is
  // only assembled by useAqueductEconomy once the real anchor lot has fetched, so
  // until then we fall back to buildFinanceIntent() — the exact function the hook
  // calls — passing the already-resolved `lot` (which itself falls back to a
  // deterministic sim lot that DOES carry an `eudr` object; passing the raw
  // undefined anchor would throw inside evaluatePolicy). Either path is real,
  // deterministic economy data.
  const financeExample = useMemo(() => {
    const fromEconomy = intents.find(
      (i): i is AqueductIntent & { claim: EthicHubClaim } =>
        i.intentType === "finance-this-planting" && !!i.claim && "aprPct" in i.claim,
    );
    if (fromEconomy) {
      return {
        askLine: fromEconomy.title,
        detail: fromEconomy.detail,
        status: fromEconomy.status ?? "open",
        provenance: fromEconomy.provenance,
        claim: fromEconomy.claim,
      };
    }
    if (!lot) return null;
    const built = buildFinanceIntent(lot);
    const claim = built.claim as EthicHubClaim;
    return {
      askLine: `Finance — ${built.seedlings.toLocaleString()} seedlings, ${built.community}`,
      detail: `€${built.totalEur.toLocaleString()} agroforestry renovation → ${built.venue.name}`,
      status: "open" as const,
      provenance: "SIM" as const,
      claim,
    };
  }, [intents, lot]);

  // Real Economic Event: a LIVE source read if present, else the newest event.
  const event: AqueductEvent | undefined = useMemo(
    () => events.find((e) => e.provenance === "LIVE") ?? events[0],
    [events],
  );

  return (
    <>
      <Helmet>
        <title>The ontology · AqueductX</title>
        <meta
          name="description"
          content="AqueductX's data model is REA (Resource–Event–Agent) with typed Claims. Five concepts, each with its plain-language definition, its AqueductX type, and a real example rendered from the live economy."
        />
      </Helmet>
      <Header />
      <div className="main-container">
        <div className="pt-[70px] md:pt-[60px] pb-12 max-w-[760px] mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-4">
            <ArrowLeft size={12} /> Back to the map
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">The ontology</h1>
          <p className="text-sm text-gray-500 mb-6">
            The map draws an economy. This page names its five parts — and shows a real one of each.
          </p>

          {/* ── Preamble ── */}
          <Section title="Why a data model, not a schema dump">
            <p>
              AqueductX's types were an <strong>unlabeled REA model</strong> — Resource, Event, Agent (McCarthy 1982,
              operationalized by Valueflows). Labeling them is what turns "map the value chain" from a slogan into
              schema decisions. It also surfaced one object the base ontology was missing entirely: the{" "}
              <strong>Claim</strong>, the deferred half of a financing. Five concepts follow. Each carries its
              plain-language meaning, the AqueductX type that implements it, and a real example pulled live from the
              same economy the map reads — not an illustration.
            </p>
          </Section>

          {/* ── 1. Economic Resource ── */}
          <Concept
            icon={<Package size={16} weight="duotone" />}
            n="1"
            rea="Economic Resource"
            type="AqueductAnyLot"
            definition="Something of value that can be acted on — held, moved, sold, financed. In AqueductX a Resource is a lot: a commodity, a weight, an origin, a price, and the EUDR evidence attached to it."
          >
            {lot ? (
              <Example>
                <ExampleHead
                  title={lot.title_redacted}
                  chip={<ProvenanceChip provenance={lot.provenance ?? "SNAPSHOT"} />}
                />
                <FieldRow label="commodity" value={lot.commodity ?? "coffee"} />
                <FieldRow
                  label="price"
                  value={
                    lot.price
                      ? `${lot.price.amount} ${lot.price.currency}/${lot.price.unit} ${lot.price.incoterm}`
                      : "—"
                  }
                />
                <FieldRow label="SCA score" value={lot.quality?.sca_score ?? "—"} />
                <FieldRow label="EUDR status" value={deriveEudrStatus(lot)} />
              </Example>
            ) : (
              <LoadingNote />
            )}
          </Concept>

          {/* ── 2. Agent ── */}
          <Concept
            icon={<UsersThree size={16} weight="duotone" />}
            n="2"
            rea="Agent"
            type="AqueductActor (+ demand hubs)"
            definition="Anyone who makes or fulfils a commitment: a cooperative, a solver, a financing venue, a piece of infrastructure, an import hub. Agents don't own the map — they act on it."
          >
            {actor ? (
              <Example>
                <ExampleHead title={actor.name} chip={<ProvenanceChip provenance={actor.provenance} />} />
                <FieldRow label="kind" value={actor.kind} />
                <FieldRow label="role" value={actor.role} />
              </Example>
            ) : (
              <LoadingNote />
            )}
          </Concept>

          {/* ── 3. Commitment ── */}
          <Concept
            icon={<Handshake size={16} weight="duotone" />}
            n="3"
            rea="Commitment"
            type="AqueductIntent"
            definition="A promise about a future economic event — the thing a farmer or coop publishes. Three kinds: sell-this-lot, finance-this-planting, finance-this-farm. They are one species; they differ only in which side of the exchange is deferred."
          >
            {financeExample ? (
              <Example>
                <ExampleHead
                  title={financeExample.askLine}
                  chip={<ProvenanceChip provenance={financeExample.provenance} />}
                />
                <FieldRow label="intent type" value="finance-this-planting" />
                <FieldRow label="status" value={financeExample.status} />
                <FieldRow label="ask" value={financeExample.detail} />
                <p className="text-[11px] text-gray-400 leading-relaxed mt-1.5">
                  The single-sentence ask is a Kiva-template convention AqueductX designed — EthicHub publishes no
                  per-farmer dollar-ask card. The numbers in it are real; the sentence wrapping them is ours.
                </p>
              </Example>
            ) : (
              <LoadingNote />
            )}
          </Concept>

          {/* ── 4. Economic Event ── */}
          <Concept
            icon={<Pulse size={16} weight="duotone" />}
            n="4"
            rea="Economic Event"
            type="AqueductEvent"
            definition="A commitment, fulfilled — the thing that actually happened. A scout pinning a lot, a diligence agent running an EUDR check, an oracle setting a floor, a solver filling a route. The feed is the running log of these."
          >
            {event ? (
              <Example>
                <ExampleHead title={event.summary} chip={<ProvenanceChip provenance={event.provenance} />} />
                <FieldRow label="agent" value={event.actor} />
                <FieldRow label="verb" value={event.verb} />
                <FieldRow label="when" value={new Date(event.ts).toISOString().slice(0, 16).replace("T", " ")} />
                {event.url ? (
                  <div className="mt-1">
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5 text-[11px]"
                    >
                      source <ArrowUpRight size={10} />
                    </a>
                  </div>
                ) : null}
              </Example>
            ) : (
              <LoadingNote />
            )}
          </Concept>

          {/* ── 5. Claim ── */}
          <Concept
            icon={<Receipt size={16} weight="duotone" />}
            n="5"
            rea="Claim — the missing object"
            type="AqueductFinanceClaim (EthicHubClaim | GlowClaim)"
            definition="The deferred half of a financing. When capital moves now against repayment later — at a rate and a term — REA calls that promise a Claim. A sale creates no Claim; a loan does. This is the object the base ontology was missing, now typed."
          >
            {financeExample ? (
              <Example>
                <ExampleHead
                  title={`€${financeExample.claim.principalEur.toLocaleString()} principal`}
                  chip={<ConfidenceTag level={financeExample.claim.confidence} />}
                />
                <FieldRow label="rate" value={`${financeExample.claim.aprPct}% APR`} />
                <FieldRow label="term" value={`${financeExample.claim.termMonths} months`} />
                <FieldRow label="confidence" value={financeExample.claim.confidence} />
                <p className="text-[11px] text-gray-400 leading-relaxed mt-1.5">
                  Source: {financeExample.claim.source}
                </p>
              </Example>
            ) : (
              <LoadingNote />
            )}
          </Concept>

          {/* ── Why this matters ── */}
          <Section title="Why this matters">
            <p>
              Selling a lot and financing a planting look like two different products. Under REA they are one species of
              exchange — both are Commitments between Agents about Resources — differing only in whether reciprocity is
              immediate (a sale) or deferred (a Claim). Naming the Claim is what lets AqueductX treat "sell my harvest"
              and "finance my next one" as the same primitive instead of two features bolted together. That is the
              schema decision behind the whole layer. See it drawn on the{" "}
              <Link to="/" className="text-blue-500 hover:text-blue-700">
                map
              </Link>{" "}
              — where these five objects become circuits, halos, and arcs — or read the full argument in{" "}
              <a
                href="https://github.com/Ecofrontiers/aqueduct/blob/main/docs/research/12-value-chain-and-swarm-thesis.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5"
              >
                docs/research/12 <ArrowUpRight size={10} />
              </a>
              .
            </p>
          </Section>

          <div className="hidden md:block mt-8">
            <Footer />
          </div>
        </div>
      </div>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-7">
      <h2 className="text-sm font-bold text-gray-900 mb-2">{title}</h2>
      <div className="text-[13px] text-gray-600 leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

function Concept({
  icon,
  n,
  rea,
  type,
  definition,
  children,
}: {
  icon: React.ReactNode;
  n: string;
  rea: string;
  type: string;
  definition: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-600">
          {icon}
        </span>
        <h2 className="text-sm font-bold text-gray-900">
          <span className="text-gray-400 mr-1.5">{n}</span>
          {rea}
        </h2>
      </div>
      <div className="text-[11px] text-gray-500 mb-2">
        AqueductX type: <span className="aq-mono text-gray-700">{type}</span>
      </div>
      <p className="text-[13px] text-gray-600 leading-relaxed mb-3">{definition}</p>
      {children}
    </div>
  );
}

function Example({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 px-3.5 py-3">
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-2">live example — from the economy</div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ExampleHead({ title, chip }: { title: string; chip: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-1.5">
      <div className="text-xs font-semibold text-gray-900 leading-snug">{title}</div>
      <span className="shrink-0">{chip}</span>
    </div>
  );
}

function FieldRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-3 text-xs">
      <span className="shrink-0 w-24 text-gray-400">{label}</span>
      <span className="text-gray-700">{value}</span>
    </div>
  );
}

function ConfidenceTag({ level }: { level: string }) {
  return <span className="aq-join-confidence">{level}</span>;
}

function LoadingNote() {
  return (
    <div className="bg-white border border-gray-100 px-3.5 py-3 text-[11px] text-gray-400">
      Loading the anchor economy…
    </div>
  );
}
