import type React from "react";
import { useState } from "react";
import { useRealVsSimSummary } from "../hooks/useRealVsSimSummary";
import { ProvenanceChip } from "./Chips";

const STORAGE_KEY = "aq-dev-mode";

/**
 * The real-vs-sim honesty indicator. Collapsed state sits inline in the header row
 * (left of the wallet connect button, Header.tsx) — a small notice, not a floating
 * corner badge. Toggling it open turns it into a full-width dev-mode bar pinned under
 * the header. The /ledger page is gone — its settle-payload block (lot id, TESTNET
 * chip, tx link or the honest "awaiting broadcast" note) now renders inline here, the
 * one place left that shows it. Persisted across navigation/reload via localStorage:
 * once a visitor has opened dev mode, it stays open until they close it.
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
        className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
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
        {summary.settlePayload && (
          <span className="ml-auto flex items-center gap-1.5 flex-shrink-0 aq-mono">
            <ProvenanceChip provenance="TESTNET" />
            <span className="text-gray-300">{summary.settlePayload.lot_id}</span>
            {summary.settlePayload.explorer_url ? (
              <a
                href={summary.settlePayload.explorer_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-green-300 hover:text-green-200"
              >
                settled — view tx ↗
              </a>
            ) : (
              <span className="text-amber-300">
                awaiting broadcast — expects env var {summary.settlePayload.expected_env_var}
              </span>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
