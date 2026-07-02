import { IAssetProvider } from ".";

export const PROVIDER_LIST: Array<IAssetProvider> = [
  {
    id: "agroforest_dao",
    name: "AgroforestDAO",
  },
  {
    id: "carbon_path",
    name: "CarbonPath",
  },
  {
    id: "ethic_hub",
    name: "EthicHub",
  },
  {
    id: "glow",
    name: "Glow",
  },
  {
    id: "helios",
    name: "Helios",
  },
  {
    id: "keenest",
    name: "Keenest",
  },
  {
    id: "landx",
    name: "LandX",
  },
  {
    id: "moss",
    name: "Moss",
  },
  {
    id: "nat5",
    name: "Nat5",
  },
  {
    id: "open_vino",
    name: "OpenVino",
  },
  {
    id: "plastiks",
    name: "Plastiks",
  },
  {
    id: "regen_network",
    name: "Regen Network",
  },
  {
    id: "solidworld",
    name: "Solidworld",
  },
  {
    id: "toucan",
    name: "Toucan",
  },
];

export const PROVIDER_MAP: Record<string, IAssetProvider> =
  PROVIDER_LIST.reduce(
    (acc, provider) => {
      acc[provider.id] = provider;
      return acc;
    },
    {} as Record<string, IAssetProvider>
  );
