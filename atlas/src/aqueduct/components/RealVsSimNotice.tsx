import type React from "react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useRealVsSimSummary } from "../hooks/useRealVsSimSummary";

const STORAGE_KEY = "aq-dev-mode";

/**
 * The real-vs-sim honesty indicator, always present (Header.tsx), collapsed to a small
 * corner notice by default. Toggling it open turns it into a dev-mode bar — full counts,
 * pinned under the header — rather than sending a visitor to /ledger just to see the
 * breakdown exists. Persisted across navigation/reload via localStorage: once a visitor
 * has opened dev mode, it stays open until they close it.
 */
export function RealVsSimNotice(): React.ReactElement {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  });
  const summary = useRealVsSimSummary();

  const toggle = () => {
    const next = !open;
    setOpen(next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={toggle}
        title="Real vs sim — every element on this app is labeled; click to see the breakdown"
        className="fixed top-2 right-3 z-30 flex items-center gap-1 px-2 py-1 bg-cardBackground border border-gray-200 text-[10px] font-medium text-gray-500 shadow-sm hover:bg-gray-50 hover:text-gray-800 transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        real / sim
      </button>
    );
  }

  return (
    <div className="fixed top-[60px] lg:top-[36px] left-0 w-full z-20 bg-gray-900 text-white">
      <div className="max-w-5xl mx-auto px-4 py-1.5 flex items-center gap-4 flex-wrap text-[11px]">
        <button
          type="button"
          onClick={toggle}
          className="font-semibold text-white hover:text-gray-300 transition-colors flex-shrink-0"
        >
          dev mode ✕
        </button>
        <span className="text-gray-400">
          {summary.loading ? (
            "loading real-vs-sim counts…"
          ) : (
            <>
              <span className="text-blue-300 font-medium">{summary.liveCount}</span> live reads this run ·{" "}
              <span className="text-amber-300 font-medium">{summary.simCount}</span> sim actors wired ·{" "}
              <span className="text-amber-300 font-medium">{summary.simLots.toLocaleString()}</span> sim lots (seeded
              economy) · <span className="text-green-300 font-medium">{summary.testnetCount}</span> testnet settle
              payload prepared
            </>
          )}
        </span>
        <Link to="/ledger" className="ml-auto underline hover:text-gray-300 flex-shrink-0">
          full ledger →
        </Link>
      </div>
    </div>
  );
}
