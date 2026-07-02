import { useContext } from "react";
import { BaseStateContext } from "./baseContext";

export function useBaseDispatch() {
  const context = useContext(BaseStateContext);
  if (context === undefined) {
    throw new Error("useBaseDispatch must be used within a BaseStateProvider");
  }
  return context.dispatch;
}
