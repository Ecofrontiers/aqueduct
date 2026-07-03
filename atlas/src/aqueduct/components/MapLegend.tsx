import { ArrowRight, CaretDown, CaretUp, MapTrifold } from "@phosphor-icons/react";
import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ACCOUNT_COLORS } from "./AqueductNetworkLayer";

/**
 * Reading the map — the balance-of-payments legend. Two circuits over one
 * earth: goods out (current account), capital back (capital account), credit
 * revolving locally (endogenous facilities). Solid = existing relation,
 * dashed = opportunity.
 */
export function MapLegend(): React.ReactElement {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-cardBackground border border-gray-200 text-[11px] font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
      >
        <MapTrifold size={13} className="text-gray-500" />
        Reading the map
        <CaretUp size={11} className="text-gray-400" />
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-10 w-[270px] bg-cardBackground border border-gray-200 shadow-md overflow-hidden">
      <button
        onClick={() => setOpen(false)}
        className="w-full flex items-center justify-between px-3 h-8 border-b border-gray-100 hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-800">
          <MapTrifold size={13} className="text-gray-500" />
          Reading the map
        </span>
        <CaretDown size={11} className="text-gray-400" />
      </button>
      <div className="px-3 py-2.5 space-y-2">
        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Flows — two circuits</div>
        <LegendLine color={ACCOUNT_COLORS.goods} label="Current account — goods" note="origin → hub" />
        <LegendLine
          color={ACCOUNT_COLORS.capitalExo}
          label="Capital account, exogenous"
          note="investment & payment, hub → origin"
        />
        <LegendLine color={ACCOUNT_COLORS.settle} label="Settle — onchain leg" note="the tour's one arc (testnet)" />

        <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide pt-1">
          Node halos — capital state
        </div>
        <LegendRing
          color={ACCOUNT_COLORS.capitalEndo}
          label="Capital account, endogenous"
          note="credit facility revolving at the coop — REAL at the anchor (Celo USDC)"
        />
        <LegendRing
          color={ACCOUNT_COLORS.capitalExo}
          dashed
          label="Financing opportunity"
          note="eligible + open, not yet filled"
        />

        <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100 leading-relaxed">
          Solid = existing relation · dashed = opportunity. Nodes:{" "}
          <span style={{ color: ACCOUNT_COLORS.goods }}>●</span> lots ·{" "}
          <span style={{ color: ACCOUNT_COLORS.goods }}>▢</span> coops ·{" "}
          <span style={{ color: ACCOUNT_COLORS.capitalExo }}>●</span> demand hubs ·{" "}
          <span style={{ color: ACCOUNT_COLORS.venue }}>◆</span> solvers ·{" "}
          <span style={{ color: ACCOUNT_COLORS.venue }}>▪</span> venues. Every element carries a LIVE / SIM / TESTNET
          chip on its page.
        </div>
        <Link
          to="/guide"
          className="flex items-center justify-between gap-1 -mx-3 -mb-2.5 mt-1 px-3 py-2 bg-blue-600 text-white text-[11px] font-medium hover:bg-blue-700 transition-colors"
        >
          The full guide — accounts, nodes, honesty system
          <ArrowRight size={12} />
        </Link>
      </div>
    </div>
  );
}

function LegendLine({ color, label, note }: { color: string; label: string; note: string }) {
  return (
    <div className="flex items-start gap-2">
      <svg width="26" height="10" className="shrink-0 mt-1">
        <path d="M1 8 Q 13 0 25 8" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-800 leading-tight">{label}</div>
        <div className="text-[10px] text-gray-400 leading-tight">{note}</div>
      </div>
    </div>
  );
}

function LegendRing({ color, dashed, label, note }: { color: string; dashed?: boolean; label: string; note: string }) {
  return (
    <div className="flex items-start gap-2">
      <span
        className="shrink-0 mt-0.5"
        style={{
          width: 14,
          height: 14,
          borderRadius: "50%",
          border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
          display: "inline-block",
        }}
      />
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-gray-800 leading-tight">{label}</div>
        <div className="text-[10px] text-gray-400 leading-tight">{note}</div>
      </div>
    </div>
  );
}
