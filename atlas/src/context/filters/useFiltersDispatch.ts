import { useContext } from "react";
import { NewFiltersStateContext } from "./filtersContext";

export function useNewFiltersDispatch() {
  const context = useContext(NewFiltersStateContext);
  if (context === undefined) {
    throw new Error(
      "useFiltersDispatch must be used within a FiltersStateProvider"
    );
  }
  return context.dispatch;
}
