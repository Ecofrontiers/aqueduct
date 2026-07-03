import { ArrowLeft, ArrowUpRight, Cpu, Repeat, ShieldCheck, Truck, Users } from "@phosphor-icons/react";
import type React from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Footer from "../../Footer";
import Header from "../../Header";
import { ProvenanceChip } from "../components/Chips";
import { ACCOUNT_COLORS } from "../components/accountColors";

const stats = [
  { value: "2", label: "Live Platform Reads" },
  { value: "1,263", label: "Lots Across Two Verticals" },
  { value: "50", label: "Cited Failure Modes" },
  { value: "$50K", label: "Sentient Foundation Ask" },
];

const coordinationVectors = [
  {
    name: "Price",
    detail: "One shared landed-cost function every solver bids through, not five private negotiations.",
  },
  {
    name: "Risk signal",
    detail: "One canonical, verified lot read once by every institution, not re-diligenced N times.",
  },
  {
    name: "Capital search",
    detail: "One posted intent, matched against every buyer, grant, and fund at once, not sequential shopping.",
  },
  {
    name: "Collateral integrity",
    detail: "A content-addressed lot id makes double-pledging visible instead of invisible.",
  },
  {
    name: "Compliance reporting",
    detail: "A real GIIN/IRIS+ citation, measured once, referenced by any funder who accepts that standard.",
  },
];

const whyRows = [
  {
    icon: Cpu,
    name: "Cited declines",
    body: "Every institutional decline or reprice cites a real, checkable source — a GIIN/IRIS+ standard, or a named failure mode from the AI Mechanism Atlas, not an invented risk score.",
  },
  {
    icon: Truck,
    name: "One blended quote",
    body: "Freight, customs, and certification are one blended quote from the same shared reference engine every solver bids through, never invented for the page that shows it.",
  },
  {
    icon: Repeat,
    name: "One economic grammar",
    body: "A lot is an economic resource, an intent a commitment, a fill an event; financing creates a claim — capital now, repayment later at a stated rate and term. Selling a lot and financing a planting are the same kind of exchange, not two unrelated features.",
  },
  {
    icon: Users,
    name: "Swarm decision-support",
    body: "In category terms, a swarm decision-support system for agricultural trade finance: many small agents aggregate, verify, price, and match; people and institutions make the allocation call; settlement is the action taken.",
  },
  {
    icon: ShieldCheck,
    name: "Privacy by design",
    body: "The map proves EUDR status without exposing the farmer behind it — status renders, plot geometry never does, names appear as initials by design. Knowledge sufficient to enable a right, and no more.",
  },
];

/**
 * Reading the map — the full documentation of Aqueduct's visual language.
 * The on-map legend is the 30-second version; this page is the argument.
 * The map is drawn as a balance of payments: two circuits over one earth,
 * capital state worn as halos, honesty carried as chips.
 */
