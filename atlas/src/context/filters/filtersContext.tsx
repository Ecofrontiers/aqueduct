import React, { createContext, useReducer, ReactNode, Dispatch } from "react";
import { filterNewAssets } from "./filterAssets";
import { NewAssetTypeFilters, NewFilters } from "../../modules/filters";
import { analytics } from "../../modules/analytics";
import { Asset } from "../../modules/assets";
import { Org, Action } from "../../shared/types";

export type EntityType = "all" | "asset" | "actor" | "action";
export type EntityTypeKey = "asset" | "actor" | "action";
export type ActorTypeKey = "orgs" | "agents";
// Legacy type for backwards compatibility
export type ActorSubfilter = "orgs" | "agents" | "both";

const ALL_ENTITY_TYPES: EntityTypeKey[] = ["asset", "actor", "action"];

interface NewState {
  filters: NewFilters;
  filteredAssets: Asset[];
  allAssets: Asset[];
  selectedAssetId: string;
  entityType: EntityType;
  activeEntityTypes: Set<EntityTypeKey>;
  activeActorTypes: Set<ActorTypeKey>;
  actorSubfilter: ActorSubfilter; // Legacy, use activeActorTypes instead
  allOrgs: Org[];
  allActions: Action[];
}

type ResetFiltersAction = { type: "RESET_FILTERS" };

type NewSetTypeFilterAction = {
  type: "SET_TYPE_FILTER";
  payload: NewAssetTypeFilters;
};

type NewRemoveTypeFilterAction = {
  type: "REMOVE_TYPE_FILTER";
  payload: number;
};

type ResetTypeFiltersAction = {
  type: "RESET_TYPE_FILTERS";
};

type ResetProviderFilterAction = {
  type: "RESET_PROVIDER_FILTER";
};

type NewSetSubtypeFilterAction = {
  type: "SET_SUBTYPE_FILTER";
  payload: {
    typeId: number;
    subtypeId: number;
  };
};

type NewRemoveSubtypeFilterAction = {
  type: "REMOVE_SUBTYPE_FILTER";
  payload: {
    typeId: number;
    subtypeId: number;
  };
};

type NewSetProviderFilter = {
  type: "SET_PROVIDER_FILTER";
  payload: number;
};

type RemoveProviderFilter = {
  type: "REMOVE_PROVIDER_FILTER";
};

type SetPlatformFilter = {
  type: "SET_PLATFORM_FILTER";
  payload: string;
};

type RemovePlatformFilter = {
  type: "REMOVE_PLATFORM_FILTER";
};

type ResetPlatformFilter = {
  type: "RESET_PLATFORM_FILTER";
};

type SetFlagFilter = {
  type: "SET_FLAG_FILTER";
  payload: {
    flag: "prefinancing" | "pretoken" | "yield_bearing";
    value: boolean | null;
  };
};

type RemoveFlagFilter = {
  type: "REMOVE_FLAG_FILTER";
  payload: "prefinancing" | "pretoken" | "yield_bearing";
};

type ResetFlagsFilter = {
  type: "RESET_FLAGS_FILTER";
};

type SetSelectedAssetAction = {
  type: "SET_SELECTED_ASSET";
  payload: string;
};

type SetAllAssetsAction = { type: "SET_ALL_ASSETS"; payload: Asset[] };

type SetEntityTypeAction = { type: "SET_ENTITY_TYPE"; payload: EntityType };
type ToggleEntityTypeAction = { type: "TOGGLE_ENTITY_TYPE"; payload: EntityTypeKey };
type ToggleActorTypeAction = { type: "TOGGLE_ACTOR_TYPE"; payload: ActorTypeKey };
type SetActorSubfilterAction = { type: "SET_ACTOR_SUBFILTER"; payload: ActorSubfilter };
type SetAllOrgsAction = { type: "SET_ALL_ORGS"; payload: Org[] };
type SetAllActionsAction = { type: "SET_ALL_ACTIONS"; payload: Action[] };

type NewAction =
  | ResetFiltersAction
  | NewSetTypeFilterAction
  | NewRemoveTypeFilterAction
  | NewSetSubtypeFilterAction
  | NewRemoveSubtypeFilterAction
  | NewSetProviderFilter
  | RemoveProviderFilter
  | SetSelectedAssetAction
  | SetAllAssetsAction
  | ResetTypeFiltersAction
  | ResetProviderFilterAction
  | SetPlatformFilter
  | RemovePlatformFilter
  | ResetPlatformFilter
  | SetFlagFilter
  | RemoveFlagFilter
  | ResetFlagsFilter
  | SetEntityTypeAction
  | ToggleEntityTypeAction
  | ToggleActorTypeAction
  | SetActorSubfilterAction
  | SetAllOrgsAction
  | SetAllActionsAction;

