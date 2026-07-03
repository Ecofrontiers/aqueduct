// Aqueduct — SIM buyer/demand agent (DEMO-SPEC.md §3 item 6, DESIGN-BRIEF §6.1
// "buyer demand card"). Standing demand with legible criteria so the judge
// sees WHY a fill happened — never a bare match.

export const SIM_BUYER = {
  handle: "@sim-buyer-eu",
  label: "standing demand",
  criteria: [
    { key: "origin", label: "Origin", want: "Chiapas" },
    { key: "quality", label: "Quality", want: "SCA 84+" },
    { key: "eudr", label: "EUDR-readiness", want: "flagged" }, // flagged, not required — acceptance criterion 9
    { key: "landed", label: "Landed", want: "≤ 1.15x FOB landed" },
  ],
};

/**
 * Evaluate the buyer's criteria against the actual lot + winning bid. The
 * landed ceiling is derived from the lot's own FOB (buyer tolerates ~15%
 * markup to landed, the realistic Algrano-style spread for a specialty
 * micro-lot) rather than a fixed absolute figure — a fixed euro ceiling
 * copied from an illustrative example would silently fail (or trivially
 * pass) as soon as the live/snapshot FOB price moves. Each row gets a
 * binary mark (DESIGN-BRIEF §5.2 — never a percentage).
 */
export function evaluateBuyerMatch({ lot, winningBid }) {
  const scaScore = lot?.quality?.sca_score ?? null;
  const eudrPartial = lot?.eudr ? !(lot.eudr.plot_geo_present && lot.eudr.legality_evidence && lot.eudr.dds_ref) : true;
  const landed = winningBid?.landedEurPerKg ?? null;
  const fob = lot?.price?.amount ?? null;
  const landedCeiling = fob !== null ? Math.round(fob * 1.15 * 2) / 2 : null; // nearest €0.50

  const rows = [
    {
      key: "origin",
      label: "Origin",
      want: "Chiapas",
      got: lot?.origin?.region ?? "—",
      pass: (lot?.origin?.region ?? "").toLowerCase().includes("chiapas"),
    },
    {
      key: "quality",
      label: "Quality",
      want: "SCA 84+",
      got: scaScore !== null ? `SCA ${scaScore}` : "—",
      pass: scaScore !== null && scaScore >= 84,
    },
    {
      key: "eudr",
      label: "EUDR-readiness",
      want: "flagged (not required)",
      got: eudrPartial ? "PARTIAL — flagged" : "verified",
      pass: true, // flagged is an acceptable state per the buyer's own criteria (acceptance criterion 9)
      partial: eudrPartial,
    },
    {
      key: "landed",
      label: "Landed",
      want: landedCeiling !== null ? `≤ €${landedCeiling.toFixed(2)}/kg` : "≤ 1.15x FOB",
      got: landed !== null ? `€${landed.toFixed(2)}/kg` : "—",
      pass: landed !== null && landedCeiling !== null && landed <= landedCeiling,
    },
  ];

  const allPass = rows.every((r) => r.pass);
  return { buyer: SIM_BUYER, rows, matched: allPass, landedCeiling };
}