export default function AqueductMapGuide(): React.ReactElement {
  return (
    <>
      <Helmet>
        <title>Docs · AqueductX</title>
        <meta
          name="description"
          content="What AqueductX is, what it coordinates, and how to read the map it draws — a peer-to-peer logistics and finance layer for smallholder farmers, documented as a balance of payments."
        />
      </Helmet>
      <Header />
      <div className="main-container">
        <div className="pt-[70px] md:pt-[60px] pb-12 max-w-[760px] mx-auto px-4">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 mb-4">
            <ArrowLeft size={12} /> Back to the map
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">Docs</h1>
          <p className="text-sm text-gray-500 mb-6">
            What AqueductX is, what it coordinates, and how to read the map it draws.
          </p>

          {/* ── What this is ── */}
          <Section title="What this is">
            <p>
              AqueductX is a generalized peer-to-peer logistics and finance layer for smallholder farmers: agents
              aggregate, verify, and price commodity lots, and intents match and settle them. A common API for green
              investment — real where it touches the world, simulated and labeled where it doesn't yet.
            </p>
            <p>
              The global trade-finance gap is $2.5 trillion (ADB, 2022, still $2.5T in the January 2026 survey).
              Smallholder finance alone is short $200B+ a year: ~$323B in demand against ~$95B in supply (ISF Advisors,
              2025). Reported trade-finance fraud topped $10B in 2020 (GLEIF/MonetaGo). The gap is a legibility gap
              before it's a capital gap. A smallholder can't afford to verify a lot to the standard an institution
              demands. Every buyer who looks re-proves the same lot from scratch. And a lot pledged twice can't be
              caught. Aggregating, verifying, pricing, matching, and settling are exactly the tasks AI now performs
              cheaply, at any scale.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-100 border border-gray-100 mt-1">
              {stats.map((s) => (
                <div key={s.label} className="bg-white px-3 py-4 text-center">
                  <div className="text-xl font-bold tracking-tight text-gray-900">{s.value}</div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-gray-400 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── What it coordinates ── */}
          <Section title="What it coordinates">
            <p>
              An intent isn't one number. It's five vectors that normally get renegotiated separately at every hop
              between a smallholder's lot and the market that consumes it. Posting them together, once, is where the
              saving lives.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
              {coordinationVectors.map((v) => (
                <div key={v.name} className="bg-white border border-gray-100 px-3.5 py-3">
                  <div className="text-xs font-semibold text-gray-900 mb-0.5">{v.name}</div>
                  <div className="text-xs text-gray-500 leading-relaxed">{v.detail}</div>
                </div>
              ))}
            </div>
          </Section>

          {/* ── Why this, not another platform ── */}
          <Section title="Why this, not another platform">
            <p>
              Komgo, we.trade, Marco Polo, and Contour — every closed, bank-consortium trade-finance blockchain from the
              2018–19 wave failed or pivoted away from blockchain entirely. No competing institution fully trusts a rail
              a rival co-owns. AqueductX is a read-only aggregator over platforms that already exist: it never asks a
              competitor to change anything or hand over control, so it can't die that death. The RWA tokenization
              giants — Centrifuge, Maple, Goldfinch, Ondo — don't touch agricultural commodities at all, and none solve
              the smallholder-lot verification problem underneath the capital they'd happily deploy.
            </p>
            <div className="space-y-1.5 pt-1">
              {whyRows.map((r) => {
                const Icon = r.icon;
                return (
                  <div key={r.name} className="flex items-start gap-2.5 bg-white border border-gray-100 px-3.5 py-3">
                    <Icon size={16} className="text-primary-300 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-xs font-semibold text-gray-900 mb-0.5">{r.name}</div>
                      <div className="text-xs text-gray-500 leading-relaxed">{r.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Reading the map ── */}
          <div className="border-t border-gray-200 pt-7">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Reading the map</h2>
            <p className="text-sm text-gray-500 mb-6">
              Aqueduct's map is not a logistics diagram. It is a balance of payments, drawn.
            </p>
          </div>

          {/* ── 1. The premise ── */}
          <Section title="One earth, two circuits">
            <p>
              Every trade corridor on this map carries two flows in opposite directions. Goods move from smallholder
              origins to import hubs — coffee north to Hamburg, cacao to New York. Value moves the other way: payment
              and investment travel from the hubs back to the origins. Most agricultural maps draw only the first
              circuit, which is why the farmer appears as a supplier and never as a counterparty. Aqueduct draws both,
              in the vocabulary economists already use for exactly this: the <strong>current account</strong> (goods and
              services) and the <strong>capital account</strong> (the financing that mirrors them).
            </p>
            <p>
              The capital account splits once more, and the split is the whole point. <strong>Exogenous</strong> capital
              enters the system from outside — an importer's payment, an impact fund's allocation, a grant.{" "}
              <strong>Endogenous</strong> credit is created <em>inside</em> the system, against its own receivables — a
              cooperative borrowing against a season it can now prove. Exogenous capital crosses oceans, so it is drawn
              as arcs. Endogenous credit revolves in place, so it is drawn as a halo around the node it revolves at. The
              geometry is the economics.
            </p>
          </Section>

          {/* ── 2. Worked corridor ── */}
          <Section title="A corridor, read left to right">
            <div className="bg-white border border-gray-100 px-4 py-5 mb-3 overflow-x-auto">
              <svg width="100%" height="150" viewBox="0 0 640 150" style={{ minWidth: 560 }}>
                {/* goods arc */}
                <path
                  d="M110 84 Q 320 18 530 74"
                  fill="none"
                  stroke={ACCOUNT_COLORS.goods}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <polygon points="518,68 532,74 520,80" fill={ACCOUNT_COLORS.goods} />
                <text x="320" y="32" textAnchor="middle" fontSize="11" fill={ACCOUNT_COLORS.goods} fontWeight="600">
                  goods — current account
                </text>
                {/* capital arc */}
                <path
                  d="M530 90 Q 320 148 110 100"
                  fill="none"
                  stroke={ACCOUNT_COLORS.capitalExo}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  strokeLinecap="round"
                />
                <polygon points="122,106 108,99 120,92" fill={ACCOUNT_COLORS.capitalExo} />
                <text
                  x="320"
                  y="143"
                  textAnchor="middle"
                  fontSize="11"
                  fill={ACCOUNT_COLORS.capitalExo}
                  fontWeight="600"
                >
                  payment &amp; investment — capital account, exogenous
                </text>
                {/* coop node with endo halo */}
                <circle cx="90" cy="90" r="17" fill="none" stroke={ACCOUNT_COLORS.capitalEndo} strokeWidth="2.5" />
                <rect
                  x="83"
                  y="83"
                  width="14"
                  height="14"
                  rx="3"
                  fill="#ffffff"
                  stroke={ACCOUNT_COLORS.goods}
                  strokeWidth="2.5"
                />
                <text x="90" y="126" textAnchor="middle" fontSize="10" fill="#6b7280">
                  coop · credit facility
                </text>
                {/* lots */}
                <circle cx="34" cy="62" r="5" fill={ACCOUNT_COLORS.goods} stroke="#fff" strokeWidth="1.5" />
                <circle cx="26" cy="92" r="4" fill={ACCOUNT_COLORS.goods} stroke="#fff" strokeWidth="1.5" />
                <circle cx="40" cy="116" r="6" fill={ACCOUNT_COLORS.goods} stroke="#fff" strokeWidth="1.5" />
                <line x1="40" y1="64" x2="76" y2="84" stroke={ACCOUNT_COLORS.goods} strokeWidth="1" opacity="0.5" />
                <line x1="32" y1="92" x2="74" y2="90" stroke={ACCOUNT_COLORS.goods} strokeWidth="1" opacity="0.5" />
                <line x1="46" y1="113" x2="77" y2="97" stroke={ACCOUNT_COLORS.goods} strokeWidth="1" opacity="0.5" />
                <text x="34" y="140" textAnchor="middle" fontSize="10" fill="#6b7280">
                  lots
                </text>
                {/* hub */}
                <circle cx="545" cy="82" r="8" fill={ACCOUNT_COLORS.capitalExo} stroke="#fff" strokeWidth="2" />
                <text x="545" y="112" textAnchor="middle" fontSize="10" fill="#6b7280">
                  demand hub
                </text>
              </svg>
            </div>
            <p>
              Lots (sienna circles, sized by weight) aggregate into a cooperative (the outlined square). The coop's
              season travels the sienna arc to a demand hub; the hub's payment and the market's investment travel back
              along the indigo arc — drawn with opposite curvature so the pair reads as one circuit, not two overlapping
              lines. The emerald halo on the coop is the third account: credit revolving locally against the receivable
              the corridor just made legible.
            </p>
          </Section>

          {/* ── 3. The accounts ── */}
          <Section title="The accounts">
            <AccountRow
              swatch={<LineSwatch color={ACCOUNT_COLORS.goods} />}
              name="Current account — goods"
              body="Commodity legs, origin → hub. Line width scales with volume (kg); the arrowhead sits at the destination. The busiest lanes carry an animated dash — activity you can watch. The full lane set lives in the rail (Intents & Routes) and the ledger; the map draws only the top lanes, because a readable network beats an exhaustive one."
            />
            <AccountRow
              swatch={<LineSwatch color={ACCOUNT_COLORS.capitalExo} />}
              name="Capital account — exogenous"
              body="Investment and payment entering from outside the system: importer settlement flowing back along a trade lane, an impact fund or grant matching an origin. Drawn hub → origin as the counter-arc of its goods pair. On the coop seat, this is the capital-eligibility table — which buyers, grants, and funds' conditions the coop's lots actually satisfy, computed by the same policy engine that gates the solver race."
            />
            <AccountRow
              swatch={<RingSwatch color={ACCOUNT_COLORS.capitalEndo} />}
              name="Capital account — endogenous credit"
              body="Credit created inside the system against its own receivables. It does not cross oceans, so it is not an arc: it is a halo revolving around the coop. At the anchor cooperative this halo is REAL — EthicHub, a crowdlending platform financing smallholder coffee cooperatives, runs credit lines on Celo that settle in native USDC, and line 2 completed a full cycle: 192,600 borrowed, 212,369.79 repaid. Tokenized trade finance, already operating; Aqueduct's projection extends the same mechanic to structured lots."
            />
            <AccountRow
              swatch={<RingSwatch color={ACCOUNT_COLORS.capitalExo} dashed />}
              name="Financing opportunity"
              body="A dashed indigo halo marks a coop whose finance intent is published but unfilled — eligible capital exists (the policy engine says so), the match just hasn't happened. This is the map's rendering of the gap the layer exists to close: dashed halos are the pipeline."
            />
            <AccountRow
              swatch={<LineSwatch color={ACCOUNT_COLORS.settle} />}
              name="Settle — the onchain leg"
              body="Atlas blue is reserved for one thing: the settle arc the tour draws when a fill completes, prepared against the deployed IntentRegistry on Base Sepolia. It is drawn once per run — settlement is an event, not a texture."
            />
            <p className="text-xs text-gray-400 mt-2">
              The fourth classical account — transfers (unrequited flows: grants with no receivable behind them) — is
              distinguished in the capital roster but not yet on the map. Roadmap, not omission.
            </p>
            <p className="text-xs text-gray-400 mt-2">
              A lot carries its EUDR status — ready, partial, or gap — never its plot geometry: compliance rendered,
              exposure declined, by design.
            </p>
          </Section>

          {/* ── 4. Node grammar ── */}
          <Section title="Node grammar">
            <p className="mb-3">
              Shape is entity type. Fill is commodity or role. The outline is never decoration: a white ring is the
              resting state, a second solid ring means a LIVE read, and a colored halo is a capital-account state.
            </p>
            <div className="grid sm:grid-cols-2 gap-1.5">
              <NodeRow
                glyph={
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: ACCOUNT_COLORS.goods,
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 1px #d1d5db",
                      display: "inline-block",
                    }}
                  />
                }
                name="Lot"
                body="Circle, sienna, radius ∝ weight. LIVE reads carry a second sienna ring. Clusters show counts; click to zoom."
              />
              <NodeRow
                glyph={
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 3,
                      background: "#fff",
                      border: `2px solid ${ACCOUNT_COLORS.goods}`,
                      display: "inline-block",
                    }}
                  />
                }
                name="Cooperative / exporter"
                body="Outlined square. Settlement credits the coop, never the farmer directly. Click to open its seat."
              />
              <NodeRow
                glyph={
                  <span
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: "50%",
                      background: ACCOUNT_COLORS.capitalExo,
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 1px #d1d5db",
                      display: "inline-block",
                    }}
                  />
                }
                name="Demand hub"
                body="Filled indigo circle at real port cities — where goods land and exogenous capital enters."
              />
              <NodeRow
                glyph={
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      background: "#fff",
                      border: `2px dashed ${ACCOUNT_COLORS.venue}`,
                      transform: "rotate(45deg)",
                      display: "inline-block",
                    }}
                  />
                }
                name="Solver"
                body="Purple diamond, visible during the tour's Fill beat. Dashed = SIM archetype; solid = the open reference backstop, whose bid is a real computation."
              />
              <NodeRow
                glyph={
                  <span
                    style={{
                      width: 11,
                      height: 11,
                      borderRadius: 2,
                      background: ACCOUNT_COLORS.venue,
                      border: "2px solid #fff",
                      boxShadow: "0 0 0 1px #d1d5db",
                      display: "inline-block",
                    }}
                  />
                }
                name="Venue / platform"
                body="Purple square at its HQ or project city (positions approximate, labeled). Dashed + faded = TO-BUILD: researched-real, not yet integrated, never overclaimed."
              />
              <NodeRow
                glyph={
                  <span
                    className="aq-mono"
                    style={{ fontSize: 9, border: "1px solid #d1d5db", borderRadius: 4, padding: "1px 4px" }}
                  >
                    2 lots · €2,618
                  </span>
                }
                name="Vault badge"
                body="The accumulator during Settle — counts persist across replays. SIM, no new contracts."
              />
            </div>
          </Section>

          {/* ── 4b. Reading the filter bar ── */}
          <Section title="Reading the filter bar">
            <p>
              The bar across the top of the map speaks the same three words as the rail beside it and the legend below
              it: <strong>Lots</strong>, <strong>Routes</strong>, <strong>Institutions</strong>. One vocabulary, three
              places. Clicking a category name toggles it on or off — an underline in the category's color means it's
              live on the map and in the rail; both vanish together when you switch it off.
            </p>
            <p>
              Each category carries a small chevron. It opens that category's sub-filters in a quiet panel:{" "}
              <strong>Lots</strong> narrows by commodity, EUDR status, and a minimum SCA cupping floor;{" "}
              <strong>Routes</strong> by intent (sell or finance) and status; <strong>Institutions</strong> by kind and
              provenance. When a category has sub-filters set, a small count rides on its chevron, so the collapsed bar
              still tells you what's active. The open financing <strong>asks</strong> — the per-farmer ask cards, real
              numbers in a templated sentence — live at the top of the Routes panel, discoverable without shouting.
            </p>
            <p>
              At the far right sits <strong>Investable assets</strong>. It is the one control that isn't an Aqueduct
              category: it overlays the base-Atlas investable assets and funds as a context layer on top of the network.
              Off by default — the corridor is the subject; the Atlas assets are the backdrop you can call up when you
              want to see where structured capital already sits. It's also the switch that decides whether a bioregion
              panel shows its Atlas Assets / Actions / Actors, since those are only on the map when the overlay is on.
            </p>
          </Section>

          {/* ── 5. Honesty system ── */}
          <Section title="The honesty system">
            <p className="mb-3">
              Every element in Aqueduct carries provenance. The chips are one axis (where the data comes from); line
              style is the other (what the relationship is). Nothing on the map renders as live that isn't.
            </p>
            <div className="space-y-1.5 mb-3">
              <ChipRow
                chip={<ProvenanceChip provenance="LIVE" />}
                body="Read from the source this session — the EthicHub shop, the lending API, the Celo contract. Re-fetchable by anyone."
              />
              <ChipRow
                chip={<ProvenanceChip provenance="SNAPSHOT" dated="2026-07-02" />}
                body="A real read, persisted with its timestamp. A valid state, not a failure."
              />
              <ChipRow
                chip={<ProvenanceChip provenance="SIM" />}
                body="The seeded synthetic economy — deterministic (one seed, replays identically), calibrated to cited research, and labeled at every appearance."
              />
              <ChipRow
                chip={<ProvenanceChip provenance="TESTNET" />}
                body="Prepared against a deployed contract on Base Sepolia; real when broadcast."
              />
              <ChipRow
                chip={<ProvenanceChip provenance="TO-BUILD" />}
                body="Researched-real platforms rendered for ecosystem breadth — dashed, faded, never shown as integrated."
              />
            </div>
            <p>
              <strong>Solid means an existing relation. Dashed means an opportunity.</strong> This holds across every
              mark: a solid arc is a filled route, a dashed halo is an open financing intent, a dashed venue is a
              connector not yet built. A real EUDR check that finds real gaps renders PARTIAL — the gap is the
              credibility.
            </p>
            <p className="mt-2">
              The full receipts live inline now — the dev-mode bar in the header (every real read and the settle
              payload) and each lot's own activity trail on its detail page; the research the calibration cites lives in{" "}
              <a
                href="https://github.com/Ecofrontiers/aqueduct/tree/main/docs/research"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-700 inline-flex items-center gap-0.5"
              >
                docs/research <ArrowUpRight size={10} />
              </a>
              .
            </p>
          </Section>

          {/* ── 6. Why this vocabulary ── */}
          <Section title="Why draw it this way">
            <p>
              Impact investment already has a network — funds, grants, credit lines, buyers with standards — but it is
              usually visible only as rosters and PDFs. Drawn as accounts over geography, the network unveils itself:
              where liquidity already flows (solid), where it is eligible but hasn't arrived (dashed), and where credit
              is already revolving without any outside allocator (the emerald halos). The coop seat shows the same
              picture from one chair:{" "}
              <Link to="/financing" className="text-blue-500 hover:text-blue-700">
                Financing
              </Link>{" "}
              shows it from the allocator's. The map is the thesis: structure the lot, and both circuits can find it.
            </p>
          </Section>

          <Section title="See also">
            <p>
              The vocabulary underneath — resource, intent, event, claim — is formalized in the{" "}
              <Link to="/ontology" className="text-blue-500 hover:text-blue-700">
                ontology
              </Link>
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

