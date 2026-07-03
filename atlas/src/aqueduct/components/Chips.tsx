import type React from "react";

export type Provenance = "LIVE" | "SNAPSHOT" | "SIM" | "TESTNET" | "TO-BUILD";

/** Provenance chip — Atlas badge idiom, one color family per provenance. */
const PROVENANCE_CLASS: Record<Provenance, string> = {
  LIVE: "aq-chip--live",
  SNAPSHOT: "aq-chip--snapshot",
  SIM: "aq-chip--sim",
  TESTNET: "aq-chip--testnet",
  "TO-BUILD": "aq-chip--to-build",
};

export function ProvenanceChip({
  provenance,
  dated,
}: {
  provenance: Provenance;
  dated?: string; // ISO date paired with SNAPSHOT (§4.8: always paired with the date)
}): React.ReactElement {
  const label = provenance === "SNAPSHOT" && dated ? `SNAPSHOT · ${dated.slice(0, 10)}` : provenance;
  return <span className={`aq-chip ${PROVENANCE_CLASS[provenance]}`}>{label}</span>;
}

export type Status = "OK" | "PARTIAL" | "FAILED" | "PENDING" | "BID" | "FILLED" | "SETTLED" | "DECLINED" | "UNDERCUT";

/** Status pill — one word, colored (DESIGN-BRIEF §5.1), independent axis from provenance. */
export function StatusPill({ status }: { status: Status }): React.ReactElement {
  const cls =
    status === "OK" || status === "SETTLED" || status === "FILLED"
      ? "aq-status--ok"
      : status === "FAILED" || status === "DECLINED"
        ? "aq-status--failed"
        : "aq-status--partial";
  return <span className={`aq-status ${cls}`}>{status}</span>;
}

/** join_confidence — labeled level, never a number (DESIGN-BRIEF §5.2). */
export function JoinConfidenceTag({ level }: { level: string }): React.ReactElement {
  const text =
    level === "name_place_match" ? "name+place match" : level === "deterministic" ? "deterministic" : "unmatched";
  return <span className="aq-join-confidence">{text}</span>;
}

/** Missing value — em-dash, never "N/A", never blank (DESIGN-BRIEF §0/§9.8). */
export function ValueOrDash({ value }: { value: string | number | null | undefined }): React.ReactElement {
  if (value === null || value === undefined || value === "") return <span className="aq-dim">—</span>;
  return <>{value}</>;
}
