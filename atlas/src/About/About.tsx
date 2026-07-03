import {
  ArrowRight,
  ClipboardText,
  Coffee,
  Coin,
  Cpu,
  Fingerprint,
  HandCoins,
  MagnifyingGlass,
  Repeat,
  ShieldCheck,
  Truck,
  Users,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import Footer from "../Footer";
import Header from "../Header";

const LIST_PROJECT_URL = "/list";

const stats = [
  { value: "2", label: "Live Platform Reads" },
  { value: "1,263", label: "Lots Across Two Verticals" },
  { value: "50", label: "Cited Failure Modes" },
  { value: "$50K", label: "Sentient Foundation Ask" },
];

const coordinationVectors = [
  {
    name: "Price",
    icon: Coin,
    detail: "One shared landed-cost function every solver bids through, not five private negotiations.",
  },
  {
    name: "Risk signal",
    icon: ShieldCheck,
    detail: "One canonical, verified lot read once by every institution, not re-diligenced N times.",
  },
  {
    name: "Capital search",
    icon: MagnifyingGlass,
    detail: "One posted intent, matched against every buyer, grant, and fund at once, not sequential shopping.",
  },
  {
    name: "Collateral integrity",
    icon: Fingerprint,
    detail: "A content-addressed lot id makes double-pledging visible instead of invisible.",
  },
  {
    name: "Compliance reporting",
    icon: ClipboardText,
    detail: "A real GIIN/IRIS+ citation, measured once, referenced by any funder who accepts that standard.",
  },
];

const realChains: { name: string; note: string; status: "LIVE" | "TESTNET" }[] = [
  { name: "Celo", note: "EthicHub CreditLine, a completed cycle: 192,600 → 212,369.79 USDC repaid", status: "LIVE" },
  {
    name: "Base Sepolia",
    note: "IntentRegistry, settle prepared, broadcast withheld by design (no key in this repo)",
    status: "TESTNET",
  },
];

export default function About() {
  return (
    <>
      <Header />
      <div className="min-h-screen bg-background">
        <main className="pt-[60px] lg:pt-[36px] lg:pb-[36px]">
          {/* Hero — fills viewport, stats embedded at bottom */}
          <section className="relative overflow-hidden bg-[#0a1e2e] lg:h-[calc(100vh-36px-36px)] flex flex-col">
            <img
              src="/about/hero-delta.webp"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0a1e2e]/70 via-[#0a1e2e]/30 to-[#0a1e2e]/95" />
            <div className="relative flex-1 flex flex-col items-center justify-center max-w-[1040px] mx-auto px-4 py-16 md:py-20 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-primary-200/80 mb-5">
                MIT Licensed · Built on Regen Atlas
              </p>
              <h1 className="text-[32px] md:text-[46px] lg:text-[54px] font-bold leading-[1.15] tracking-[-0.025em] mb-5 max-w-[820px] mx-auto text-white">
                A peer-to-peer logistics and finance layer for smallholder farmers
              </h1>
              <p className="text-primary-200/60 text-sm md:text-base max-w-[600px] mx-auto mb-4 leading-relaxed">
                AqueductX is a generalized peer-to-peer logistics and finance layer for smallholder farmers: agents
                aggregate, verify, and price commodity lots, and intents match and settle them.
              </p>
              <p className="text-primary-200/40 text-xs md:text-sm max-w-[600px] mx-auto mb-8">
                A common API for green investment.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/"
                  className="bg-white text-gray-900 px-7 py-2.5 text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary-100 transition-colors"
                >
                  Explore the Map
                  <ArrowRight size={14} weight="bold" />
                </Link>
                <Link
                  to="/financing"
                  className="px-7 py-2.5 text-sm font-medium border border-white/25 text-white/80 hover:border-white/50 hover:text-white transition-colors"
                >
                  View Financing
                </Link>
              </div>
            </div>
            {/* Stats — inside hero, anchored to bottom */}
            <div className="relative border-t border-white/10">
              <div className="max-w-[1040px] mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl md:text-3xl font-bold tracking-tight text-white">{s.value}</div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1 font-medium">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Real chains — honest, two entries, no marquee implying breadth AqueductX doesn't have */}
          <section className="border-b border-gray-200 py-4 bg-background">
            <div className="max-w-[1040px] mx-auto px-4 flex flex-wrap items-center gap-x-8 gap-y-2">
              {realChains.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      c.status === "LIVE" ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {c.status}
                  </span>
                  <span className="text-xs font-medium text-gray-700">{c.name}</span>
                  <span className="text-[11px] text-gray-400">— {c.note}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Feature Cards — problem framing folded into intro */}
          <section className="bg-background">
            <div className="max-w-[1040px] mx-auto px-4 py-16 md:py-20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-300 mb-4">
                How It Works
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
                Aggregate. Verify. Price. Match. Settle.
              </h2>
              <p className="text-sm text-gray-500 mb-10 max-w-[600px] leading-[1.7]">
                The global trade finance gap is $2.5 trillion (ADB, 2022, still $2.5T in the January 2026 survey).
                Smallholder finance alone is short $200B+ a year: ~$323B in demand against ~$95B in supply (ISF
                Advisors, October 2025). Reported trade-finance fraud losses exceeded $10B in 2020 (GLEIF/MonetaGo):
                fabricated documents, duplicate financing, collateral that doesn't exist. The gap is a legibility gap
                before it's a capital gap: lenders reject smallholders not for lack of capital but for lack of a way to
                verify who's real. Aggregating, verifying, pricing, matching, and settling are exactly the tasks AI now
                performs cheaply, at any scale.
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white border border-gray-200 p-7 flex flex-col hover:shadow-[0_8px_30px_rgba(94,173,185,0.1)] hover:border-primary-200/60 transition-all duration-300">
                  <Coffee size={28} weight="duotone" className="text-primary-300 mb-4" />
                  <h3 className="text-base font-semibold mb-2">The Map</h3>
                  <p className="text-sm text-gray-500 leading-[1.7] flex-1">
                    A real EthicHub coffee lot, read live and source-linked, next to a seeded synthetic economy at
                    scale. Every element is labeled LIVE, SIM, SNAPSHOT, or TESTNET. Watch the swarm cascade: scout,
                    diligence, price, solver race, settle.
                  </p>
                  <Link
                    to="/"
                    className="mt-5 text-sm font-medium text-primary-400 flex items-center gap-1.5 hover:gap-2.5 transition-all"
                  >
                    Open Map <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="bg-white border border-gray-200 p-7 flex flex-col hover:shadow-[0_8px_30px_rgba(94,173,185,0.1)] hover:border-primary-200/60 transition-all duration-300">
                  <HandCoins size={28} weight="duotone" className="text-primary-300 mb-4" />
                  <h3 className="text-base font-semibold mb-2">Financing</h3>
                  <p className="text-sm text-gray-500 leading-[1.7] flex-1">
                    Buyers, grants, and funds matched against every lot by real, citable policy conditions. A real
                    GIIN/IRIS+ standard where one exists, a named failure mode where it's a modeled risk. Never a bare
                    match.
                  </p>
                  <Link
                    to="/financing"
                    className="mt-5 text-sm font-medium text-primary-400 flex items-center gap-1.5 hover:gap-2.5 transition-all"
                  >
                    Open Financing <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* What AqueductX Coordinates */}
          <section className="border-t border-gray-200 bg-white">
            <div className="max-w-[1040px] mx-auto px-4 py-12 md:py-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-300 mb-4">
                Not Just Logistics
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">What AqueductX Coordinates</h2>
              <p className="text-sm text-gray-500 mb-10 max-w-[600px] leading-[1.7]">
                An intent isn't one number. It's five vectors that normally get renegotiated separately at every hop
                between a smallholder's lot and the market that consumes it. Posting them together, once, is where the
                saving lives.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {coordinationVectors.map((v) => {
                  const Icon = v.icon;
                  return (
                    <div key={v.name} className="bg-white border border-gray-200 px-4 py-4 flex flex-col gap-2.5">
                      <Icon size={20} weight="duotone" className="text-primary-300" />
                      <span className="text-[11px] font-semibold text-gray-800">{v.name}</span>
                      <span className="text-[11px] text-gray-500 leading-relaxed">{v.detail}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Why this positioning */}
          <section className="border-t border-gray-200 bg-background">
            <div className="max-w-[1040px] mx-auto px-4 py-12 md:py-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-300 mb-4">
                Why This, Not Another Platform
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">Protocol, not platform</h2>
              <p className="text-sm text-gray-500 mb-6 max-w-[640px] leading-[1.7]">
                Komgo, we.trade, Marco Polo, and Contour: every closed, bank-consortium trade-finance blockchain from
                the 2018-19 wave failed or pivoted away from blockchain entirely. No competing institution fully trusts
                a rail a rival co-owns. AqueductX is a read-only aggregator over platforms that already exist: it never
                asks a competitor to change anything or hand over control, so it can't die that death. Centrifuge,
                Maple, Goldfinch, and Ondo, the RWA tokenization giants, don't touch agricultural commodities at all.
                None of them solve the smallholder-lot verification problem underneath the capital they'd happily
                deploy.
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Cpu size={16} className="text-primary-300 flex-shrink-0" />
                <span>
                  Every institutional decline or reprice cites a real, checkable source: a GIIN/IRIS+ standard, or a
                  named failure mode from the AI Mechanism Atlas, not an invented risk score.
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <Truck size={16} className="text-primary-300 flex-shrink-0" />
                <span>
                  Freight, customs, and certification are one blended quote from the same shared reference engine every
                  solver bids through, never invented for the page that happens to show it.
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <Repeat size={16} className="text-primary-300 flex-shrink-0" />
                <span>
                  A lot is an economic resource, an intent a commitment, a fill an event; financing creates a claim —
                  capital now, repayment later at a stated rate and term — so selling a lot and financing a planting are
                  the same kind of exchange, not two unrelated features.
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <Users size={16} className="text-primary-300 flex-shrink-0" />
                <span>
                  In category terms, AqueductX is a swarm decision-support system for agricultural trade finance: many
                  small agents aggregate, verify, price, and match; people and institutions make the allocation call,
                  and settlement is the action taken.
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <ShieldCheck size={16} className="text-primary-300 flex-shrink-0" />
                <span>
                  The map proves EUDR status without exposing the farmer behind it: status renders, plot geometry never
                  does, and names appear as initials by design — knowledge sufficient to enable a right, a benefit, or a
                  protective measure, and no more.
                </span>
              </div>
            </div>
          </section>

          {/* Bottom CTA — dark with image */}
          <section className="relative overflow-hidden bg-[#0a1e2e]">
            <img
              src="/about/hero-flux.webp"
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-[#0a1e2e]/60" />
            <div className="relative max-w-[1040px] mx-auto px-4 py-20 md:py-24 text-center">
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-white">Start exploring</h2>
              <p className="text-sm text-primary-200/50 mb-8 max-w-[460px] mx-auto leading-relaxed">
                Real where it touches the world. Simulated and labeled where it doesn't yet. Open source, MIT licensed,
                built on Regen Atlas.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/"
                  className="bg-white text-gray-900 px-7 py-2.5 text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary-100 transition-colors"
                >
                  Explore the Map
                  <ArrowRight size={14} weight="bold" />
                </Link>
                <Link
                  to={LIST_PROJECT_URL}
                  className="px-7 py-2.5 text-sm font-medium border border-white/25 text-white/80 hover:border-white/50 hover:text-white transition-colors"
                >
                  List Your Project
                </Link>
              </div>
            </div>
          </section>
        </main>
      </div>
      <div className="hidden lg:block w-full fixed left-0 bottom-0 z-50 h-[36px] bg-background">
        <Footer />
      </div>
    </>
  );
}