function AccountRow({ swatch, name, body }: { swatch: React.ReactNode; name: string; body: string }) {
  return (
    <div className="flex items-start gap-3 bg-white border border-gray-100 px-3.5 py-3 mb-1.5">
      <span className="shrink-0 mt-1">{swatch}</span>
      <div>
        <div className="text-xs font-semibold text-gray-900 mb-0.5">{name}</div>
        <div className="text-xs text-gray-500 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

function LineSwatch({ color }: { color: string }) {
  return (
    <svg width="28" height="12">
      <path d="M1 10 Q 14 0 27 10" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function RingSwatch({ color, dashed }: { color: string; dashed?: boolean }) {
  return (
    <span
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        border: `2.5px ${dashed ? "dashed" : "solid"} ${color}`,
        display: "inline-block",
      }}
    />
  );
}

function NodeRow({ glyph, name, body }: { glyph: React.ReactNode; name: string; body: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-white border border-gray-100 px-3 py-2.5">
      <span className="shrink-0 mt-1 flex items-center justify-center w-5">{glyph}</span>
      <div>
        <div className="text-xs font-semibold text-gray-900">{name}</div>
        <div className="text-[11px] text-gray-500 leading-relaxed">{body}</div>
      </div>
    </div>
  );
}

function ChipRow({ chip, body }: { chip: React.ReactNode; body: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-white border border-gray-100 px-3 py-2">
      <span className="shrink-0 mt-0.5 w-[104px]">{chip}</span>
      <div className="text-[11px] text-gray-500 leading-relaxed">{body}</div>
    </div>
  );
}
