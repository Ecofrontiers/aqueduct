import { createContext, Dispatch, ReactNode, useReducer } from "react";

interface IState {
  mapStyle: "map" | "satellite" | "terrain";
  showPolitical: boolean;
}

type SetMapStyleAction = {
  type: "SET_MAP_STYLE";
  payload: "map" | "satellite" | "terrain";
};

type SetShowPoliticalAction = {
  type: "SET_SHOW_POLITICAL";
  payload: boolean;
};

type Action = SetMapStyleAction | SetShowPoliticalAction;

const initialState: IState = {
  mapStyle: "map",
  showPolitical: false,
};

const reducer = (state: IState, action: Action): IState => {
  switch (action.type) {
    case "SET_MAP_STYLE":
      return { ...state, mapStyle: action.payload };
    case "SET_SHOW_POLITICAL":
      return { ...state, showPolitical: action.payload };
    default:
      return state;
  }
};

const MapStateContext = createContext<{
  state: IState;
  dispatch: Dispatch<Action>;
}>({ state: initialState, dispatch: () => undefined });

const MapStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <MapStateContext.Provider value={{ state, dispatch }}>
      {children}
    </MapStateContext.Provider>
  );
};

export { MapStateProvider, MapStateContext };
