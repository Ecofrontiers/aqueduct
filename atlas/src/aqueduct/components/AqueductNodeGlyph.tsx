import { Bank, Buildings, Coffee, Cpu, SolarPanel, Storefront, Users } from "@phosphor-icons/react";
import type React from "react";
import { ACCOUNT_COLORS } from "./AqueductNetworkLayer";

/**
 * Typed node glyph — a Phosphor icon (regular weight) centered in a white
 * circular chip, the kind color carried by the icon + border. This is the
 * STABLE-IDENTITY channel of the map's two-channel marker grammar (design
 * brief §5 / research/09): icon + color say *what a node is* and never
 * change; the surrounding `NodeRing` (solid/dashed) says *what state it's in*
 * and does. White fill with a colored border is the host marker idiom — it
 * reads cleanly over map tiles at small sizes.
 *
 * Icon map (brief §5 table): lot=Coffee, coop=Users, solver=Cpu,
 * venue=Storefront, infrastructure=Bank, hub=Buildings, solar=SolarPanel.
 *
 * `solar` is a lot-KIND (a Glow solar farm — the map's second commodity
 * vertical), so it rides the SAME goods/sienna color as `lot`: there is no
 * amber/gold token in either existing palette (ACCOUNT_COLORS or
 * AQUEDUCT_SECTION_COLORS), and inventing a third palette just for solar was
 * ruled out. The distinct SolarPanel icon is what differentiates a farm from
 * a coffee lot — icon carries the identity, color keeps it in the Lots family.
 */
export type NodeKind = "lot" | "coop" | "solver" | "venue" | "infrastructure" | "hub" | "solar";

const KIND_ICON = {
  lot: Coffee,
  coop: Users,
  solver: Cpu,
  venue: Storefront,
  infrastructure: Bank,
  hub: Buildings,
  solar: SolarPanel,
} as const;

// Colors reuse ACCOUNT_COLORS so identity stays consistent with the arc field:
// lot/coop/solar ride the goods (sienna) account (solar is a lot-kind); hub is
// the exogenous-capital (indigo) demand side; solver/venue/infrastructure are
// the venue purple.
const KIND_COLOR: Record<NodeKind, string> = {
  lot: ACCOUNT_COLORS.goods,
  coop: ACCOUNT_COLORS.goods,
  solar: ACCOUNT_COLORS.goods,
  solver: ACCOUNT_COLORS.venue,
  venue: ACCOUNT_COLORS.venue,
  infrastructure: ACCOUNT_COLORS.venue,
  hub: ACCOUNT_COLORS.capitalExo,
};

export function AqueductNodeGlyph({
  kind,
  size = 22,
  title,
  dashed = false,
  opacity = 1,
  clickable = false,
  iconColor,
  style,
}: {
  kind: NodeKind;
  /** Chip diameter in px. Markers are anchor="center", so growing this keeps
   *  the node centered on its coordinate (no anchor drift). */
  size?: number;
  title?: string;
  /** Provisional / TO-BUILD treatment: dashed border, no drop shadow. */
  dashed?: boolean;
  opacity?: number;
  clickable?: boolean;
  /** Override the icon color (e.g. white on a filled chip). Defaults to the
   *  kind color. */
  iconColor?: string;
  /** Merged onto the chip — lets a call site preserve its own convention
   *  (e.g. the LotsLayer LIVE second-ring boxShadow). */
  style?: React.CSSProperties;
}): React.ReactElement {
  const Icon = KIND_ICON[kind];
  const color = KIND_COLOR[kind];
  return (
    <div
      title={title}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "#ffffff",
        border: `2px ${dashed ? "dashed" : "solid"} ${color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: dashed ? "none" : "0 1px 2px rgba(0,0,0,0.25)",
        opacity,
        cursor: clickable ? "pointer" : undefined,
        ...style,
      }}
    >
      <Icon size={Math.round(size * 0.56)} color={iconColor ?? color} weight="regular" />
    </div>
  );
}
