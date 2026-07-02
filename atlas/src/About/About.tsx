import { Link } from "react-router-dom";
import Header from "../Header";
import Footer from "../Footer";
import { ChainIcon } from "../modules/chains/components/ChainIcon";
import {
  MapTrifold,
  Database,
  ArrowRight,
  Leaf,
  Drop,
  Sun,
  Fish,
  Recycle,
  Plant,
  CloudRain,
  Users,
  Tree,
  HandHeart,
} from "@phosphor-icons/react";

const LIST_PROJECT_URL = "/list";

const stats = [
  { value: "500+", label: "Verified Assets" },
  { value: "17", label: "Chains" },
  { value: "185", label: "Bioregions" },
  { value: "14", label: "Issuers" },
];

const ecosystemCategories = [
  { name: "Carbon", icon: Leaf },
  { name: "Biodiversity", icon: Tree },
  { name: "Renewable Energy", icon: Sun },
  { name: "Marine", icon: Fish },
  { name: "Waste & Circular", icon: Recycle },
  { name: "Soil Health", icon: Plant },
  { name: "Water", icon: Drop },
  { name: "Livelihoods", icon: Users },
  { name: "Agroforestry", icon: CloudRain },
  { name: "Public Goods", icon: HandHeart },
];

const chains: { id: string; name: string }[] = [
  { id: "ethereum", name: "Ethereum" },
  { id: "polygon-pos", name: "Polygon" },
  { id: "binance-smart-chain", name: "BNB Chain" },
  { id: "near-protocol", name: "NEAR" },
  { id: "arbitrum-one", name: "Arbitrum" },
  { id: "celo", name: "Celo" },
  { id: "base", name: "Base" },
  { id: "solana", name: "Solana" },
  { id: "algorand", name: "Algorand" },
  { id: "regen-1", name: "Regen Network" },
  { id: "lukso", name: "LUKSO" },
  { id: "osmosis", name: "Osmosis" },
  { id: "vechain", name: "VeChain" },
  { id: "cardano", name: "Cardano" },
  { id: "avalanche", name: "Avalanche" },
  { id: "axelar", name: "Axelar" },
  { id: "iotex", name: "IoTeX" },
];

