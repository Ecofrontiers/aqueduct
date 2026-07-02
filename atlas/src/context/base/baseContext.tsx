import { createContext, Dispatch, ReactNode, useReducer } from "react";
import { AssetTypeWithSubtypes } from "../../shared/types";
import { Issuer } from "../../modules/assets";

interface IState {
  types: AssetTypeWithSubtypes[];
  issuers: Issuer[];
  platforms: { id: string; name: string }[];
}

type SetPlatformsAction = {
  type: "SET_PLATFORMS";
  payload: any[];
};

type SetTypesAction = {
  type: "SET_TYPES";
  payload: any[];
};

type SetIssuersAction = {
  type: "SET_ISSUERS";
  payload: any[];
};

type Action = SetTypesAction | SetIssuersAction | SetPlatformsAction;

const initialState: IState = {
  types: [],
  issuers: [],
  platforms: [],
};

const reducer = (state: IState, action: Action): IState => {
  switch (action.type) {
    case "SET_PLATFORMS": {
      return { ...state, platforms: action.payload };
    }
    case "SET_TYPES": {
      return { ...state, types: action.payload };
    }
    case "SET_ISSUERS": {
      return { ...state, issuers: action.payload };
    }

    default:
      return state;
  }
};

const BaseStateContext = createContext<{
  state: IState;
  dispatch: Dispatch<Action>;
}>({ state: initialState, dispatch: () => undefined });

const BaseStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <BaseStateContext.Provider value={{ state, dispatch }}>
      {children}
    </BaseStateContext.Provider>
  );
};

export { BaseStateProvider, BaseStateContext };
