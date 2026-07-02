import { useContext } from "react";
import { NewFiltersStateContext } from "./filtersContext";

export function useNewFiltersState() {
  const context = useContext(NewFiltersStateContext);
  if (context === undefined) {
    throw new Error(
      "useNewFiltersState must be used within a FiltersStateProvider"
    );
  }
  return context.state;
}