const newInitialState: NewState = {
  filters: {
    assetTypes: {},
    providers: [],
    platforms: [],
    flags: {
      prefinancing: null,
      pretoken: null,
      yield_bearing: null,
    },
  },
  filteredAssets: [],
  allAssets: [],
  selectedAssetId: "",
  entityType: "all" as EntityType,
  activeEntityTypes: new Set<EntityTypeKey>(ALL_ENTITY_TYPES),
  activeActorTypes: new Set<ActorTypeKey>(["orgs", "agents"]),
  actorSubfilter: "both" as ActorSubfilter,
  allOrgs: [],
  allActions: [],
};

const newReducer = (state: NewState, action: NewAction): NewState => {
  switch (action.type) {
    case "SET_ALL_ASSETS": {
      return {
        ...state,
        filteredAssets: action.payload,
        allAssets: action.payload,
      };
    }
    case "RESET_FILTERS": {
      return {
        ...state,
        filters: newInitialState.filters,
        selectedAssetId: "",
      };
    }

    case "SET_TYPE_FILTER": {
      analytics.sendFiltersEvent({
        action: "Type Filter",
        label: action.payload.name,
        value: action.payload.id,
      });
      const filters = {
        ...state.filters,
        assetTypes: {
          ...state.filters.assetTypes,
          [action.payload.id]: action.payload,
        },
      };
      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }
    case "REMOVE_TYPE_FILTER": {
      const updatedAssetTypes = { ...state.filters.assetTypes };
      delete updatedAssetTypes[action.payload];

      const filters = {
        ...state.filters,
        assetTypes: updatedAssetTypes,
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "SET_SUBTYPE_FILTER": {
      analytics.sendFiltersEvent({
        action: "Subtype Filter",
        label: `${action.payload.subtypeId}`,
        value: action.payload.subtypeId,
      });

      const filters = {
        ...state.filters,
        assetTypes: {
          ...state.filters.assetTypes,
          [action.payload.typeId]: {
            ...state.filters.assetTypes[action.payload.typeId],
            subtypes: [
              ...(state.filters.assetTypes[action.payload.typeId]?.subtypes ||
                []),
              action.payload.subtypeId,
            ],
          },
        },
      };
      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "REMOVE_SUBTYPE_FILTER": {
      const updatedSubtypes = state.filters.assetTypes[
        action.payload.typeId
      ]?.subtypes.filter((subtype) => subtype !== action.payload.subtypeId);

      const filters = {
        ...state.filters,
        assetTypes: {
          ...state.filters.assetTypes,
          [action.payload.typeId]: {
            ...state.filters.assetTypes[action.payload.typeId],
            subtypes: updatedSubtypes,
          },
        },
      };

      if (!updatedSubtypes?.length) {
        delete filters.assetTypes[action.payload.typeId];
      }

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "SET_PROVIDER_FILTER": {
      analytics.sendFiltersEvent({
        action: "Issuer Filter",
        label: `${action.payload}`,
        value: action.payload,
      });

      const already = state.filters.providers.includes(action.payload);
      const filters = {
        ...state.filters,
        providers: already
          ? state.filters.providers.filter((id) => id !== action.payload)
          : [...state.filters.providers, action.payload],
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "REMOVE_PROVIDER_FILTER": {
      const filters = {
        ...state.filters,
        providers: [],
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "SET_SELECTED_ASSET": {
      // Clear selection
      if (!action.payload) {
        return { ...state, selectedAssetId: "" };
      }

      const filteredAssets = [...state.filteredAssets];
      const selectedAssetIndex = filteredAssets.findIndex(
        (asset) => asset.id === action.payload
      );

      if (selectedAssetIndex === -1) {
        return { ...state, selectedAssetId: action.payload };
      }

      if (selectedAssetIndex > 0) {
        const selectedAsset = filteredAssets[selectedAssetIndex];
        filteredAssets.splice(selectedAssetIndex, 1);
        filteredAssets.unshift(selectedAsset);
      }

      return { ...state, selectedAssetId: action.payload, filteredAssets };
    }

    case "RESET_TYPE_FILTERS": {
      const filters = {
        ...state.filters,
        assetTypes: {},
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "RESET_PROVIDER_FILTER": {
      const filters = {
        ...state.filters,
        providers: [],
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "SET_PLATFORM_FILTER": {
      analytics.sendFiltersEvent({
        action: "Chain Filter",
        label: action.payload,
      });

      const already = state.filters.platforms.includes(action.payload);
      const filters = {
        ...state.filters,
        platforms: already
          ? state.filters.platforms.filter((id) => id !== action.payload)
          : [...state.filters.platforms, action.payload],
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "REMOVE_PLATFORM_FILTER": {
      const filters = {
        ...state.filters,
        platforms: [],
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "RESET_PLATFORM_FILTER": {
      const filters = {
        ...state.filters,
        platforms: [],
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "SET_FLAG_FILTER": {
      analytics.sendFiltersEvent({
        action: "Flag Filter",
        label: action.payload.flag,
        value: action.payload.value === null ? 0 : action.payload.value ? 1 : 0,
      });

      const filters = {
        ...state.filters,
        flags: {
          ...state.filters.flags,
          [action.payload.flag]: action.payload.value,
        },
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "REMOVE_FLAG_FILTER": {
      const filters = {
        ...state.filters,
        flags: {
          ...state.filters.flags,
          [action.payload]: null,
        },
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "RESET_FLAGS_FILTER": {
      const filters = {
        ...state.filters,
        flags: {
          prefinancing: null,
          pretoken: null,
          yield_bearing: null,
        },
      };

      return {
        ...state,
        filters,
        filteredAssets: filterNewAssets(state.allAssets, filters),
      };
    }

    case "SET_ENTITY_TYPE": {
      let activeEntityTypes: Set<EntityTypeKey>;
      if (action.payload === "all") {
        activeEntityTypes = new Set<EntityTypeKey>(ALL_ENTITY_TYPES);
      } else {
        activeEntityTypes = new Set<EntityTypeKey>([action.payload as EntityTypeKey]);
      }
      return { ...state, entityType: action.payload, activeEntityTypes };
    }

    case "TOGGLE_ENTITY_TYPE": {
      const next = new Set(state.activeEntityTypes);
      let nextActorTypes = state.activeActorTypes;

      if (next.has(action.payload)) {
        // Prevent empty set — at least one must stay on
        if (next.size > 1) next.delete(action.payload);
      } else {
        next.add(action.payload);
        // When turning Actors back on, enable both Orgs and Agents
        if (action.payload === "actor" && state.activeActorTypes.size === 0) {
          nextActorTypes = new Set<ActorTypeKey>(["orgs", "agents"]);
        }
      }

      // Sync legacy entityType field
      const entityType: EntityType = next.size === ALL_ENTITY_TYPES.length
        ? "all"
        : next.size === 1
          ? ([...next][0] as EntityType)
          : "all";
      return { ...state, activeEntityTypes: next, activeActorTypes: nextActorTypes, entityType };
    }

    case "SET_ALL_ORGS": {
      return { ...state, allOrgs: action.payload };
    }

    case "SET_ALL_ACTIONS": {
      return { ...state, allActions: action.payload };
    }

    case "SET_ACTOR_SUBFILTER": {
      return { ...state, actorSubfilter: action.payload };
    }

    case "TOGGLE_ACTOR_TYPE": {
      const next = new Set(state.activeActorTypes);
      if (next.has(action.payload)) {
        next.delete(action.payload);
      } else {
        next.add(action.payload);
      }

      // If both actor types are off, also turn off the Actors entity toggle
      const nextEntityTypes = new Set(state.activeEntityTypes);
      if (next.size === 0) {
        nextEntityTypes.delete("actor");
      } else if (!nextEntityTypes.has("actor")) {
        // If turning on an actor type while Actors is off, turn Actors back on
        nextEntityTypes.add("actor");
      }

      // Sync legacy actorSubfilter for backwards compatibility
      const actorSubfilter = next.has("orgs") && next.has("agents") ? "both" :
                             next.has("orgs") ? "orgs" :
                             next.has("agents") ? "agents" : "both";
      return { ...state, activeActorTypes: next, activeEntityTypes: nextEntityTypes, actorSubfilter };
    }

    default:
      throw new Error("Unknown action type");
  }
};

// Create new context
const NewFiltersStateContext = createContext<{
  state: NewState;
  dispatch: Dispatch<NewAction>;
}>({ state: newInitialState, dispatch: () => undefined });

// Create a new provider component
const NewFiltersStateProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(newReducer, newInitialState);

  return (
    <NewFiltersStateContext.Provider value={{ state, dispatch }}>
      {children}
    </NewFiltersStateContext.Provider>
  );
};

export { NewFiltersStateProvider, NewFiltersStateContext };
