import { useContext } from "react";
import { BaseStateContext } from "./baseContext";

export function useBaseState() {
  const context = useContext(BaseStateContext);
  if (context === undefined) {
    throw new Error("useBaseState must be used within a BaseStateProvider");
  }
  return context.state;
}
