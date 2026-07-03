/**
 * The map's account palette — one semantic color per account, used by the
 * network layer (arcs/rings), node glyphs, the legend, and the guide.
 *
 * Lives in its own module to break the AqueductNetworkLayer <-> AqueductNodeGlyph
 * import cycle: the glyph read ACCOUNT_COLORS from the layer at module-eval time
 * while the layer imported the glyph back, leaving the const in the temporal dead
 * zone on ~50% of cold Vite loads (full-reload race -> React reconciliation
 * errors on SPA navigation). Certification gate finding, 2026-07-03.
 */
export const ACCOUNT_COLORS = {
  goods: "#b45309",
  capitalExo: "#4f46e5",
  capitalEndo: "#059669",
  settle: "rgb(23, 127, 224)",
  venue: "#9333ea",
} as const;
