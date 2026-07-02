import { useContext } from "react";
import { MapStateContext } from "./mapContext";

export function useMapState() {
  const context = useContext(MapStateContext);
  if (context === undefined) {
    throw new Error("useMapState must be used within a MapStateProvider");
  }
  return context.state;
}
