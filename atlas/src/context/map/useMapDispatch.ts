import { useContext } from "react";
import { MapStateContext } from "./mapContext";

export function useMapDispatch() {
  const context = useContext(MapStateContext);
  if (context === undefined) {
    throw new Error("useMapDispatch must be used within a MapStateProvider");
  }
  return context.dispatch;
}