function ChainRailItem({ chain }: { chain: { id: string; name: string } }) {
  return (
    <div className="flex items-center gap-2 px-5 shrink-0">
      <ChainIcon
        chainId={chain.id}
        chainName={chain.name}
        size={18}
        className="bg-gray-400"
      />
      <span className="text-[11px] text-gray-500 whitespace-nowrap">
        {chain.name}
      </span>
    </div>
  );
}

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
                Open-Source / Onchain
              </p>
              <h1 className="text-[36px] md:text-[48px] lg:text-[56px] font-bold leading-[1.08] tracking-[-0.025em] mb-5 max-w-[720px] mx-auto text-white">
                The onchain green economy — mapped, valued, verified
              </h1>
              <p className="text-primary-200/60 text-sm md:text-base max-w-[520px] mx-auto mb-8 leading-relaxed">
                Every green asset, actor, and onchain action — unified
                across chains and bioregions.
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
            {/* Stats — inside hero, anchored to bottom */}
            <div className="relative border-t border-white/10">
              <div className="max-w-[1040px] mx-auto px-4 py-5 grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-8 text-center">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="text-2xl md:text-3xl font-bold tracking-tight text-white">
                      {s.value}
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.15em] text-white/40 mt-1 font-medium">
                      {s.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Chain Rail */}
          <section className="border-b border-gray-200 overflow-hidden py-3.5 bg-background">
            <div className="about-chain-rail">
              <div className="about-chain-rail-inner">
                {chains.map((c) => (
                  <ChainRailItem key={c.id} chain={c} />
                ))}
                {chains.map((c) => (
                  <ChainRailItem key={`dup-${c.id}`} chain={c} />
                ))}
              </div>
            </div>
          </section>

          {/* Feature Cards — problem framing folded into intro */}
          <section className="bg-background">
            <div className="max-w-[1040px] mx-auto px-4 py-16 md:py-20">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-300 mb-4">
                How It Works
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
                Index. Valuate. Verify.
              </h2>
              <p className="text-sm text-gray-500 mb-10 max-w-[560px] leading-[1.7]">
                Carbon credits on Polygon. Biodiversity tokens on Celo.
                Renewable energy on Ethereum. Nobody has the full picture — so
                we built one. Every asset mapped to its bioregion, valued
                against peer-reviewed economics, verified onchain.
              </p>
              <div className="grid md:grid-cols-2 gap-5">
                <div className="bg-white border border-gray-200 p-7 flex flex-col hover:shadow-[0_8px_30px_rgba(94,173,185,0.1)] hover:border-primary-200/60 transition-all duration-300">
                  <MapTrifold
                    size={28}
                    weight="duotone"
                    className="text-primary-300 mb-4"
                  />
                  <h3 className="text-base font-semibold mb-2">
                    Map Explorer
                  </h3>
                  <p className="text-sm text-gray-500 leading-[1.7] flex-1">
                    Browse assets, organizations, and actions across 185
                    bioregions. Filter by chain, ecosystem service, issuer, or
                    location. Every entity geolocated to its bioregion.
                  </p>
                  <Link
                    to="/"
                    className="mt-5 text-sm font-medium text-primary-400 flex items-center gap-1.5 hover:gap-2.5 transition-all"
                  >
                    Open Map <ArrowRight size={14} />
                  </Link>
                </div>

                <div className="bg-white border border-gray-200 p-7 flex flex-col hover:shadow-[0_8px_30px_rgba(94,173,185,0.1)] hover:border-primary-200/60 transition-all duration-300 relative overflow-hidden">
                  <span className="absolute top-3 right-3 text-[9px] font-bold uppercase tracking-widest text-primary-300 bg-primary-50 px-2 py-0.5 rounded-full">Coming Soon</span>
                  <Database
                    size={28}
                    weight="duotone"
                    className="text-primary-300 mb-4"
                  />
                  <h3 className="text-base font-semibold mb-2">
                    Impact Intelligence
                  </h3>
                  <p className="text-sm text-gray-500 leading-[1.7] flex-1">
                    Track where green assets come from and how they perform.
                    Verified data from every major tokenization protocol,
                    benchmarked against peer-reviewed science.
                  </p>
                  <a
                    href="https://regen-atlas.gitbook.io/regen-atlas-docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 text-sm font-medium text-primary-400 flex items-center gap-1.5 hover:gap-2.5 transition-all"
                  >
                    Read Docs <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Ecosystem Coverage */}
          <section className="border-t border-gray-200 bg-white">
            <div className="max-w-[1040px] mx-auto px-4 py-12 md:py-16">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary-300 mb-4">
                Ecosystem Services
              </p>
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight">
                Beyond Carbon
              </h2>
              <p className="text-sm text-gray-500 mb-10 max-w-[520px] leading-[1.7]">
                Regen Atlas tracks onchain activity across the full
                spectrum of ecosystem services — not just carbon credits,
                but biodiversity, water, soil, energy, and livelihoods.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {ecosystemCategories.map((cat) => {
                  const Icon = cat.icon;
                  return (
                    <div
                      key={cat.name}
                      className="bg-white border border-gray-200 px-4 py-4 flex flex-col items-center gap-2.5"
                    >
                      <Icon
                        size={20}
                        weight="duotone"
                        className="text-primary-300"
                      />
                      <span className="text-[11px] font-medium text-gray-600 text-center leading-tight">
                        {cat.name}
                      </span>
                    </div>
                  );
                })}
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
              <h2 className="text-2xl md:text-3xl font-bold mb-3 tracking-tight text-white">
                Start exploring
              </h2>
              <p className="text-sm text-primary-200/50 mb-8 max-w-[400px] mx-auto leading-relaxed">
                500+ green assets, the organizations behind them, and their
                onchain activity — open-source across 17 chains.
              </p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <Link
                  to="/"
                  className="bg-white text-gray-900 px-7 py-2.5 text-sm font-semibold inline-flex items-center gap-2 hover:bg-primary-100 transition-colors"
                >
                  Explore the Map
                  <ArrowRight size={14} weight="bold" />
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
