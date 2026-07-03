import { ArrowRight, CheckCircle, Handshake, Lock, Megaphone, ShieldCheck, Sliders } from "@phosphor-icons/react";
import type React from "react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AqueductIntent } from "../../hooks/useAqueductEconomy";
import { runSolverRace } from "../../sim/solverRoster.mjs";
import {
  LOCKED_DISCLOSURE_NOTE,
  acceptFill,
  addDraftIntent,
  selectSeatDrafts,
  selectSeatPrefs,
  setSeatFloor,
  setShareEudrStatus,
  useSteward,
} from "../../state/stewardStore";
import { AQUEDUCT_SECTION_COLORS } from "../AqueductExploreCards";
import { ProvenanceChip } from "../Chips";

const INTENT = AQUEDUCT_SECTION_COLORS.intent; // indigo — the steward accent

type Commodity = "coffee" | "cacao" | "honey";
type Verb = "sell-this-lot" | "finance-this-planting";

/** Minimal structural view of the coop seat (from buildCoopRegistry) — only what the
 *  steward reads: its identity, its real commodity, and the real lots whose EUDR/quality
 *  fields the solver policies judge. */
interface SeatView {
  id: string;
  name: string;
  commodity: string;
  lots: Array<{
    quality?: { sca_score: number | null };
    eudr?: {
      plot_geo_present: boolean;
      harvest_window_present: boolean;
      legality_evidence: boolean;
      dds_ref: string | null;
    };
  }>;
}

/** The aggregate lot the solver policies judge — the weakest constituent, identical to
 *  the page's own publishIntent() discipline (a risk desk declines on the worst lot in
 *  the pool, never the average). This is the REAL EUDR/quality context the user's entered
 *  floor + quantity bid against; the numbers are the user's, the policy read is the seat's. */
function buildAggregateLot(lots: SeatView["lots"]) {
  return {
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
      dds_ref: lots.every((l) => l.eudr?.dds_ref) ? lots[0]?.eudr?.dds_ref ?? null : null,
    },
    certs: [] as unknown[],
    commodity: "coffee",
  };
}

/**
 * WP16 — the seat's steward surface (doc 14 §6 "Demo-now, SIM, one surface"). One quiet
 * card, one form, immediate results: the user posts an intent, the same running solver
 * race visibly works it, a fill can be accepted, and confirm-settle stops at the honest
 * boundary (prepared payload, human key). The five verbs (doc 14 §3) are the whole surface.
 */
export function StewardPanel({ seat, avgFob }: { seat: SeatView; avgFob: number }) {
  const store = useSteward();
  const prefs = selectSeatPrefs(store, seat.id);
  const drafts = selectSeatDrafts(store, seat.id);

  const seatCommodity = (
    ["coffee", "cacao", "honey"].includes(seat.commodity) ? seat.commodity : "coffee"
  ) as Commodity;

  return (
    <div
      id="steward"
      className="scroll-mt-20 bg-cardBackground border border-gray-200 px-5 py-4"
      style={{ borderLeft: `2px solid ${INTENT}` }}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Megaphone size={14} style={{ color: INTENT }} />
        <h2 className="text-xs font-bold text-gray-900">Your steward — post an intent</h2>
        <ProvenanceChip provenance="SIM" />
      </div>
      <p className="text-[11px] text-gray-500 leading-relaxed mb-3">
        One agent that represents <span className="font-medium text-gray-700">{seat.name}</span>'s interests and nothing
        else—it holds your inputs and speaks to the swarm in commitments, and it's extensible with negotiation
        strategies, alerts, and automations. Settlement stays human-confirmed by default, fully delegable when you
        designate it.
      </p>

      <VerbStrip seat={seat} floor={prefs.floorEurPerKg} shareEudr={prefs.disclosure.shareEudrStatus} />

      <IntentForm seat={seat} seatCommodity={seatCommodity} floorPref={prefs.floorEurPerKg} />

      {drafts.length > 0 && (
        <div className="mt-4 space-y-3">
          {drafts.map((d) => (
            <DraftCard key={d.id} draft={d} seat={seat} avgFob={avgFob} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── The five-verb strip (doc 14 §3): the steward's whole opinionated surface ──

function VerbStrip({ seat, floor, shareEudr }: { seat: SeatView; floor: number | null; shareEudr: boolean }) {
  const [editingFloor, setEditingFloor] = useState(false);
  const [floorText, setFloorText] = useState(floor == null ? "" : String(floor));

  const commitFloor = () => {
    const n = Number.parseFloat(floorText);
    setSeatFloor(seat.id, floorText.trim() === "" || Number.isNaN(n) ? null : n);
    setEditingFloor(false);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-px bg-gray-100 mb-3 text-[10px]">
      <Verb icon={<Megaphone size={11} />} label="Post intent" active />
      {/* Verb #2 — set the floor: inline-editable, the ask-card line respects it. */}
      <div className="bg-cardBackground px-2 py-1.5">
        <div className="flex items-center gap-1 text-gray-500">
          <Sliders size={11} />
          <span>Set floor</span>
        </div>
        {editingFloor ? (
          <input
            type="number"
            step="0.01"
            // biome-ignore lint/a11y/noAutofocus: inline field is user-invoked (click "set floor"), not page load
            autoFocus
            value={floorText}
            onChange={(e) => setFloorText(e.target.value)}
            onBlur={commitFloor}
            onKeyDown={(e) => e.key === "Enter" && commitFloor()}
            placeholder="€/kg"
            className="mt-0.5 w-full text-[11px] aq-mono border border-gray-200 px-1 py-0.5"
          />
        ) : (
          <button
            type="button"
            onClick={() => {
              setFloorText(floor == null ? "" : String(floor));
              setEditingFloor(true);
            }}
            className="mt-0.5 text-[11px] aq-mono text-gray-800 hover:underline"
          >
            {floor == null ? "on match" : `€${floor.toFixed(2)}/kg`}
          </button>
        )}
      </div>
      <Verb icon={<Handshake size={11} />} label="Accept fill" />
      <Verb icon={<CheckCircle size={11} />} label="Confirm settle" />
      {/* Verb #5 — disclosure: EUDR status flows; the two sensitive tiers are locked OFF. */}
      <div className="bg-cardBackground px-2 py-1.5">
        <div className="flex items-center gap-1 text-gray-500 mb-1">
          <ShieldCheck size={11} />
          <span>Disclosure</span>
        </div>
        <DisclosureToggle label="EUDR status" checked={shareEudr} onChange={(v) => setShareEudrStatus(seat.id, v)} />
        <DisclosureToggle label="Plot geometry" checked={false} locked />
        <DisclosureToggle label="Full names" checked={false} locked />
        <p className="text-[9px] text-gray-400 leading-tight mt-0.5">{LOCKED_DISCLOSURE_NOTE}</p>
      </div>
    </div>
  );
}

function Verb({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <div className="bg-cardBackground px-2 py-1.5">
      <div className="flex items-center gap-1" style={{ color: active ? INTENT : "#6b7280" }}>
        {icon}
        <span>{label}</span>
      </div>
    </div>
  );
}

function DisclosureToggle({
  label,
  checked,
  onChange,
  locked,
}: {
  label: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-1 text-[10px] ${locked ? "text-gray-400 cursor-not-allowed" : "text-gray-600 cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={locked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="w-3 h-3"
      />
      <span>{label}</span>
      {locked && <Lock size={9} className="text-gray-400" />}
    </label>
  );
}

// ── The form (verb #1) ──

function IntentForm({
  seat,
  seatCommodity,
  floorPref,
}: {
  seat: SeatView;
  seatCommodity: Commodity;
  floorPref: number | null;
}) {
  const [commodity, setCommodity] = useState<Commodity>(seatCommodity);
  const [verb, setVerb] = useState<Verb>("sell-this-lot");
  const [qty, setQty] = useState("500");
  const [floor, setFloor] = useState("");
  const [note, setNote] = useState("");

  const submit = () => {
    const quantityKg = Math.max(0, Math.round(Number.parseFloat(qty) || 0));
    if (quantityKg <= 0) return;
    const parsedFloor = floor.trim() === "" ? null : Number.parseFloat(floor);
    const floorEurPerKg = parsedFloor == null || Number.isNaN(parsedFloor) ? floorPref : parsedFloor;

    // Kiva-template titles from the REAL entered numbers (financeIntent.mjs conventions:
    // "Sell — <what>" / "Finance — <what>, <community>").
    const title =
      verb === "sell-this-lot"
        ? `Sell — ${quantityKg.toLocaleString()} kg ${commodity}, ${seat.name}`
        : `Finance — ${quantityKg.toLocaleString()} kg ${commodity} planting, ${seat.name}`;
    const detail =
      floorEurPerKg != null
        ? verb === "sell-this-lot"
          ? `€${floorEurPerKg.toFixed(2)}/kg FOB floor · ${quantityKg.toLocaleString()} kg`
          : `€${floorEurPerKg.toFixed(2)}/kg ask · ${quantityKg.toLocaleString()} kg planting`
        : `price on match · ${quantityKg.toLocaleString()} kg`;

    const intent: Omit<AqueductIntent, "id"> = {
      intentType: verb,
      status: "open",
      title,
      detail,
      provenance: "SIM",
      authored: {
        seatId: seat.id,
        commodity,
        quantityKg,
        floorEurPerKg,
        note: note.trim() || undefined,
      },
    };
    addDraftIntent(intent);
    setNote("");
  };

  return (
    <div className="border-t border-gray-100 pt-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Commodity">
          <select
            value={commodity}
            onChange={(e) => setCommodity(e.target.value as Commodity)}
            className="w-full text-xs border border-gray-200 px-2 py-1.5 bg-white"
          >
            <option value="coffee">coffee</option>
            <option value="cacao">cacao</option>
            <option value="honey">honey</option>
          </select>
        </Field>
        <Field label="Verb">
          <select
            value={verb}
            onChange={(e) => setVerb(e.target.value as Verb)}
            className="w-full text-xs border border-gray-200 px-2 py-1.5 bg-white"
          >
            <option value="sell-this-lot">sell this lot</option>
            <option value="finance-this-planting">finance this planting</option>
          </select>
        </Field>
        <Field label="Quantity (kg)">
          <input
            type="number"
            min="0"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="w-full text-xs aq-mono border border-gray-200 px-2 py-1.5"
          />
        </Field>
        <Field label={`Floor / ask €/kg${floorPref != null ? ` (seat: €${floorPref.toFixed(2)})` : " (optional)"}`}>
          <input
            type="number"
            step="0.01"
            min="0"
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder={floorPref != null ? floorPref.toFixed(2) : "on match"}
            className="w-full text-xs aq-mono border border-gray-200 px-2 py-1.5"
          />
        </Field>
      </div>
      <Field label="Note (free text, optional)">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. washed, ready to ship March"
          className="w-full text-xs border border-gray-200 px-2 py-1.5"
        />
      </Field>
      <button
        type="button"
        onClick={submit}
        className="w-full py-2 text-white text-xs font-medium transition-colors"
        style={{ backgroundColor: INTENT }}
      >
        Post intent — the steward speaks it to the swarm
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[10px] text-gray-400 block mb-0.5">{label}</span>
      {children}
    </label>
  );
}

// ── The posted draft: the swarm visibly works it ──

function DraftCard({ draft, seat, avgFob }: { draft: AqueductIntent; seat: SeatView; avgFob: number }) {
  const a = draft.authored;
  const filled = draft.status === "filled";
  // A finance-this-planting intent is a capital ask, not a shipment — the landed-cost
  // solver race answers the wrong question for it (a €/kg landed cost), so we branch it to
  // the Financing surface instead of running the race. The sell path is untouched.
  const isFinance = draft.intentType === "finance-this-planting";

  // REAL solver machinery: the same runSolverRace the tour and the page's own publish
  // button call, fed the user's entered floor (→ FOB) and quantity (→ weight). Every bid
  // is the deterministic landed-cost computation over the seat's real EUDR/quality
  // aggregate — not a bespoke invented number.
  const race = useMemo(() => {
    if (!a || isFinance) return null;
    const fob = a.floorEurPerKg ?? avgFob;
    return runSolverRace({ lot: buildAggregateLot(seat.lots), fobEurPerKg: fob, weightKg: a.quantityKg });
  }, [a, isFinance, seat.lots, avgFob]);

  const winner = race?.winner ?? null;

  return (
    <div className="border border-gray-200 bg-gray-50/50">
      {/* (a) ask-card line */}
      <div className="flex items-start gap-2 px-3 py-2 border-b border-gray-100">
        <div className="w-0.5 self-stretch flex-shrink-0" style={{ backgroundColor: INTENT }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <ProvenanceChip provenance="SIM" />
            <span className="text-[10px] aq-mono text-gray-400">{draft.id}</span>
            {filled && <span className="aq-status aq-status--ok">FILLED</span>}
          </div>
          <h4 className="text-xs font-semibold text-gray-900">{draft.title}</h4>
          <p className="text-[11px] text-gray-500">{draft.detail}</p>
          {a?.note && <p className="text-[11px] text-gray-400 italic mt-0.5">"{a.note}"</p>}
        </div>
      </div>

      {/* finance branch — a capital ask routes to the Financing surface, not the race */}
      {isFinance && (
        <div className="px-3 py-3 space-y-2">
          <p className="text-[11px] text-gray-600 leading-relaxed">
            This is a capital ask, not a shipment — no landed-cost race applies. The capital that could clear it forms
            on the financing side: institutional buyers, grants, and funds, matched against your lots by the same policy
            engine.
          </p>
          <div className="flex flex-col gap-1">
            <Link
              to="/financing"
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: INTENT }}
            >
              See who could fund it on Financing <ArrowRight size={11} />
            </Link>
            <Link
              to={`/financing#assurance-${seat.id}`}
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: INTENT }}
            >
              See this as an assurance round on Financing <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      )}

      {/* (b) solver responses — REAL running race */}
      {race && (
        <div className="px-3 py-2 space-y-1">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            Solver responses — genuine bids from the running race on your entered terms (
            {a?.quantityKg.toLocaleString()} kg @ €{(a?.floorEurPerKg ?? avgFob).toFixed(2)}/kg FOB). Every bid is the
            same deterministic landed-cost computation over this seat's real EUDR/quality aggregate; competition
            compresses the middle, not your floor.
          </p>
          {race.bids.map(
            (b: { handle: string; status: string; bid: { landedEurPerKg: number } | null; real?: boolean }) => (
              <div key={b.handle} className="flex items-center justify-between gap-2 bg-white px-2 py-1">
                <span className="text-[11px] aq-mono text-gray-700">{b.handle}</span>
                <span className="flex items-center gap-1.5">
                  {b.real && <ProvenanceChip provenance="LIVE" />}
                  {b.status === "DECLINED" ? (
                    <span className="aq-status aq-status--failed">DECLINED</span>
                  ) : (
                    <span
                      className={`text-[11px] aq-mono ${b.handle === winner?.handle ? "font-bold text-green-700" : "text-gray-600"}`}
                    >
                      €{b.bid?.landedEurPerKg.toFixed(3)}/kg landed
                    </span>
                  )}
                </span>
              </div>
            ),
          )}
        </div>
      )}

      {/* (c) accept fill (verb #3) — sell path only; a finance ask has no shipping fill */}
      {!isFinance && (
        <div className="px-3 py-2 border-t border-gray-100 space-y-2">
          {!filled
            ? winner && (
                <button
                  type="button"
                  onClick={() => acceptFill(draft.id)}
                  className="w-full py-1.5 text-[11px] font-medium border transition-colors"
                  style={{ borderColor: INTENT, color: INTENT }}
                >
                  Accept fill — €{winner.bid.landedEurPerKg.toFixed(3)}/kg landed via {winner.handle}
                </button>
              )
            : winner && (
                <div className="flex items-center gap-1.5 text-[11px] text-gray-700">
                  <CheckCircle size={13} className="text-green-700" weight="fill" />
                  Fill accepted — €{winner.bid.landedEurPerKg.toFixed(3)}/kg via {winner.handle}
                  <ProvenanceChip provenance="SIM" />
                </div>
              )}

          {/* (d) confirm settle (verb #4) — at the honest boundary: disabled, no key, no
            broadcast. Human-confirmed by default; delegable to the steward by designation
            (Pat, 2026-07-03 — agentic-only flows supported). */}
          <button
            type="button"
            disabled
            className="w-full py-1.5 text-[11px] font-medium bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
          >
            Confirm settle
          </button>
          <p className="text-[10px] text-gray-400 leading-relaxed">
            settle prepared — broadcast requires <span className="aq-mono">AQUEDUCT_SETTLE_PRIVATE_KEY</span>.
            Settlement is human-confirmed by default and delegable to the steward by designation — the producer chooses
            the autonomy level, not the platform.
          </p>
        </div>
      )}
    </div>
  );
}
